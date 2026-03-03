// components/NotificationForm.jsx
import React, { useState } from 'react';
import { Send, X, Image as ImageIcon, Bell, Upload, Globe, Users, Target } from 'lucide-react';

const NotificationForm = ({ onSend, onClose, isDarkMode }) => {
  const [notification, setNotification] = useState({
    title: '',
    body: '',
    imageUrl: '',
    name: '',
    topic: 'all', // Target penerima: all, users, premium, etc.
    schedule: false,
    scheduleTime: ''
  });

  const [isSending, setIsSending] = useState(false);
  const [preview, setPreview] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!notification.title.trim()) {
      alert('Judul notifikasi harus diisi');
      return;
    }
    
    if (!notification.body.trim()) {
      alert('Teks notifikasi harus diisi');
      return;
    }

    setIsSending(true);
    try {
      // Kirim ke backend API
      const response = await fetch('/api/admin/send-notification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        },
        body: JSON.stringify(notification)
      });

      if (response.ok) {
        alert('✅ Notifikasi berhasil dikirim!');
        resetForm();
        if (onClose) onClose();
      } else {
        throw new Error('Gagal mengirim notifikasi');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('❌ Gagal mengirim notifikasi');
    } finally {
      setIsSending(false);
    }
  };

  const resetForm = () => {
    setNotification({
      title: '',
      body: '',
      imageUrl: '',
      name: '',
      topic: 'all',
      schedule: false,
      scheduleTime: ''
    });
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setNotification(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validasi ukuran file (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        alert('Ukuran gambar maksimal 2MB');
        return;
      }

      // Validasi tipe file
      if (!file.type.startsWith('image/')) {
        alert('Hanya file gambar yang diizinkan');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setNotification(prev => ({
          ...prev,
          imageUrl: reader.result
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const previewNotification = () => {
    if (!notification.title || !notification.body) {
      alert('Judul dan teks harus diisi untuk preview');
      return;
    }
    setPreview(true);
  };

  const topics = [
    { id: 'all', label: 'Semua Pengguna', icon: <Globe size={16} /> },
    { id: 'active_users', label: 'Pengguna Aktif', icon: <Users size={16} /> },
    { id: 'premium', label: 'Pengguna Premium', icon: <Target size={16} /> },
    { id: 'new_users', label: 'Pengguna Baru', icon: <Users size={16} /> }
  ];

  return (
    <div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 ${isDarkMode ? 'dark' : ''}`}>
      <div className={`max-w-2xl w-full rounded-xl shadow-2xl max-h-[90vh] overflow-y-auto ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
        
        {/* Header */}
        <div className={`flex items-center justify-between p-6 border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-emerald-900/30' : 'bg-emerald-100'}`}>
              <Bell className={isDarkMode ? 'text-emerald-400' : 'text-emerald-600'} size={24} />
            </div>
            <div>
              <h2 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                Kirim Notifikasi
              </h2>
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Kirim notifikasi push ke pengguna aplikasi
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg ${isDarkMode ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          
          {/* Notification Title */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              <span className="flex items-center gap-2">
                <Bell size={14} />
                Notification title
              </span>
            </label>
            <input
              type="text"
              name="title"
              value={notification.title}
              onChange={handleChange}
              placeholder="Enter notification title"
              className={`w-full px-4 py-3 rounded-lg border ${
                isDarkMode 
                  ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:border-emerald-500 focus:ring-emerald-500' 
                  : 'bg-white border-gray-300 text-gray-800 placeholder-gray-400 focus:border-primary-500 focus:ring-primary-500'
              }`}
              required
            />
            <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Judul yang akan muncul di notifikasi
            </p>
          </div>

          {/* Notification Text */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Notification text
            </label>
            <textarea
              name="body"
              value={notification.body}
              onChange={handleChange}
              placeholder="Enter notification text"
              rows="3"
              className={`w-full px-4 py-3 rounded-lg border ${
                isDarkMode 
                  ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:border-emerald-500 focus:ring-emerald-500' 
                  : 'bg-white border-gray-300 text-gray-800 placeholder-gray-400 focus:border-primary-500 focus:ring-primary-500'
              }`}
              required
            />
            <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Isi/pesan notifikasi (maksimal 240 karakter)
            </p>
          </div>

          {/* Notification Image */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              <span className="flex items-center gap-2">
                <ImageIcon size={14} />
                Notification image (optional)
              </span>
            </label>
            <div className="flex gap-4 items-start">
              <div className="flex-1">
                <input
                  type="text"
                  name="imageUrl"
                  value={notification.imageUrl}
                  onChange={handleChange}
                  placeholder="Example: https://yourapp.com/image.png"
                  className={`w-full px-4 py-3 rounded-lg border ${
                    isDarkMode 
                      ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:border-emerald-500 focus:ring-emerald-500' 
                      : 'bg-white border-gray-300 text-gray-800 placeholder-gray-400 focus:border-primary-500 focus:ring-primary-500'
                  }`}
                />
              </div>
              <div className="relative">
                <input
                  type="file"
                  id="imageUpload"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <label
                  htmlFor="imageUpload"
                  className={`px-4 py-3 rounded-lg border cursor-pointer flex items-center gap-2 ${
                    isDarkMode 
                      ? 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700' 
                      : 'bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Upload size={16} />
                  Upload
                </label>
              </div>
            </div>
            <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              URL gambar atau upload gambar (maksimal 2MB)
            </p>
            
            {/* Image Preview */}
            {notification.imageUrl && (
              <div className="mt-3">
                <p className={`text-xs mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Preview:</p>
                <img 
                  src={notification.imageUrl} 
                  alt="Preview" 
                  className="w-32 h-32 object-cover rounded-lg border"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    console.error('Gambar tidak dapat dimuat');
                  }}
                />
              </div>
            )}
          </div>

          {/* Notification Name */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Notification name (optional)
            </label>
            <input
              type="text"
              name="name"
              value={notification.name}
              onChange={handleChange}
              placeholder="Enter optional name"
              className={`w-full px-4 py-3 rounded-lg border ${
                isDarkMode 
                  ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:border-emerald-500 focus:ring-emerald-500' 
                  : 'bg-white border-gray-300 text-gray-800 placeholder-gray-400 focus:border-primary-500 focus:ring-primary-500'
              }`}
            />
            <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Nama/kategori untuk identifikasi internal
            </p>
          </div>

          {/* Target Audience */}
          <div>
            <label className={`block text-sm font-medium mb-3 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              <span className="flex items-center gap-2">
                <Target size={14} />
                Target Penerima
              </span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {topics.map(topic => (
                <button
                  key={topic.id}
                  type="button"
                  onClick={() => setNotification(prev => ({ ...prev, topic: topic.id }))}
                  className={`p-3 rounded-lg border flex items-center gap-2 ${
                    notification.topic === topic.id
                      ? isDarkMode 
                        ? 'bg-emerald-900/30 border-emerald-700 text-emerald-400' 
                        : 'bg-emerald-50 border-emerald-500 text-emerald-700'
                      : isDarkMode 
                        ? 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700' 
                        : 'bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {topic.icon}
                  <span className="text-sm">{topic.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Schedule Option */}
          <div>
            <div className="flex items-center gap-3 mb-3">
              <input
                type="checkbox"
                id="schedule"
                name="schedule"
                checked={notification.schedule}
                onChange={handleChange}
                className="rounded"
              />
              <label htmlFor="schedule" className={`${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Jadwalkan notifikasi
              </label>
            </div>
            
            {notification.schedule && (
              <div className="ml-7">
                <input
                  type="datetime-local"
                  name="scheduleTime"
                  value={notification.scheduleTime}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 rounded-lg border ${
                    isDarkMode 
                      ? 'bg-gray-800 border-gray-700 text-white' 
                      : 'bg-white border-gray-300 text-gray-800'
                  }`}
                />
              </div>
            )}
          </div>

          {/* Character Count */}
          <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            <div>Judul: {notification.title.length}/60 karakter</div>
            <div>Teks: {notification.body.length}/240 karakter</div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-800">
            <button
              type="button"
              onClick={previewNotification}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                isDarkMode 
                  ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <ImageIcon size={16} />
              Preview
            </button>
            
            <button
              type="button"
              onClick={resetForm}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                isDarkMode 
                  ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Reset
            </button>

            <button
  type="button"
  onClick={() => {
    // Test notification langsung di browser
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(notification.title || 'Test Notification', {
        body: notification.body || 'This is a test notification',
        icon: notification.imageUrl || '/logo.png',
        tag: 'test-notification'
      });
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          new Notification(notification.title || 'Test Notification', {
            body: notification.body || 'This is a test notification',
            icon: notification.imageUrl || '/logo.png'
          });
        }
      });
    }
  }}
  disabled={!notification.title || !notification.body}
  className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
    isDarkMode 
      ? 'bg-blue-900 text-blue-300 hover:bg-blue-800 disabled:opacity-30' 
      : 'bg-blue-100 text-blue-700 hover:bg-blue-200 disabled:opacity-30'
  }`}
>
  <Bell size={16} />
  Test Notifikasi
</button>
            
            <button
              type="submit"
              disabled={isSending || !notification.title || !notification.body}
              className={`px-6 py-2 rounded-lg flex items-center gap-2 ${
                isSending
                  ? 'bg-gray-400 cursor-not-allowed'
                  : isDarkMode
                    ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                    : 'bg-primary-500 text-white hover:bg-primary-600'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isSending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Mengirim...
                </>
              ) : (
                <>
                  <Send size={16} />
                  Kirim Notifikasi
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Preview Modal */}
      {preview && (
        <div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 ${isDarkMode ? 'dark' : ''}`}>
          <div className={`max-w-sm w-full rounded-xl shadow-2xl ${isDarkMode ? 'bg-gray-900' : 'bg-white'} p-4 m-4`}>
            <div className="flex justify-between items-center mb-4">
              <h3 className={`font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                Preview Notifikasi
              </h3>
              <button onClick={() => setPreview(false)} className="text-gray-500">
                <X size={20} />
              </button>
            </div>
            
            {/* Preview Card */}
            <div className={`rounded-lg border ${isDarkMode ? 'border-gray-700' : 'border-gray-300'} p-4`}>
              <div className="flex gap-3">
                {notification.imageUrl && (
                  <img 
                    src={notification.imageUrl} 
                    alt="" 
                    className="w-12 h-12 rounded-lg object-cover"
                  />
                )}
                <div className="flex-1">
                  <div className={`font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                    {notification.title}
                  </div>
                  <div className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'} mt-1`}>
                    {notification.body}
                  </div>
                  <div className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'} mt-2`}>
                    Baru saja • Quran App
                  </div>
                </div>
              </div>
            </div>
            
            <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} mt-4`}>
              * Ini hanyalah preview. Tampilan aktual mungkin berbeda tergantung perangkat.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationForm;