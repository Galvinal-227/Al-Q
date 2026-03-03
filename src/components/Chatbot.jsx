import React, { useState, useRef, useEffect } from 'react';
import { 
  Trash, Send, X, Bot, 
  Mic, MicOff, Loader2, Brain, User,
  ChevronUp, ChevronDown, Maximize, Minimize,
  Cpu, Wifi, WifiOff, RefreshCw, Info, Smile,
  Settings, Zap, Rocket, Sparkles, Target
} from 'lucide-react';
import EmojiPicker from 'emoji-picker-react';
import { motion, AnimatePresence } from 'framer-motion';

const Chatbot = ({ isOpen, onClose, isDarkMode, user }) => {
  // State
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: "Halo! Saya asisten virtual untuk Al-Quran Digital",
      sender: 'ai',
      timestamp: new Date(),
      username: 'AL-Q-Ai'
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [messageId, setMessageId] = useState(2);
  const [apiStatus, setApiStatus] = useState('idle');
  const [selectedModel, setSelectedModel] = useState('gpt-3.5-turbo');
  const [showModelSelector, setShowModelSelector] = useState(false);
  const [puterLoaded, setPuterLoaded] = useState(false);
  
  // Refs
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const chatWindowRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const recognitionRef = useRef(null);
  const modelSelectorRef = useRef(null);

  const getUserDisplayName = () => {
    if (!user) return 'Pengguna';
    if (user.displayName && user.displayName.trim() !== '') return user.displayName;
    if (user.email) return user.email.split('@')[0];
    return 'Pengguna';
  };

  const userDisplayName = getUserDisplayName();

  // Available AI Models with Lucide Icons
  const availableModels = [
    { 
      id: 'gpt-3.5-turbo', 
      name: 'GPT-3.5 Turbo', 
      desc: 'Cepat & Ringan',
      icon: 'Zap',
      color: 'from-blue-500 to-cyan-500'
    },
    { 
      id: 'gpt-4', 
      name: 'GPT-4', 
      desc: 'Powerful & Akurat',
      icon: 'Rocket',
      color: 'from-purple-500 to-pink-500'
    },
    { 
      id: 'gemini-2.5-flash', 
      name: 'Gemini 2.5 Flash', 
      desc: 'Cepat & Modern',
      icon: 'Sparkles',
      color: 'from-indigo-500 to-purple-500'
    },
    { 
      id: 'deepseek-v3.2', 
      name: 'DeepSeek v3.2', 
      desc: 'Efisien & Cerdas',
      icon: 'Brain',
      color: 'from-emerald-500 to-teal-500'
    },
    { 
      id: 'claude-3', 
      name: 'Claude 3', 
      desc: 'Analisis Mendalam',
      icon: 'Target',
      color: 'from-amber-500 to-orange-500'
    }
  ];

  // Map icon names to components
  const getIconComponent = (iconName, className = "w-4 h-4") => {
    switch(iconName) {
      case 'Zap': return <Zap className={className} />;
      case 'Rocket': return <Rocket className={className} />;
      case 'Sparkles': return <Sparkles className={className} />;
      case 'Brain': return <Brain className={className} />;
      case 'Target': return <Target className={className} />;
      default: return <Bot className={className} />;
    }
  };

  const getSystemPrompt = () => {
    return `Kamu adalah Al Q Ai, asisten AI yang ramah untuk aplikasi **Al-Quran Digital**.

**KONTEKS APLIKASI:**
Ini adalah aplikasi Al-Quran digital dengan fitur:
- 📖 Membaca Al-Quran dengan terjemahan (114 surah)
- 🎧 Audio murottal dari berbagai qari
- 📝 Bookmark ayat favorit
- 🕌 Jadwal shalat dan adzan (fitur Adzan)
- 🔍 Pencarian surah
- 🌙 Mode gelap/terang

**ATURAN UTAMA:**
1. Gunakan Bahasa Indonesia yang santai, sopan, dan mudah dipahami.
2. Panggil user dengan nama "${userDisplayName}" saat menyapa.
3. Fokus pada topik seputar Al-Quran dan ibadah.
4. Jika ditanya di luar konteks, arahkan kembali dengan ramah.
5. Gunakan format jawaban yang rapi dengan **bold** untuk poin penting.
6. Tambahkan emoji secukupnya agar hidup 😊
7. Maksimal 300 kata.
8. Untuk pertanyaan tentang ayat, sebutkan nomor surah dan artinya.
9. Untuk jadwal shalat, arahkan ke fitur Adzan.
10. Jangan menyebut "sebagai AI" atau istilah teknis.

**CONTOH RESPON:**
- "Hai ${userDisplayName}! 👋 Mau baca surah apa hari ini?"
- "Tentang ayat **QS. Al-Fatihah ayat 1-7**, ini artinya..."
- "Untuk jadwal shalat, ${userDisplayName} bisa buka tab **Adzan & Shalat** di atas ya 😊"
- "Wah, pertanyaan bagus! **Tips menghafal Al-Quran:** ..."

**HAL YANG TIDAK BOLEH:**
- ❌ Menjawab di luar konteks Islam (politik, hiburan, dll)
- ❌ Memberikan nasihat medis/legal
- ❌ Berdebat tentang perbedaan pendapat dalam Islam

Ingat: Tujuan utama membantu ${userDisplayName} memahami Al-Quran dan ibadah dengan lebih baik! 🤲`;
  };

  useEffect(() => {
    loadPuterScript();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target)) {
        setShowEmojiPicker(false);
      }
      if (modelSelectorRef.current && !modelSelectorRef.current.contains(event.target)) {
        setShowModelSelector(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'id-ID';

      recognitionRef.current.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map(result => result[0])
          .map(result => result.transcript)
          .join('');
        setInputMessage(transcript);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current.onerror = () => {
        setIsListening(false);
      };
    }
  }, []);

  const loadPuterScript = () => {
    return new Promise((resolve) => {
      if (window.puter) {
        console.log('Puter.ai sudah loaded');
        setApiStatus('ready');
        setPuterLoaded(true);
        resolve();
        return;
      }
      
      // Cek apakah script sudah ada
      if (document.querySelector('script[src="https://js.puter.com/v2/"]')) {
        console.log('Puter.ai script sudah ditambahkan, menunggu load...');
        // Tunggu sampai window.puter tersedia
        const checkPuter = setInterval(() => {
          if (window.puter) {
            clearInterval(checkPuter);
            setApiStatus('ready');
            setPuterLoaded(true);
            resolve();
          }
        }, 100);
        return;
      }
      
      const script = document.createElement('script');
      script.src = 'https://js.puter.com/v2/';
      script.async = true;
      
      script.onload = () => {
        console.log('Puter.ai script loaded successfully');
        setApiStatus('ready');
        setPuterLoaded(true);
        resolve();
      };
      
      script.onerror = () => {
        console.error('Failed to load Puter.ai script');
        setApiStatus('error');
        setPuterLoaded(false);
        resolve();
      };
      
      document.head.appendChild(script);
    });
  };

  const simulateTyping = async (text, callback) => {
    setIsTyping(true);
    let displayedText = "";
    
    const speed = text.length > 300 ? 10 : 20;
    
    for (let i = 0; i < text.length; i++) {
      displayedText += text[i];
      callback(displayedText);
      await new Promise(resolve => setTimeout(resolve, speed));
    }
    setIsTyping(false);
  };

  const addSystemNotification = (text) => {
    const notificationId = messageId;
    setMessageId(prev => prev + 1);
    
    const notificationMessage = {
      id: notificationId,
      text: text,
      sender: 'system',
      timestamp: new Date(),
      type: 'notification'
    };
    
    setMessages(prev => [...prev, notificationMessage]);
    
    setTimeout(() => {
      setMessages(prev => prev.filter(msg => msg.id !== notificationId));
    }, 5000);
  };

  const sendToAI = async (message) => {
    console.log(`Menggunakan model: ${selectedModel}`);
    
    if (!window.puter) {
      console.log('Puter.ai belum loaded, mencoba load...');
      await loadPuterScript();
      
      if (!window.puter) {
        console.log('Gagal load Puter.ai');
        return getMockResponse(message);
      }
    }
    
    try {
      setApiStatus('loading');
      const fullPrompt = `${getSystemPrompt()}\n\nPertanyaan user: ${message}\n\nJawab dalam Bahasa Indonesia:`;
      
      const response = await window.puter.ai.chat(fullPrompt, {
        model: selectedModel,
        stream: false  
      });
      
      setApiStatus('ready');
      
      let aiText = '';
      
      if (typeof response === 'string') {
        aiText = response;
      } else if (response && response.message && response.message.content) {
        aiText = response.message.content;
      } else if (response && response.content) {
        aiText = response.content;
      } else if (response && response.text) {
        aiText = response.text;
      } else {
        aiText = getMockResponse(message);
      }
      
      return aiText;
      
    } catch (error) {
      console.error('Error Puter.ai:', error);
      setApiStatus('error');
      return getMockResponse(message);
    }
  };

  // Mock response fallback
  const getMockResponse = (message) => {
    const displayName = userDisplayName;
    const mockResponses = [
      `Hai **${displayName}**! 👋 Terima kasih atas pertanyaannya tentang "${message.substring(0, 50)}..."\n\nUntuk info lebih lanjut tentang Al-Quran, kamu bisa:\n• Pilih surah dari daftar di samping\n• Gunakan fitur pencarian\n• Dengarkan audio murottal\n\nAda yang bisa saya bantu lagi? 😊`,
      
      `Assalamu'alaikum **${displayName}**! 🙏\n\nTentang **"${message.substring(0, 50)}..."**, saya sarankan untuk membaca langsung dari Al-Quran. Kamu bisa pilih surah yang ingin dibaca dari daftar di samping.\n\nButuh bantuan mencari surah tertentu? 🔍`,
      
      `Maaf **${displayName}**, saya sedang dalam mode pengembangan. Tapi kamu tetap bisa:\n✅ Membaca Al-Quran (114 surah)\n✅ Mendengarkan audio murottal\n✅ Melihat jadwal shalat\n✅ Menandai ayat favorit\n\nSilakan jelajahi fitur-fitur di atas! ✨`
    ];
    
    return mockResponses[Math.floor(Math.random() * mockResponses.length)];
  };

  // Send message
  const sendMessage = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = inputMessage;
    setInputMessage('');
    setShowEmojiPicker(false);
    
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
    
    const userMessageObj = {
      id: messageId,
      text: userMessage,
      sender: 'user', 
      timestamp: new Date(),
      username: userDisplayName
    };
    
    setMessageId(prev => prev + 1);
    setMessages(prev => [...prev, userMessageObj]);
    setIsLoading(true);

    try {
      const aiResponse = await sendToAI(userMessage);
      
      const aiMessageObj = {
        id: messageId + 1,
        text: "",
        sender: 'ai',
        timestamp: new Date(),
        username: 'Al-Q-Ai'
      };
      
      setMessageId(prev => prev + 2);
      setMessages(prev => [...prev, aiMessageObj]);
      
      simulateTyping(aiResponse, (typedText) => {
        setMessages(prev => {
          const newMessages = [...prev];
          const lastIndex = newMessages.length - 1;
          newMessages[lastIndex] = {
            ...aiMessageObj,
            text: typedText
          };
          return newMessages;
        });
      });

    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Clear chat
  const clearChat = () => {
    if (window.confirm("Yakin mau mulai percakapan baru?")) {
      setMessages([{
        id: 1,
        text: "Halo! 👋 Saya **Al-Q-Ai**, asisten virtual untuk Al-Quran Digital",
        sender: 'ai',
        timestamp: new Date(),
        username: 'Al-Q-Ai'
      }]);
      setMessageId(2);
    }
  };

  // Toggle voice input
  const toggleListening = () => {
    if (!recognitionRef.current) {
      addSystemNotification("Browser tidak mendukung voice recognition. Gunakan Chrome atau Edge terbaru.");
      return;
    }
    
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then(() => {
          recognitionRef.current.start();
          setIsListening(true);
        })
        .catch(() => {
          addSystemNotification("Izin mikrofon diperlukan untuk voice input.");
        });
    }
  };

  // Toggle fullscreen
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
    if (!isFullscreen) {
      setIsMinimized(false);
    }
  };

  const changeModel = (modelId) => {
    setSelectedModel(modelId);
    setShowModelSelector(false);
    const modelName = availableModels.find(m => m.id === modelId)?.name;
    addSystemNotification(`🤖 Model diubah ke **${modelName}**`);
  };

  const onEmojiClick = (emojiData) => {
    setInputMessage(prev => prev + emojiData.emoji);
    inputRef.current.focus();
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  };

  const renderMessageContent = (message) => {
    if (message.type === 'notification') {
      return (
        <div className="bg-gradient-to-r from-emerald-900/30 to-emerald-800/20 border border-emerald-700/30 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-emerald-300">
              {message.text}
            </div>
          </div>
          <div className="text-xs text-emerald-400/70 text-right mt-2">
            {formatTime(message.timestamp)}
          </div>
        </div>
      );
    }
    
    return <div className="whitespace-pre-wrap">{message.text}</div>;
  };

  const getCurrentModel = () => {
    return availableModels.find(m => m.id === selectedModel) || availableModels[0];
  };

  const getWindowDimensions = () => {
    if (isFullscreen) {
      return {
        width: 'calc(100vw - 40px)',
        height: 'calc(100vh - 40px)',
        left: '20px',
        top: '20px'
      };
    }
    
    if (isMinimized) {
      return {
        width: '320px',
        height: 'auto',
        left: `${window.innerWidth - 340}px`,
        top: '20px'
      };
    }
    
    return {
      width: '450px',
      height: '650px',
      left: `${window.innerWidth - 470}px`,
      top: '20px'
    };
  };

  const windowDimensions = getWindowDimensions();
  const currentModel = getCurrentModel();

  // Jika tidak open, jangan render apa-apa
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        ref={chatWindowRef}
        className="fixed z-[9999] bg-gradient-to-b from-gray-900 to-gray-950 border border-emerald-700 rounded-xl shadow-2xl flex flex-col"
        style={{
          width: windowDimensions.width,
          height: windowDimensions.height,
          left: windowDimensions.left,
          top: windowDimensions.top,
        }}
        initial={{ opacity: 0, scale: 0.8, y: 20 }}
        animate={{ 
          opacity: 1, 
          scale: 1, 
          y: 0,
          transition: {
            type: "spring",
            stiffness: 200,
            damping: 25
          }
        }}
        exit={{ opacity: 0, scale: 0.8, y: 20 }}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-800 to-emerald-900 p-4 rounded-t-xl flex justify-between items-center border-b border-emerald-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center">
              <Bot className="text-white w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white">Al-Q-Ai</h3>
              <div className="flex items-center gap-1 mt-0.5">
                <Cpu className="w-3 h-3 text-emerald-300" />
                <span className="text-xs text-emerald-200">
                  {currentModel.name}
                </span>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            {/* Model Selector Button */}
            <div className="relative" ref={modelSelectorRef}>
              <button 
                onClick={() => setShowModelSelector(!showModelSelector)}
                className="p-2 hover:bg-emerald-700/50 rounded-lg transition flex items-center gap-1"
                title="Ganti Model AI"
              >
                <Settings className="w-4 h-4 text-white" />
              </button>
              
              {/* Model Selector Dropdown */}
              <AnimatePresence>
                {showModelSelector && (
                  <motion.div
                    className="absolute right-0 mt-2 w-64 bg-gray-800 border border-emerald-700 rounded-lg shadow-xl z-50"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    <div className="p-3 border-b border-gray-700">
                      <h4 className="text-white font-semibold text-sm">Pilih Model AI</h4>
                      <p className="text-xs text-gray-400 mt-1">Berbeda model, berbeda kemampuan</p>
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                      {availableModels.map((model) => (
                        <button
                          key={model.id}
                          onClick={() => changeModel(model.id)}
                          className={`w-full text-left p-3 hover:bg-gray-700 transition flex items-center gap-3 ${
                            selectedModel === model.id ? 'bg-emerald-900/30 border-l-4 border-emerald-500' : ''
                          }`}
                        >
                          <div className={`w-8 h-8 rounded-full bg-gradient-to-r ${model.color} flex items-center justify-center text-white`}>
                            {getIconComponent(model.icon, "w-4 h-4")}
                          </div>
                          <div className="flex-1">
                            <div className="text-white text-sm font-medium">{model.name}</div>
                            <div className="text-xs text-gray-400">{model.desc}</div>
                          </div>
                          {selectedModel === model.id && (
                            <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                          )}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <button 
              onClick={toggleFullscreen}
              className="p-2 hover:bg-emerald-700/50 rounded-lg transition"
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            >
              {isFullscreen ? <Minimize className="w-4 h-4 text-white" /> : <Maximize className="w-4 h-4 text-white" />}
            </button>
            {!isFullscreen && (
              <button 
                onClick={() => setIsMinimized(!isMinimized)} 
                className="p-2 hover:bg-emerald-700/50 rounded-lg transition"
                title={isMinimized ? "Maximize" : "Minimize"}
              >
                {isMinimized ? <ChevronUp className="w-4 h-4 text-white" /> : <ChevronDown className="w-4 h-4 text-white" />}
              </button>
            )}
            <button 
              onClick={clearChat} 
              className="p-2 hover:bg-emerald-700/50 rounded-lg transition"
              title="Bersihkan chat"
            >
              <Trash className="w-4 h-4 text-white" />
            </button>
            <button 
              onClick={onClose} 
              className="p-2 hover:bg-red-500/20 rounded-lg transition"
              title="Tutup"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>

        {!isMinimized && (
          <>
            {/* Messages Container */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-gray-900 to-gray-950">
              <AnimatePresence>
                {messages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    className={`flex ${msg.sender === 'system' ? 'justify-center' : 
                              msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    {msg.sender === 'system' ? (
                      <div className="w-full max-w-[85%]">
                        {renderMessageContent(msg)}
                      </div>
                    ) : (
                      <div 
                        className={`max-w-[85%] rounded-xl p-4 ${
                          msg.sender === 'user' 
                            ? 'bg-gradient-to-r from-emerald-600 to-emerald-700 text-white' 
                            : 'bg-gradient-to-r from-gray-800 to-gray-900 text-gray-100 border border-emerald-700'
                        }`}
                      >
                        {/* Sender Info */}
                        <div className="flex items-center gap-2 mb-2">
                          <div className={`w-6 h-6 rounded-full bg-gradient-to-r ${
                            msg.sender === 'user' 
                              ? 'from-emerald-400 to-emerald-600' 
                              : 'from-emerald-400 to-emerald-600'
                          } flex items-center justify-center`}>
                            {msg.sender === 'user' ? 
                              <User className="w-3 h-3 text-white" /> : 
                              <Bot className="w-3 h-3 text-white" />
                            }
                          </div>
                          <span className="text-xs font-medium text-white">
                            {msg.sender === 'user' ? userDisplayName : 'AI'}
                            {msg.sender === 'ai' && (
                              <span className="ml-2 text-emerald-300 text-xs">
                                ({currentModel.name})
                              </span>
                            )}
                          </span>
                        </div>
                        
                        {/* Message Content */}
                        <div className="whitespace-pre-wrap break-words text-sm">
                          {renderMessageContent(msg)}
                        </div>
                        
                        {/* Timestamp */}
                        <div className="text-right mt-2">
                          <span className="text-xs text-gray-400">
                            {formatTime(msg.timestamp)}
                          </span>
                        </div>
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
              
              {/* Typing Indicator */}
              {(isLoading || isTyping) && (
                <motion.div 
                  className="flex justify-start"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <div className="bg-gradient-to-r from-gray-800 to-gray-900 rounded-xl p-4 border border-emerald-700">
                    <div className="flex items-center gap-3">
                      <div className="flex gap-1">
                        <motion.div 
                          className="w-2 h-2 bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full"
                          animate={{ y: [0, -4, 0] }}
                          transition={{ duration: 0.6, repeat: Infinity }}
                        />
                        <motion.div 
                          className="w-2 h-2 bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full"
                          animate={{ y: [0, -4, 0] }}
                          transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
                        />
                        <motion.div 
                          className="w-2 h-2 bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full"
                          animate={{ y: [0, -4, 0] }}
                          transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
                        />
                      </div>
                      <div className="text-sm text-gray-300">
                        {apiStatus === 'loading' ? 'Menghubungi AI...' : 'Mengetik...'}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="border-t border-emerald-800 p-4 bg-gradient-to-t from-gray-900 to-gray-950">
              {showEmojiPicker && (
                <div ref={emojiPickerRef} className="absolute bottom-20 right-4 z-50">
                  <EmojiPicker onEmojiClick={onEmojiClick} theme="dark" />
                </div>
              )}
              
              {/* Status Bar */}
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`flex items-center gap-1 ${apiStatus === 'ready' ? 'text-emerald-400' : apiStatus === 'error' ? 'text-red-400' : 'text-yellow-400'}`}>
                    {apiStatus === 'ready' ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                    <span className="text-xs">
                      {apiStatus === 'ready' ? 'AI Siap' : 
                       apiStatus === 'loading' ? 'Menghubungi...' : 
                       apiStatus === 'error' ? 'Offline' : 'Mode Offline'}
                    </span>
                  </div>
                  <div className="text-xs text-emerald-600 bg-emerald-900/30 px-2 py-0.5 rounded-full">
                    {currentModel.name}
                  </div>
                </div>
                <button
                  onClick={loadPuterScript}
                  className="p-1 hover:bg-gray-700 rounded"
                  title="Refresh Koneksi"
                >
                  <RefreshCw className="w-3 h-3 text-gray-400" />
                </button>
              </div>
              
              <form onSubmit={sendMessage} className="flex gap-2">
                {/* Emoji Button */}
                <button 
                  type="button" 
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)} 
                  className="flex-shrink-0 w-10 h-10 flex items-center justify-center bg-gray-800 border border-emerald-700 rounded-lg hover:bg-gray-700"
                >
                  <Smile className="w-5 h-5 text-gray-400" />
                </button>
                
                {/* Voice Input Button */}
                <button 
                  type="button" 
                  onClick={toggleListening} 
                  className={`flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-lg ${
                    isListening 
                      ? 'bg-red-600 text-white animate-pulse' 
                      : 'bg-gray-800 border border-emerald-700 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>
                
                {/* Input Field */}
                <input
                  ref={inputRef}
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder={isListening ? "Sedang mendengarkan..." : "Tanya tentang Al-Quran..."}
                  className="flex-1 h-10 bg-gray-800 border border-emerald-700 rounded-lg px-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                  disabled={isLoading}
                />
                
                {/* Send Button */}
                <button 
                  type="submit" 
                  className="flex-shrink-0 bg-gradient-to-r from-emerald-500 to-emerald-700 text-white w-10 h-10 flex items-center justify-center rounded-lg disabled:opacity-50 hover:from-emerald-600 hover:to-emerald-800 transition-all"
                  disabled={isLoading || !inputMessage.trim()}
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </button>
              </form>
            </div>
          </>
        )}
      </motion.div>
    </AnimatePresence>
  );
};

export default Chatbot;