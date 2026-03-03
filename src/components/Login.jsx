// Login.jsx
import React, { useState } from 'react';
import { LogIn, UserPlus, Loader, Mail, Key, User, X } from 'lucide-react';
import { auth } from '../firebase/firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail 
} from 'firebase/auth';

const Login = ({ onLoginSuccess, onClose }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const googleProvider = new GoogleAuthProvider();

  const handleGoogleLogin = async () => {
    setError('');
    setSuccessMessage('');
    setLoading(true);

    try {
      await signInWithPopup(auth, googleProvider);
      onLoginSuccess();
      onClose();
    } catch (err) {
      console.error('Google login error:', err);
      setError(err.message || 'Gagal login dengan Google');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError('Masukkan email untuk reset password');
      return;
    }

    setLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      await sendPasswordResetEmail(auth, email);
      setSuccessMessage('Email reset password telah dikirim! Cek inbox Anda.');
      setTimeout(() => {
        setShowForgotPassword(false);
        setSuccessMessage('');
      }, 3000);
    } catch (err) {
      setError(err.message || 'Gagal mengirim email reset');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setLoading(true);

    try {
      if (isLogin) {
        // Login dengan email/password
        await signInWithEmailAndPassword(auth, email, password);
        onLoginSuccess();
        onClose();
      } else {
        // Register
        if (password !== confirmPassword) {
          throw new Error('Password tidak cocok');
        }
        if (password.length < 6) {
          throw new Error('Password minimal 6 karakter');
        }
        if (!name.trim()) {
          throw new Error('Nama harus diisi');
        }
        
        // Buat user dengan email/password
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // Update profile dengan nama
        // Note: Untuk update nama, Anda perlu setup Firestore atau Realtime Database
        // Ini contoh sederhana, Anda bisa extend nanti
        
        onLoginSuccess();
        onClose();
      }
    } catch (err) {
      console.error('Auth error:', err);
      
      // Terjemahkan error message ke Bahasa Indonesia
      let errorMessage = err.message;
      if (errorMessage.includes('auth/invalid-credential')) {
        errorMessage = 'Email atau password salah';
      } else if (errorMessage.includes('auth/user-not-found')) {
        errorMessage = 'Akun tidak ditemukan';
      } else if (errorMessage.includes('auth/wrong-password')) {
        errorMessage = 'Password salah';
      } else if (errorMessage.includes('auth/email-already-in-use')) {
        errorMessage = 'Email sudah terdaftar';
      } else if (errorMessage.includes('auth/weak-password')) {
        errorMessage = 'Password terlalu lemah';
      } else if (errorMessage.includes('auth/invalid-email')) {
        errorMessage = 'Format email tidak valid';
      } else if (errorMessage.includes('auth/network-request-failed')) {
        errorMessage = 'Koneksi internet bermasalah';
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Render form forgot password
  if (showForgotPassword) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-8 w-full max-w-md">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">Reset Password</h2>
              <p className="text-gray-600 mt-1">Masukkan email untuk reset password</p>
            </div>
            <button
              onClick={() => setShowForgotPassword(false)}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <X size={20} />
            </button>
          </div>

          <form onSubmit={(e) => { e.preventDefault(); handleForgotPassword(); }} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                placeholder="email@contoh.com"
                required
              />
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {successMessage && (
              <div className="bg-emerald-50 text-emerald-600 p-3 rounded-lg text-sm">
                {successMessage}
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowForgotPassword(false)}
                className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50"
              >
                Kembali
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-emerald-500 text-white py-2.5 rounded-lg font-medium hover:bg-emerald-600 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader className="animate-spin" size={20} />
                    Mengirim...
                  </>
                ) : (
                  'Kirim Reset Link'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-8 w-full max-w-md">
        <div className="flex justify-between items-start mb-6">
          <div className="text-center flex-1">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full mb-4">
              {isLogin ? (
                <LogIn className="text-white" size={28} />
              ) : (
                <UserPlus className="text-white" size={28} />
              )}
            </div>
            <h2 className="text-2xl font-bold text-gray-800">
              {isLogin ? 'Masuk ke Akun' : 'Buat Akun Baru'}
            </h2>
            <p className="text-gray-600 mt-2">
              {isLogin 
                ? 'Masuk untuk mendapatkan notifikasi dan fitur lainnya' 
                : 'Daftar untuk mulai menggunakan aplikasi dan notifikasi'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <X size={20} />
          </button>
        </div>

        {/* Google Sign-In Button */}
        <div className="mb-6">
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full py-3 px-4 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 disabled:opacity-50 flex items-center justify-center gap-3"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            <span>{isLogin ? 'Lanjutkan dengan Google' : 'Daftar dengan Google'}</span>
          </button>
        </div>

        {/* Divider */}
        <div className="flex items-center mb-6">
          <div className="flex-1 border-t border-gray-300"></div>
          <div className="mx-4 text-gray-500 text-sm">atau</div>
          <div className="flex-1 border-t border-gray-300"></div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <User size={16} className="inline mr-2" />
                Nama Lengkap
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                placeholder="Nama Anda"
                required={!isLogin}
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Mail size={16} className="inline mr-2" />
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              placeholder="email@contoh.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Key size={16} className="inline mr-2" />
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              placeholder="Minimal 6 karakter"
              required
            />
          </div>

          {!isLogin && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Key size={16} className="inline mr-2" />
                Konfirmasi Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                placeholder="Ulangi password"
                required={!isLogin}
              />
            </div>
          )}

          {isLogin && (
            <div className="text-right">
              <button
                type="button"
                onClick={() => setShowForgotPassword(true)}
                className="text-sm text-emerald-600 hover:text-emerald-700"
              >
                Lupa password?
              </button>
            </div>
          )}

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white py-3 rounded-lg font-medium hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader className="animate-spin" size={20} />
                {isLogin ? 'Memproses...' : 'Mendaftar...'}
              </>
            ) : (
              <>
                {isLogin ? <LogIn size={20} /> : <UserPlus size={20} />}
                {isLogin ? 'Masuk' : 'Daftar'}
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setError('');
              setSuccessMessage('');
            }}
            className="text-emerald-600 hover:text-emerald-700 font-medium"
          >
            {isLogin 
              ? 'Belum punya akun? Daftar di sini' 
              : 'Sudah punya akun? Masuk di sini'}
          </button>
        </div>

        <div className="mt-4 text-center">
          <p className="text-xs text-gray-500">
            Dengan melanjutkan, Anda menyetujui{' '}
            <button className="text-emerald-600 hover:underline">Syarat & Ketentuan</button>
            {' '}dan{' '}
            <button className="text-emerald-600 hover:underline">Kebijakan Privasi</button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;