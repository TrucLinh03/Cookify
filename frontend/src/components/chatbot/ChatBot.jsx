import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import ChatWindow from './ChatWindow';
import SecureStorage from '../../utils/secureStorage';
import chefHatIcon from '../../assets/chef-hat.svg';

const ChatBot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const location = useLocation();
  // Default: right side, 15% from bottom
  const [position, setPosition] = useState({ edge: 'right', offset: null, bottomPercent: 5 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Check user role on component mount
  useEffect(() => {
    const token = SecureStorage.getToken();
    if (token && typeof token === 'string') {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUserRole(payload.role);
      } catch (error) {
        console.error('Error parsing token:', error);
        setUserRole('user'); // Default to user if error
      }
    } else {
      setUserRole('user'); // Default to user if no token
    }
  }, []);

  const toggleChat = () => {
    setIsOpen(!isOpen);
  };

  const handleMouseDown = (e) => {
    // If the actual click is on the button, do NOT start dragging
    if (e.target.closest('button')) return;
    setIsDragging(true);
    const rect = e.currentTarget.getBoundingClientRect();
    setDragStart({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      const buttonSize = 64; // Kích thước nút (p-4 + icon)
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const mouseX = e.clientX;
      const mouseY = e.clientY;
      
      // Tính khoảng cách đến mỗi cạnh
      const distToLeft = mouseX;
      const distToRight = viewportWidth - mouseX;
      const distToTop = mouseY;
      const distToBottom = viewportHeight - mouseY;
      
      // Tìm cạnh gần nhất
      const minDist = Math.min(distToLeft, distToRight, distToTop, distToBottom);
      
      let edge, offset;
      
      if (minDist === distToLeft) {
        edge = 'left';
        offset = Math.max(16, Math.min(mouseY, viewportHeight - buttonSize - 16));
      } else if (minDist === distToRight) {
        edge = 'right';
        offset = Math.max(16, Math.min(mouseY, viewportHeight - buttonSize - 16));
      } else if (minDist === distToTop) {
        edge = 'top';
        offset = Math.max(16, Math.min(mouseX, viewportWidth - buttonSize - 16));
      } else {
        edge = 'bottom';
        offset = Math.max(16, Math.min(mouseX, viewportWidth - buttonSize - 16));
      }
      
      setPosition({ edge, offset });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  React.useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragStart]);

  // Tính toán vị trí cửa sổ chat dựa trên vị trí nút
  const getChatWindowPosition = () => {
    const buttonSize = 64;
    const chatWindowWidth = 384; // w-96
    const chatWindowHeight = 500; // h-[500px]
    const gap = 16; // Khoảng cách giữa nút và cửa sổ
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const bottomByPercent = position.bottomPercent != null ? `${position.bottomPercent}vh` : null;
    const isMobile = viewportWidth <= 640;
    
    // Mobile: pin to right with margin and CLEAR the floating button area
    if (isMobile) {
      const clearPx = 80; // ~64 button + 16 gap
      return {
        right: '12px',
        bottom: bottomByPercent ? `calc(${bottomByPercent} + ${clearPx}px)` : `${12 + clearPx}px`
      };
    }

    switch (position.edge) {
      case 'left':
        // Nút ở bên trái -> cửa sổ hiển thị bên phải nút
        return {
          left: `${buttonSize + gap + 8}px`,
          bottom: `${Math.max(16, viewportHeight - (position.offset ?? 0) - chatWindowHeight)}px`
        };
      case 'right':
        // Nút ở bên phải -> cửa sổ hiển thị bên trái nút
        return {
          right: `${buttonSize + gap + 8}px`,
          bottom: bottomByPercent || `${Math.max(16, viewportHeight - (position.offset ?? 0) - chatWindowHeight)}px`
        };
      case 'top':
        // Nút ở trên -> cửa sổ hiển thị bên dưới nút
        const leftPos = Math.min(position.offset, viewportWidth - chatWindowWidth - 16);
        return {
          left: `${Math.max(16, leftPos)}px`,
          top: `${buttonSize + gap + 8}px`
        };
      case 'bottom':
        // Nút ở dưới -> cửa sổ hiển thị bên trên nút
        const leftPosBottom = Math.min(position.offset, viewportWidth - chatWindowWidth - 16);
        return {
          left: `${Math.max(16, leftPosBottom)}px`,
          bottom: bottomByPercent || `${buttonSize + gap + 8}px`
        };
      default:
        return {
          right: `${buttonSize + gap + 8}px`,
          bottom: bottomByPercent || '16px'
        };
    }
  };

  // Don't render chatbot for admin users or auth pages
  const isAuthPage = location.pathname === '/login' || location.pathname === '/register';
  
  if (userRole === 'admin' || isAuthPage) {
    return null;
  }

  return (
    <>
      {/* Chat Window */}
      {isOpen && (
        <div 
          className="fixed z-50 animate-slideUp"
          style={getChatWindowPosition()}
        >
          <ChatWindow onClose={() => setIsOpen(false)} />
        </div>
      )}

      {/* Chat Button - Hiển thị để dễ di chuyển */}
      {(
        <div 
          className={`fixed z-50 ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
          style={{
            ...(position.edge === 'left' && { left: '16px', top: `${position.offset ?? 16}px` }),
            ...(position.edge === 'right' && (
              position.bottomPercent != null
                ? { right: '16px', bottom: `${position.bottomPercent}vh` }
                : { right: '16px', top: `${position.offset ?? 16}px` }
            )),
            ...(position.edge === 'top' && { top: '16px', left: `${position.offset ?? 16}px` }),
            ...(position.edge === 'bottom' && (
              position.bottomPercent != null
                ? { bottom: `${position.bottomPercent}vh`, right: '16px' }
                : { bottom: '16px', right: '16px' }
            ))
          }}
          onMouseDown={handleMouseDown}
        >
          <button
            onClick={toggleChat}
            className={`
              relative bg-orange-600
              text-white p-3 sm:p-4 rounded-full shadow-lg 
              hover:shadow-xl hover:scale-110 hover:bg-orange-600
              transition-all duration-300 ease-out
              min-h-[56px] min-w-[56px] sm:min-h-[64px] sm:min-w-[64px]
              flex items-center justify-center
              ${!isOpen ? 'animate-pulse-slow' : ''}
            `}
            title={isOpen ? "Đóng trợ lý AI" : "Chef AI Assistant - Hỏi đáp về nấu ăn"}
            aria-label={isOpen ? "Đóng trợ lý AI nấu ăn" : "Mở trợ lý AI nấu ăn"}
          >
            {isOpen ? (
              // Close icon when chat is open
              <svg className="w-6 h-6 sm:w-8 sm:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              // Chef hat icon when chat is closed
              <img 
                src={chefHatIcon} 
                alt="Chef AI" 
                className="w-6 h-6 sm:w-8 sm:h-8 filter brightness-0 invert"
              />
            )}
            
            {/* Notification dot - only show when closed */}
            {!isOpen && (
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-tomato rounded-full animate-ping"></div>
            )}
          </button>
        </div>
      )}
    </>
  );
};

export default ChatBot;
