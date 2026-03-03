import React from 'react';
import { BookOpen, Bookmark } from 'lucide-react';

const SurahList = ({ surahs, onSelectSurah, bookmarks, isDarkMode }) => {
  const getJuzInfo = (surahNumber) => {
    const surahToJuz = {
      1: 1, 2: { start: 1, end: 3 }, 3: { start: 3, end: 4 }, 4: 4, 5: 6, 6: 7, 7: 8, 8: 9, 9: 10,
      10: 11, 11: 11, 12: 12, 13: 13, 14: 13, 15: 14, 16: 14, 17: 15, 18: 15, 19: 16, 20: 16,
      21: 17, 22: 17, 23: 18, 24: 18, 25: 18, 26: 19, 27: 19, 28: 20, 29: 20, 30: 21, 31: 21,
      32: 21, 33: 21, 34: 22, 35: 22, 36: 22, 37: 23, 38: 23, 39: 23, 40: 24, 41: 24, 42: 25,
      43: 25, 44: 25, 45: 25, 46: 26, 47: 26, 48: 26, 49: 26, 50: 26, 51: 26, 52: 27, 53: 27,
      54: 27, 55: 27, 56: 27, 57: 27, 58: 28, 59: 28, 60: 28, 61: 28, 62: 28, 63: 28, 64: 28,
      65: 28, 66: 28, 67: 29, 68: 29, 69: 29, 70: 29, 71: 29, 72: 29, 73: 29, 74: 29, 75: 29,
      76: 29, 77: 29, 78: 30, 79: 30, 80: 30, 81: 30, 82: 30, 83: 30, 84: 30, 85: 30, 86: 30,
      87: 30, 88: 30, 89: 30, 90: 30, 91: 30, 92: 30, 93: 30, 94: 30, 95: 30, 96: 30, 97: 30,
      98: 30, 99: 30, 100: 30, 101: 30, 102: 30, 103: 30, 104: 30, 105: 30, 106: 30, 107: 30,
      108: 30, 109: 30, 110: 30, 111: 30, 112: 30, 113: 30, 114: 30
    };

    const juzInfo = surahToJuz[surahNumber];
    
    if (typeof juzInfo === 'object' && juzInfo.start && juzInfo.end) {
      return {
        start: juzInfo.start,
        end: juzInfo.end,
        display: juzInfo.start === juzInfo.end ? `Juz ${juzInfo.start}` : `Juz ${juzInfo.start}-${juzInfo.end}`
      };
    } else {
      return {
        start: juzInfo,
        end: juzInfo,
        display: `Juz ${juzInfo}`
      };
    }
  };

  const getJuzColor = (juzNumber) => {
    const juzNum = typeof juzNumber === 'object' ? juzNumber.start : juzNumber;
    
    // Warna untuk mode terang dan gelap dengan kontras yang baik
    const juzColors = {
      1: 'bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-800',
      2: 'bg-green-100 dark:bg-green-950 text-green-800 dark:text-green-200 border-green-200 dark:border-green-800',
      3: 'bg-yellow-100 dark:bg-yellow-950 text-yellow-800 dark:text-yellow-200 border-yellow-200 dark:border-yellow-800',
      4: 'bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-200 border-red-200 dark:border-red-800',
      5: 'bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-200 border-purple-200 dark:border-purple-800',
      6: 'bg-pink-100 dark:bg-pink-950 text-pink-800 dark:text-pink-200 border-pink-200 dark:border-pink-800',
      7: 'bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-200 border-indigo-200 dark:border-indigo-800',
      8: 'bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-200 border-teal-200 dark:border-teal-800',
      9: 'bg-orange-100 dark:bg-orange-950 text-orange-800 dark:text-orange-200 border-orange-200 dark:border-orange-800',
      10: 'bg-blue-200 dark:bg-blue-900 text-blue-900 dark:text-blue-100 border-blue-300 dark:border-blue-700',
      11: 'bg-green-200 dark:bg-green-900 text-green-900 dark:text-green-100 border-green-300 dark:border-green-700',
      12: 'bg-yellow-200 dark:bg-yellow-900 text-yellow-900 dark:text-yellow-100 border-yellow-300 dark:border-yellow-700',
      13: 'bg-red-200 dark:bg-red-900 text-red-900 dark:text-red-100 border-red-300 dark:border-red-700',
      14: 'bg-purple-200 dark:bg-purple-900 text-purple-900 dark:text-purple-100 border-purple-300 dark:border-purple-700',
      15: 'bg-pink-200 dark:bg-pink-900 text-pink-900 dark:text-pink-100 border-pink-300 dark:border-pink-700',
      16: 'bg-indigo-200 dark:bg-indigo-900 text-indigo-900 dark:text-indigo-100 border-indigo-300 dark:border-indigo-700',
      17: 'bg-teal-200 dark:bg-teal-900 text-teal-900 dark:text-teal-100 border-teal-300 dark:border-teal-700',
      18: 'bg-orange-200 dark:bg-orange-900 text-orange-900 dark:text-orange-100 border-orange-300 dark:border-orange-700',
      19: 'bg-blue-300 dark:bg-blue-800 text-blue-950 dark:text-blue-50 border-blue-400 dark:border-blue-600',
      20: 'bg-green-300 dark:bg-green-800 text-green-950 dark:text-green-50 border-green-400 dark:border-green-600',
      21: 'bg-yellow-300 dark:bg-yellow-800 text-yellow-950 dark:text-yellow-50 border-yellow-400 dark:border-yellow-600',
      22: 'bg-red-300 dark:bg-red-800 text-red-950 dark:text-red-50 border-red-400 dark:border-red-600',
      23: 'bg-purple-300 dark:bg-purple-800 text-purple-950 dark:text-purple-50 border-purple-400 dark:border-purple-600',
      24: 'bg-pink-300 dark:bg-pink-800 text-pink-950 dark:text-pink-50 border-pink-400 dark:border-pink-600',
      25: 'bg-indigo-300 dark:bg-indigo-800 text-indigo-950 dark:text-indigo-50 border-indigo-400 dark:border-indigo-600',
      26: 'bg-teal-300 dark:bg-teal-800 text-teal-950 dark:text-teal-50 border-teal-400 dark:border-teal-600',
      27: 'bg-orange-300 dark:bg-orange-800 text-orange-950 dark:text-orange-50 border-orange-400 dark:border-orange-600',
      28: 'bg-blue-400 dark:bg-blue-700 text-blue-950 dark:text-white border-blue-500 dark:border-blue-500',
      29: 'bg-green-400 dark:bg-green-700 text-green-950 dark:text-white border-green-500 dark:border-green-500',
      30: 'bg-yellow-400 dark:bg-yellow-700 text-yellow-950 dark:text-white border-yellow-500 dark:border-yellow-500'
    };
    
    return juzColors[juzNum] || 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-700';
  };

  return (
    <div className="space-y-2 max-h-[calc(100vh-200px)] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
      {surahs.map((surah) => {
        const juzInfo = getJuzInfo(surah.nomor);
        const isBookmarked = bookmarks.some(b => b.surah === surah.nomor);
        const juzColor = getJuzColor(juzInfo.start);
        
        return (
          <div
            key={surah.nomor}
            onClick={() => onSelectSurah(surah)}
            className={`surah-card p-4 cursor-pointer transition-all duration-200 rounded-lg border shadow-sm hover:shadow-md ${
              isDarkMode 
                ? 'bg-gray-900 hover:bg-gray-800 active:bg-gray-700 border-gray-700 hover:border-blue-600' 
                : 'bg-white hover:bg-gray-50 active:bg-gray-100 border-gray-200 hover:border-blue-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold border ${juzColor}`}>
                    {surah.nomor}
                  </div>
                  {isBookmarked && (
                    <Bookmark className={`absolute -top-1 -right-1 fill-current ${
                      isDarkMode ? 'text-emerald-400' : 'text-blue-600'
                    }`} size={16} />
                  )}
                </div>
                
                <div>
                  <h3 className={`font-semibold ${
                    isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}>
                    {surah.nama_latin || surah.namaLatin}
                  </h3>
                  <p className={`text-sm ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    {surah.arti} • {surah.jumlah_ayat || surah.jumlahAyat} ayat
                  </p>
                </div>
              </div>
              
              <div className="text-right">
                <div className={`text-xl font-arabic mb-1 ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  {surah.nama}
                </div>
                <div className={`text-xs ${
                  isDarkMode ? 'text-gray-500' : 'text-gray-400'
                }`}>
                  {juzInfo.display}
                </div>
              </div>
            </div>
            
            <div className={`mt-3 pt-3 border-t ${
              isDarkMode ? 'border-gray-700' : 'border-gray-200'
            }`}>
              <div className={`flex items-center gap-2 text-sm ${
                isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>
                <BookOpen size={14} className={isDarkMode ? 'text-gray-500' : 'text-gray-500'} />
                <span>Diturunkan di {surah.tempat_turun || surah.tempatTurun}</span>
                <span className={`ml-auto text-xs px-2 py-1 rounded border ${
                  isDarkMode 
                    ? 'bg-gray-800 text-gray-300 border-gray-600' 
                    : 'bg-gray-100 text-gray-700 border-gray-200'
                }`}>
                  No. {surah.nomor}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default SurahList;