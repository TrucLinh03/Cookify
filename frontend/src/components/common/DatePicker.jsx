import React, { useState, useRef, useEffect } from 'react';
import CalendarIcon from '../../assets/clock.svg';

const DatePicker = ({ 
  startDate, 
  endDate, 
  onDateChange, 
  placeholder = "Chọn ngày",
  className = "" 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [tempStartDate, setTempStartDate] = useState(startDate || '');
  const [tempEndDate, setTempEndDate] = useState(endDate || '');
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Format date for display
  const formatDisplayDate = (start, end) => {
    if (!start && !end) return placeholder;
    
    const formatDate = (dateStr) => {
      if (!dateStr) return '';
      const date = new Date(dateStr);
      return date.toLocaleDateString('vi-VN');
    };

    if (start && end) {
      return `${formatDate(start)} - ${formatDate(end)}`;
    } else if (start) {
      return `Từ ${formatDate(start)}`;
    } else if (end) {
      return `Đến ${formatDate(end)}`;
    }
    return placeholder;
  };

  // Get today's date in YYYY-MM-DD format
  const getTodayString = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  // Handle apply dates
  const handleApply = () => {
    onDateChange(tempStartDate, tempEndDate);
    setIsOpen(false);
  };

  // Handle clear dates
  const handleClear = () => {
    setTempStartDate('');
    setTempEndDate('');
    onDateChange('', '');
    setIsOpen(false);
  };

  // Quick date presets
  const getQuickDates = () => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const thisWeekStart = new Date(today);
    thisWeekStart.setDate(today.getDate() - today.getDay());
    
    const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    
    const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);

    return [
      {
        label: 'Hôm nay',
        start: today.toISOString().split('T')[0],
        end: today.toISOString().split('T')[0]
      },
      {
        label: 'Hôm qua',
        start: yesterday.toISOString().split('T')[0],
        end: yesterday.toISOString().split('T')[0]
      },
      {
        label: 'Tuần này',
        start: thisWeekStart.toISOString().split('T')[0],
        end: today.toISOString().split('T')[0]
      },
      {
        label: 'Tháng này',
        start: thisMonthStart.toISOString().split('T')[0],
        end: today.toISOString().split('T')[0]
      },
      {
        label: 'Tháng trước',
        start: lastMonthStart.toISOString().split('T')[0],
        end: lastMonthEnd.toISOString().split('T')[0]
      }
    ];
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-sm text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      >
        <div className="flex items-center">
          <img src={CalendarIcon} alt="Calendar" className="w-4 h-4 mr-2 text-gray-400" />
          <span className={startDate || endDate ? 'text-gray-900' : 'text-gray-500'}>
            {formatDisplayDate(startDate, endDate)}
          </span>
        </div>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-80 bg-white border border-gray-200 rounded-lg shadow-lg">
          <div className="p-4">
            {/* Quick Presets */}
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Chọn nhanh:</h4>
              <div className="grid grid-cols-2 gap-2">
                {getQuickDates().map((preset, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => {
                      setTempStartDate(preset.start);
                      setTempEndDate(preset.end);
                    }}
                    className="px-3 py-2 text-xs bg-gray-100 hover:bg-gray-200 rounded-md text-gray-700 transition-colors"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Date Inputs */}
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Từ ngày:
                </label>
                <input
                  type="date"
                  value={tempStartDate}
                  onChange={(e) => setTempStartDate(e.target.value)}
                  max={getTodayString()}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Đến ngày:
                </label>
                <input
                  type="date"
                  value={tempEndDate}
                  onChange={(e) => setTempEndDate(e.target.value)}
                  min={tempStartDate}
                  max={getTodayString()}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between mt-4 pt-3 border-t border-gray-200">
              <button
                type="button"
                onClick={handleClear}
                className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 transition-colors"
              >
                Xóa
              </button>
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleApply}
                  className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Áp dụng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DatePicker;
