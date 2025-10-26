import React, { useState, useRef, useEffect } from 'react';
import { getRagChatBotResponse, getRandomWelcomeMessage, getRagApiStatus } from './ragChatBotResponses';
import chefHatIcon from '../../assets/chef-hat.svg';
import ClockIcon from '../../assets/clock.svg';
import UsersIcon from '../../assets/users-three.svg';
import LightbulbIcon from '../../assets/lightbulb-filament.svg';
import MagnifyingGlassIcon from '../../assets/magnifying-glass.svg';
import ChatDotsIcon from '../../assets/chat-circle-dots.svg';

const ChatWindow = ({ onClose }) => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'bot',
      content: getRandomWelcomeMessage(),
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      source: 'welcome'
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [ragStatus, setRagStatus] = useState({ healthy: false, checking: true });
  
  // Resize states
  const [size, setSize] = useState({ width: 384, height: 500 }); // Default: w-96 (384px), h-[500px]
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

  const handleSendMessage = async (message = inputMessage) => {
    if (!message.trim()) return;

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
        const response = await getRagChatBotResponse(message);
        const botResponse = {
          id: Date.now() + 1,
          type: 'bot',
          content: response.text,
          timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
          suggestions: response.suggestions || [],
          source: response.source,
          score: response.score,
          ragResponse: response.ragResponse
        };
        setMessages(prev => [...prev, botResponse]);
        setIsTyping(false);
      } catch (error) {
        console.error('Error getting bot response:', error);
        const errorResponse = {
          id: Date.now() + 1,
          type: 'bot',
          content: 'Xin lỗi, tôi gặp sự cố khi xử lý câu hỏi của bạn. Vui lòng thử lại! 😅',
          timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
          suggestions: ['Thử lại', 'Hỏi câu khác'],
          source: 'error'
        };
        setMessages(prev => [...prev, errorResponse]);
        setIsTyping(false);
      }
    }, 1500);
  };

  // Helper function to get status indicator
  const getStatusIndicator = () => {
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
        width: `${size.width}px`, 
        height: `${size.height}px`,
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
        <button
          onClick={onClose}
          className="text-peachDark hover:text-peachDark transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
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
                <div className={`flex items-center justify-between mt-1 ${
                  message.type === 'user' ? 'text-peachLight' : 'text-gray-500'
                }`}>
                  <p className="text-xs">{message.timestamp}</p>
                  {message.type === 'bot' && message.source && (
                    <div className="flex items-center space-x-1">
                      {message.source === 'faq' && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-1 rounded inline-flex items-center" title="FAQ Knowledge">
                          <img src={LightbulbIcon} alt="FAQ" className="w-3.5 h-3.5 mr-1" /> FAQ
                        </span>
                      )}
                      {message.source === 'recipes' && (
                        <span className="text-xs bg-green-100 text-green-700 px-1 rounded inline-flex items-center" title="Recipe Database">
                          <img src={chefHatIcon} alt="Recipe" className="w-3.5 h-3.5 mr-1" /> Recipe
                        </span>
                      )}
                      {message.source === 'gemini_fallback' && (
                        <span className="text-xs bg-purple-100 text-purple-700 px-1 rounded inline-flex items-center" title="AI Generated">
                          <img src={ChatDotsIcon} alt="AI" className="w-3.5 h-3.5 mr-1" /> AI
                        </span>
                      )}
                      {message.ragResponse && message.score && (
                        <span className="text-xs text-gray-400" title={`Confidence: ${(message.score * 100).toFixed(0)}%`}>
                          {(message.score * 100).toFixed(0)}%
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Hiển thị suggestions nếu có */}
            {message.type === 'bot' && message.suggestions && message.suggestions.length > 0 && (
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
            className="flex-1 border border-gray-300 rounded-full px-4 py-2 text-sm 
                       focus:outline-none focus:border-peach focus:ring-1 focus:ring-peach"
          />
          <button
            onClick={() => handleSendMessage()}
            disabled={!inputMessage.trim()}
            className="bg-tomato hover:bg-red-600 disabled:bg-gray-300 
                       text-white rounded-full p-2 transition-colors"
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
