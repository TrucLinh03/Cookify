import React, { useState, useRef, useEffect } from 'react';
import { getRagChatBotResponse, getRandomWelcomeMessage, getRagApiStatus } from './ragChatBotResponses';
import { saveChatHistory, loadChatHistory, saveConversationId, loadConversationId, hasUserChanged, clearAllChatData } from '../../utils/chatHistory';
import chefHatIcon from '../../assets/chef-hat.svg';
import ClockIcon from '../../assets/clock.svg';
import UsersIcon from '../../assets/users-three.svg';
import LightbulbIcon from '../../assets/lightbulb-filament.svg';
import MagnifyingGlassIcon from '../../assets/magnifying-glass.svg';
import ChatDotsIcon from '../../assets/chat-circle-dots.svg';
import SpinnerBallIcon from '../../assets/spinner-ball.svg';

const ChatWindow = ({ onClose }) => {
  // Initialize messages from localStorage or default welcome message
  const getInitialMessages = () => {
    const savedMessages = loadChatHistory();
    if (savedMessages && Array.isArray(savedMessages) && savedMessages.length > 0) {
      return savedMessages;
    }
    return [
      {
        id: 1,
        type: 'bot',
        content: getRandomWelcomeMessage(),
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        source: 'welcome'
      }
    ];
  };

  const [messages, setMessages] = useState(getInitialMessages());
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [conversationId, setConversationId] = useState(() => loadConversationId());
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [offlineQueue, setOfflineQueue] = useState([]);
  const [ragStatus, setRagStatus] = useState({ healthy: false, checking: true });
  const [isSending, setIsSending] = useState(false); // Prevent multiple sends
  
  // Resize states
  const getInitialSize = () => {
    if (typeof window !== 'undefined') {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      if (vw <= 640) {
        return {
          width: Math.max(300, Math.min(vw - 16, 420)),
          height: Math.max(420, Math.min(Math.floor(vh * 0.75), 720))
        };
      }
    }
    return { width: 384, height: 500 };
  };

  const [size, setSize] = useState(getInitialSize()); // Responsive defaults
  const [isResizing, setIsResizing] = useState(false);
  
  // Drag states - Initialize with null to use CSS positioning initially
  const [position, setPosition] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  const messagesEndRef = useRef(null);
  const chatWindowRef = useRef(null);

  const quickSuggestions = [
    { icon: ClockIcon, text: 'Món nhanh 30 phút' },
    { icon: UsersIcon, text: 'Món cho gia đình' },
    { icon: chefHatIcon, text: 'Món Việt truyền thống' },
    { icon: LightbulbIcon, text: 'Món mới lạ' }
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Update size on viewport resize (mobile responsive)
  useEffect(() => {
    const onResize = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      if (vw <= 640) {
        setSize({ width: Math.max(300, Math.min(vw - 16, 420)), height: Math.max(420, Math.min(Math.floor(vh * 0.75), 720)) });
        // On mobile, let parent (ChatBot) control the fixed position to avoid off-screen
        setPosition(null);
      } else {
        setSize(prev => ({ width: Math.max(prev.width, 384), height: Math.max(prev.height, 500) }));
      }
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Check RAG API status on component mount
  useEffect(() => {
    const checkRagStatus = async () => {
      try {
        const status = await getRagApiStatus();
        setRagStatus({ ...status, checking: false });
      } catch (error) {
        setRagStatus({ healthy: false, checking: false, error: error.message });
      }
    };
    
    checkRagStatus();
  }, []);

  // Save messages to localStorage whenever messages change
  useEffect(() => {
    if (messages.length > 0) {
      saveChatHistory(messages);
    }
  }, [messages]);

  // Save conversation ID to localStorage whenever it changes
  useEffect(() => {
    if (conversationId) {
      saveConversationId(conversationId);
    }
  }, [conversationId]);

  // Offline/Online detection
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Process offline queue when back online
      if (offlineQueue.length > 0) {
        offlineQueue.forEach(message => {
          handleSendMessage(message);
        });
        setOfflineQueue([]);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [offlineQueue]);

  const handleSendMessage = async (message = inputMessage) => {
    if (!message.trim()) return;
    
    // Prevent sending if already processing a request
    if (isSending) {
      return;
    }

    // Handle offline mode
    if (!isOnline) {
      setOfflineQueue(prev => [...prev, message]);
      const offlineMessage = {
        id: Date.now() + 1,
        type: 'bot',
        content: '📡 Bạn đang offline. Tin nhắn sẽ được gửi khi có kết nối mạng.',
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        source: 'offline',
        showSuggestions: false
      };
      setMessages(prev => [...prev, {
        id: Date.now(),
        type: 'user',
        content: message,
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
      }, offlineMessage]);
      setInputMessage('');
      return;
    }

    setIsSending(true);
    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: message,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsTyping(true);

    // Get RAG-powered bot response
    setTimeout(async () => {
      try {
        const response = await getRagChatBotResponse(message, conversationId);
        
        // Update conversation ID from response
        if (response.conversationId && !conversationId) {
          setConversationId(response.conversationId);
        }
        
        const botResponse = {
          id: Date.now() + 1,
          type: 'bot',
          content: response.text,
          timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
          suggestions: response.suggestions || [],
          source: response.source,
          score: response.score,
          ragResponse: response.ragResponse,
          confidence: response.confidence, // Add confidence info
          sourceBreakdown: response.sourceBreakdown, // Add source breakdown
          answerSourceType: response.answerSourceType || null,
          showSuggestions: response.showSuggestions // Add showSuggestions flag
        };
        setMessages(prev => [...prev, botResponse]);
        setIsTyping(false);
        setIsSending(false); // Reset sending state
      } catch (error) {
        console.error('Error getting bot response:', error);
        const errorResponse = {
          id: Date.now() + 1,
          type: 'bot',
          content: 'Xin lỗi, tôi gặp sự cố khi xử lý câu hỏi của bạn. Vui lòng thử lại! 😅',
          timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
          suggestions: [],
          source: 'error',
          showSuggestions: false
        };
        setMessages(prev => [...prev, errorResponse]);
        setIsTyping(false);
        setIsSending(false); // Reset sending state on error
      }
    }, 1500);
  };

  // Helper function to get status indicator
  const getStatusIndicator = () => {
    if (!isOnline) {
      return { text: 'Offline - Không có mạng', color: 'text-red-600', icon: ChatDotsIcon };
    }
    if (ragStatus.checking) {
      return { text: 'Đang kiểm tra...', color: 'text-peachDark', icon: MagnifyingGlassIcon };
    }
    if (ragStatus.healthy) {
      return { text: 'RAG AI Sẵn sàng', color: 'text-peachDark', icon: chefHatIcon };
    }
    return { text: 'Chế độ cơ bản', color: 'text-peachDark', icon: LightbulbIcon };
  };

  const handleSuggestionClick = (suggestion) => {
    handleSendMessage(suggestion.text);
  };

  // Clear chat history (for testing)
  const clearChatHistory = () => {
    setMessages([{
      id: 1,
      type: 'bot',
      content: getRandomWelcomeMessage(),
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      source: 'welcome'
    }]);
    setConversationId(null);
    // Use SecureStorage utility to clear chat data
    clearAllChatData();
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Drag handlers for moving the window
  const handleDragStart = (e) => {
    // Prevent event from bubbling up and closing the chat
    e.preventDefault();
    e.stopPropagation();
    
    setIsDragging(true);
    const rect = chatWindowRef.current.getBoundingClientRect();
    setDragStart({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  const handleDragMove = (e) => {
    if (isDragging) {
      // Get current position from the element if position state is null
      if (position === null) {
        const rect = chatWindowRef.current.getBoundingClientRect();
        setPosition({ x: rect.left, y: rect.top });
        return;
      }
      
      const newX = e.clientX - dragStart.x;
      const newY = e.clientY - dragStart.y;
      
      // Keep window within viewport bounds
      const maxX = window.innerWidth - size.width;
      const maxY = window.innerHeight - size.height;
      
      setPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY))
      });
    }
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  // Add drag event listeners
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleDragMove);
      document.addEventListener('mouseup', handleDragEnd);
      return () => {
        document.removeEventListener('mousemove', handleDragMove);
        document.removeEventListener('mouseup', handleDragEnd);
      };
    }
  }, [isDragging, dragStart, size]);

  // Resize handlers
  const handleResizeStart = (e, direction) => {
    e.preventDefault();
    setIsResizing(true);
    
    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = size.width;
    const startHeight = size.height;

    const handleMouseMove = (moveEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;
      
      let newWidth = startWidth;
      let newHeight = startHeight;

      // Handle horizontal resize
      if (direction === 'right' || direction === 'top-right' || direction === 'bottom-right') {
        newWidth = Math.max(320, Math.min(800, startWidth + deltaX));
      }
      if (direction === 'left' || direction === 'top-left' || direction === 'bottom-left') {
        newWidth = Math.max(320, Math.min(800, startWidth - deltaX));
      }
      
      // Handle vertical resize
      if (direction === 'bottom' || direction === 'bottom-left' || direction === 'bottom-right') {
        newHeight = Math.max(400, Math.min(800, startHeight + deltaY));
      }
      if (direction === 'top' || direction === 'top-left' || direction === 'top-right') {
        newHeight = Math.max(400, Math.min(800, startHeight - deltaY));
      }

      setSize({ width: newWidth, height: newHeight });
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <div 
      ref={chatWindowRef}
      className={`bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-200 relative transition-shadow duration-200 ${
        isDragging ? 'cursor-grabbing shadow-3xl' : 'shadow-2xl'
      }`}
      style={{ 
        width: (typeof window !== 'undefined' && window.innerWidth <= 640) ? 'calc(100vw - 16px)' : `${size.width}px`, 
        height: (typeof window !== 'undefined' && window.innerWidth <= 640) ? 'min(75vh, 720px)' : `${size.height}px`,
        boxSizing: 'border-box',
        ...(position && {
          position: 'fixed',
          left: `${position.x}px`,
          top: `${position.y}px`,
          transform: 'none'
        }),
        userSelect: (isResizing || isDragging) ? 'none' : 'auto',
        zIndex: isDragging ? 60 : 50
      }}
    >
      {/* Header - Draggable */}
      <div 
        className={`bg-peachLight p-4 flex items-center justify-between border-b border-peach ${
          isDragging ? 'cursor-grabbing' : 'cursor-grab'
        }`}
        onMouseDown={handleDragStart}
        title="Kéo để di chuyển cửa sổ chat"
      >
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
            <img
              src={chefHatIcon}
              alt="Chef Hat"
              className="w-7 h-7 filter-orange"
              style={{ filter: 'invert(48%) sepia(99%) saturate(2476%) hue-rotate(11deg) brightness(118%) contrast(119%)' }}
            />
          </div>
          <div>
            <h3 className="text-orange-600 font-semibold flex items-center">
              Chef AI Assistant
              <svg className="w-4 h-4 ml-2 text-peachDark opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
              </svg>
            </h3>
            <p className={`text-xs ${getStatusIndicator().color} flex items-center`}>
              <img src={getStatusIndicator().icon} alt="status" className="w-3.5 h-3.5 mr-1 opacity-90" />
              {getStatusIndicator().text}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {/* Clear cache button for debugging */}
          <button
            onClick={clearChatHistory}
            className="text-peachDark hover:text-red-600 transition-colors p-1 rounded hover:bg-red-50"
            title="Clear cache & restart chat"
          >
            <img 
              src={SpinnerBallIcon} 
              alt="Clear cache" 
              className="w-4 h-4 opacity-70 hover:opacity-100 transition-opacity"
            />
          </button>
          <button
            onClick={onClose}
            className="text-peachDark hover:text-peachDark transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Quick Suggestions */}
      <div className="p-3 bg-gray-50 border-b">
        <p className="text-xs text-gray-600 mb-2">Gợi ý nhanh:</p>
        <div className="grid grid-cols-2 gap-2">
          {quickSuggestions.map((suggestion, index) => (
            <button
              key={index}
              onClick={() => handleSuggestionClick(suggestion)}
              className="flex items-center space-x-1 bg-white hover:bg-peachLight border border-gray-200 
                         hover:border-peach rounded-lg p-2 text-xs transition-colors"
            >
              <img src={suggestion.icon} alt="suggestion" className="w-4 h-4 mr-1 opacity-80" />
              <span className="text-gray-700 truncate">{suggestion.text}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.map((message) => (
          <div key={message.id}>
            <div
              className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-3 py-2 ${
                  message.type === 'user'
                    ? 'bg-tomato text-white rounded-br-md'
                    : 'bg-gray-100 text-gray-800 rounded-bl-md'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                
                {/* Source breakdown for bot messages - only show if available
                {message.type === 'bot' && message.sourceBreakdown && message.sourceBreakdown.total > 0 && (
                  <div className="mt-2 pt-2 border-t border-gray-200">
                    <p className="text-xs text-gray-600 mb-1">Nguồn tham khảo:</p>
                    <div className="flex flex-wrap gap-1">
                      {(!message.answerSourceType || message.answerSourceType === 'recipe') && message.sourceBreakdown.byType.recipe > 0 && (
                        <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full border border-green-200">
                          🍳 {message.sourceBreakdown.byType.recipe} công thức
                        </span>
                      )}
                      {(!message.answerSourceType || message.answerSourceType === 'blog') && message.sourceBreakdown.byType.blog > 0 && (
                        <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-200">
                          📝 {message.sourceBreakdown.byType.blog} bài viết
                        </span>
                      )}
                      {(!message.answerSourceType || message.answerSourceType === 'feedback') && message.sourceBreakdown.byType.feedback > 0 && (
                        <span className="text-xs bg-yellow-50 text-yellow-700 px-2 py-0.5 rounded-full border border-yellow-200">
                          ⭐ {message.sourceBreakdown.byType.feedback} đánh giá
                        </span>
                      )}
                    </div>
                  </div>
                )} */}
                
                <div className={`flex items-center justify-between mt-1 ${
                  message.type === 'user' ? 'text-peachLight' : 'text-gray-500'
                }`}>
                  <p className="text-xs">{message.timestamp}</p>
                  {message.type === 'bot' && message.confidence && (
                    <div className="flex items-center space-x-1">
                      <span 
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          message.confidence.level === 'high' 
                            ? 'bg-green-100 text-green-700' 
                            : message.confidence.level === 'medium'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                        title={message.confidence.description}
                      >
                        {/* {message.confidence.percentage}% tin cậy */}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Hiển thị suggestions nếu có và được phép hiển thị */}
            {message.type === 'bot' && 
             message.showSuggestions === true && 
             message.suggestions && 
             Array.isArray(message.suggestions) &&
             message.suggestions.length > 0 && 
             message.source !== 'fallback_non_food' &&
             message.source !== 'error' &&
             !message.content?.includes('Xin lỗi, mình chỉ có thể tư vấn về nấu ăn') &&
             !message.content?.includes('không liên quan đến nấu ăn') &&
             message.confidence?.level !== 'low' && (
              <div className="flex justify-start mt-2">
                <div className="flex flex-wrap gap-1 max-w-[80%]">
                  {message.suggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => handleSuggestionClick({ text: suggestion })}
                      className="bg-blue-100 hover:bg-blue-200 text-blue-700 text-xs px-2 py-1 rounded-full
                                 border border-blue-200 transition-colors"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
        
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-2xl rounded-bl-md px-3 py-2">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t bg-white">
        <div className="flex items-center space-x-2">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Bạn muốn nấu món gì hôm nay?..."
            disabled={isSending}
            className="flex-1 border border-gray-300 rounded-full px-4 py-2 text-sm 
                       focus:outline-none focus:border-peach focus:ring-1 focus:ring-peach
                       disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
          <button
            onClick={() => handleSendMessage()}
            disabled={!inputMessage.trim() || isSending}
            className="bg-tomato hover:bg-red-600 disabled:bg-gray-300 
                       text-white rounded-full p-2 transition-colors disabled:cursor-not-allowed"
            title={isSending ? 'Đang xử lý...' : 'Gửi tin nhắn'}
          >
            <svg className="w-4 h-4 transform rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-1 text-center">
          Nhấn Enter để gửi tin nhắn
        </p>
      </div>

      {/* Resize Handles */}
      {/* Top */}
      <div
        className="absolute top-0 left-0 right-0 h-1 cursor-ns-resize hover:bg-peach transition-colors"
        onMouseDown={(e) => handleResizeStart(e, 'top')}
      />
      
      {/* Right */}
      <div
        className="absolute top-0 right-0 bottom-0 w-1 cursor-ew-resize hover:bg-peach transition-colors"
        onMouseDown={(e) => handleResizeStart(e, 'right')}
      />
      
      {/* Bottom */}
      <div
        className="absolute bottom-0 left-0 right-0 h-1 cursor-ns-resize hover:bg-peach transition-colors"
        onMouseDown={(e) => handleResizeStart(e, 'bottom')}
      />
      
      {/* Left */}
      <div
        className="absolute top-0 left-0 bottom-0 w-1 cursor-ew-resize hover:bg-peach transition-colors"
        onMouseDown={(e) => handleResizeStart(e, 'left')}
      />
      
      {/* Top-Left Corner */}
      <div
        className="absolute top-0 left-0 w-3 h-3 cursor-nwse-resize hover:bg-peachDark rounded-tl-2xl"
        onMouseDown={(e) => handleResizeStart(e, 'top-left')}
      />
      
      {/* Top-Right Corner */}
      <div
        className="absolute top-0 right-0 w-3 h-3 cursor-nesw-resize hover:bg-peachDark rounded-tr-2xl"
        onMouseDown={(e) => handleResizeStart(e, 'top-right')}
      />
      
      {/* Bottom-Right Corner */}
      <div
        className="absolute bottom-0 right-0 w-3 h-3 cursor-nwse-resize hover:bg-peachDark rounded-br-2xl"
        onMouseDown={(e) => handleResizeStart(e, 'bottom-right')}
      />
      
      {/* Bottom-Left Corner */}
      <div
        className="absolute bottom-0 left-0 w-3 h-3 cursor-nesw-resize hover:bg-peachDark rounded-bl-2xl"
        onMouseDown={(e) => handleResizeStart(e, 'bottom-left')}
      />
    </div>
  );
};

export default ChatWindow;
