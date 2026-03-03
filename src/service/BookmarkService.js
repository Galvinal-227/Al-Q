import { supabase } from '../lib/supabase';

export const bookmarkService = {
  // Ambil semua bookmark user
  async getUserBookmarks(userId) {
    try {
      console.log('Fetching bookmarks for user:', userId);
      
      const { data, error } = await supabase
        .from('bookmarks')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      console.log('Data from Supabase:', data);
      
      // Konversi ke format yang digunakan aplikasi
      return data.map(item => ({
        surah: item.surah_id,
        surahName: item.surah_name,
        arabic: item.surah_arabic_name || '',
        ayah: item.ayah_number,
        date: item.created_at
      }));
    } catch (error) {
      console.error('Error getting bookmarks:', error);
      return [];
    }
  },

  // Tambah bookmark
  async addBookmark(userId, bookmark) {
    try {
      console.log('Adding bookmark:', { userId, bookmark });
      
      // Cek dulu apakah sudah ada (unique constraint)
      const { data: existing } = await supabase
        .from('bookmarks')
        .select('*')
        .eq('user_id', userId)
        .eq('surah_id', bookmark.surah)
        .eq('ayah_number', bookmark.ayah);

      if (existing && existing.length > 0) {
        console.log('Bookmark already exists');
        return null;
      }

      const { data, error } = await supabase
        .from('bookmarks')
        .insert([{
          user_id: userId,
          surah_id: bookmark.surah,
          surah_name: bookmark.surahName,
          surah_arabic_name: bookmark.arabic || '', // PASTIKAN NAMA KOLOM INI
          ayah_number: bookmark.ayah
        }])
        .select();

      if (error) {
        console.error('Insert error:', error);
        throw error;
      }

      console.log('Bookmark added:', data);
      
      if (data && data[0]) {
        return {
          surah: data[0].surah_id,
          surahName: data[0].surah_name,
          arabic: data[0].surah_arabic_name,
          ayah: data[0].ayah_number,
          date: data[0].created_at
        };
      }
      return null;
    } catch (error) {
      console.error('Error adding bookmark:', error);
      throw error;
    }
  },

  // Hapus bookmark
  async removeBookmark(userId, surahId, ayahNumber) {
    try {
      console.log('Removing bookmark:', { userId, surahId, ayahNumber });
      
      const { error } = await supabase
        .from('bookmarks')
        .delete()
        .eq('user_id', userId)
        .eq('surah_id', surahId)
        .eq('ayah_number', ayahNumber);

      if (error) {
        console.error('Delete error:', error);
        throw error;
      }
      
      console.log('Bookmark removed successfully');
      return true;
    } catch (error) {
      console.error('Error removing bookmark:', error);
      throw error;
    }
  },

  // Cek apakah sudah di-bookmark
  async isBookmarked(userId, surahId, ayahNumber) {
    try {
      const { data, error } = await supabase
        .from('bookmarks')
        .select('id')
        .eq('user_id', userId)
        .eq('surah_id', surahId)
        .eq('ayah_number', ayahNumber)
        .maybeSingle();

      if (error) throw error;
      return !!data;
    } catch (error) {
      console.error('Error checking bookmark:', error);
      return false;
    }
  }
};