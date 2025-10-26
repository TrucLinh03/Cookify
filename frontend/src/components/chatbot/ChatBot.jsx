import React, { useState } from 'react';
import ChatWindow from './ChatWindow';
import chefHatIcon from '../../assets/chef-hat.svg';

const ChatBot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ edge: 'right', offset: 16 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const toggleChat = () => {
    setIsOpen(!isOpen);
  };

  const handleMouseDown = (e) => {
    if (e.target.closest('button')) {
      setIsDragging(true);
      const rect = e.currentTarget.getBoundingClientRect();
      setDragStart({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
    }
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
    
    switch (position.edge) {
      case 'left':
        // Nút ở bên trái -> cửa sổ hiển thị bên phải nút
        return {
          left: `${buttonSize + gap + 8}px`,
          bottom: `${Math.max(16, viewportHeight - position.offset - chatWindowHeight)}px`
        };
      case 'right':
        // Nút ở bên phải -> cửa sổ hiển thị bên trái nút
        return {
          right: `${buttonSize + gap + 8}px`,
          bottom: `${Math.max(16, viewportHeight - position.offset - chatWindowHeight)}px`
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
          bottom: `${buttonSize + gap + 8}px`
        };
      default:
        return {
          right: `${buttonSize + gap + 8}px`,
          bottom: '16px'
        };
    }
  };

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

      {/* Chat Button */}
      <div 
        className={`fixed z-50 ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        style={{
          ...(position.edge === 'left' && { left: '8px', top: `${position.offset}px` }),
          ...(position.edge === 'right' && { right: '8px', top: `${position.offset}px` }),
          ...(position.edge === 'top' && { top: '8px', left: `${position.offset}px` }),
          ...(position.edge === 'bottom' && { bottom: '8px', left: `${position.offset}px` })
        }}
        onMouseDown={handleMouseDown}
      >
        <button
          onClick={toggleChat}
          className={`
            relative bg-gradient-to-r from-orange-500 to-amber-500 
            text-white p-3 sm:p-4 rounded-full shadow-lg 
            hover:shadow-xl hover:scale-110 
            transition-all duration-300 ease-out
            min-h-[56px] min-w-[56px] sm:min-h-[64px] sm:min-w-[64px]
            flex items-center justify-center
            ${isOpen ? 'rotate-180' : 'animate-pulse-slow'}
          `}
          title="Chef AI Assistant - Hỏi đáp về nấu ăn"
          aria-label="Mở trợ lý AI nấu ăn"
        >
          <img 
            src={chefHatIcon} 
            alt="Chef AI" 
            className="w-6 h-6 sm:w-8 sm:h-8 filter brightness-0 invert"
          />
          
          {/* Notification dot */}
          {!isOpen && (
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-ping"></div>
          )}
        </button>
      </div>
    </>
  );
};

export default ChatBot;
