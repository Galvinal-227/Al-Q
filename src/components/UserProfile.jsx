// UserProfile.jsx
import React from 'react';
import { User, Settings, LogOut } from 'lucide-react';
import { auth } from '../firebase/firebase';
import { signOut } from 'firebase/auth';

const UserProfile = ({ user, onLogout }) => {
  const handleLogout = async () => {
    try {
      await signOut(auth);
      onLogout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <div className="relative group">
      <button className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100">
        <div className="w-8 h-8 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full flex items-center justify-center">
          <User size={16} className="text-white" />
        </div>
        <span className="font-medium text-gray-700 hidden md:inline">
          {user.email?.split('@')[0]}
        </span>
      </button>
      
      <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-2 hidden group-hover:block z-10">
        <div className="px-4 py-2 border-b">
          <p className="text-sm text-gray-600">Masuk sebagai</p>
          <p className="font-medium truncate">{user.email}</p>
        </div>
        
        <button
          onClick={() => {/* Buka settings */}}
          className="w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-100 flex items-center gap-2"
        >
          <Settings size={16} />
          <span>Pengaturan</span>
        </button>
        
        <button
          onClick={handleLogout}
          className="w-full px-4 py-2 text-left text-red-600 hover:bg-red-50 flex items-center gap-2"
        >
          <LogOut size={16} />
          <span>Keluar</span>
        </button>
      </div>
    </div>
  );
};

export default UserProfile;