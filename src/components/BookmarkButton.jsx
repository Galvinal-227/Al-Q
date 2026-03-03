import React, { useState, useEffect } from 'react';
import { Bookmark, BookmarkCheck, Loader2 } from 'lucide-react';

const BookmarkButton = ({ 
  surah, 
  ayat, 
  isBookmarked, 
  onToggle,
  isDarkMode,
  size = 'md'
}) => {
  const [loading, setLoading] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  const sizes = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12'
  };

  const iconSizes = {
    sm: 16,
    md: 18,
    lg: 22
  };

  const handleClick = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (loading) return;
    
    setLoading(true);
    try {
      await onToggle();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={handleClick}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        disabled={loading}
        className={`${sizes[size]} rounded-lg flex items-center justify-center transition-all ${
          isBookmarked
            ? isDarkMode
              ? 'bg-emerald-600 text-white hover:bg-emerald-700'
              : 'bg-emerald-500 text-white hover:bg-emerald-600'
            : isDarkMode
              ? 'bg-gray-700 text-gray-400 hover:bg-gray-600 hover:text-emerald-400'
              : 'bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-emerald-600'
        } disabled:opacity-50`}
      >
        {loading ? (
          <Loader2 className={`animate-spin ${
            isDarkMode ? 'text-gray-300' : 'text-gray-600'
          }`} size={iconSizes[size]} />
        ) : isBookmarked ? (
          <BookmarkCheck size={iconSizes[size]} />
        ) : (
          <Bookmark size={iconSizes[size]} />
        )}
      </button>

      {/* Tooltip */}
      {showTooltip && !loading && (
        <div className={`absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 rounded text-xs whitespace-nowrap ${
          isDarkMode
            ? 'bg-gray-700 text-white'
            : 'bg-gray-800 text-white'
        }`}>
          {isBookmarked ? 'Hapus bookmark' : 'Tambahkan bookmark'}
          <div className={`absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent ${
            isDarkMode ? 'border-t-gray-700' : 'border-t-gray-800'
          }`}></div>
        </div>
      )}
    </div>
  );
};

export default BookmarkButton;