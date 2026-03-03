import { supabase } from '../lib/supabase';
import { auth } from '../firebase/firebase';

class DatabaseService {
  constructor() {
    this.currentUser = null;
    
    // Subscribe ke auth changes
    auth.onAuthStateChanged((user) => {
      this.currentUser = user;
      if (user) {
        this.initUserSettings();
      }
    });
  }

  // Helper untuk mendapatkan user_id
  getUserId() {
    return this.currentUser?.uid || 'anonymous';
  }

  // ============= USER SETTINGS =============
  
  // Inisialisasi setting user pertama kali
  async initUserSettings() {
    const userId = this.getUserId();
    if (userId === 'anonymous') return;

    try {
      const { data: existing } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (!existing) {
        // Buat setting default
        await supabase
          .from('user_settings')
          .insert([{
            user_id: userId,
            volume: 70,
            is_muted: false,
            auto_play_adzan: true,
            auto_tarhim: true,
            tarhim_duration: 30,
            city: 'Jakarta',
            use_manual_times: false,
            manual_fajr: '04:30',
            manual_dhuhr: '12:00',
            manual_asr: '15:30',
            manual_maghrib: '18:00',
            manual_isha: '19:30',
            notifications_enabled: false,
            notify_15min: true,
            notify_5min: true,
            notify_tarhim: true,
            last_active: new Date().toISOString()
          }]);

        console.log('✅ User settings initialized');
      }
    } catch (error) {
      console.error('❌ Error initializing settings:', error);
    }
  }

  // Ambil semua setting user
  async getUserSettings() {
    const userId = this.getUserId();
    
    try {
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code === 'PGRST116') {
        // Data belum ada, buat baru
        await this.initUserSettings();
        return this.getUserSettings();
      }

      return data || {};
    } catch (error) {
      console.error('❌ Error getting user settings:', error);
      return {};
    }
  }

  // Update setting user
  async updateUserSettings(settings) {
    const userId = this.getUserId();
    
    try {
      const { data, error } = await supabase
        .from('user_settings')
        .update({
          ...settings,
          updated_at: new Date().toISOString(),
          last_active: new Date().toISOString()
        })
        .eq('user_id', userId)
        .select();

      if (error) throw error;

      // Log activity
      await this.logActivity('settings_changed', { settings });

      return data;
    } catch (error) {
      console.error('❌ Error updating settings:', error);
      return null;
    }
  }

  // ============= VOLUME SETTINGS =============
  
  async setVolume(volume) {
    await this.updateUserSettings({ volume });
  }

  async setMuted(isMuted) {
    await this.updateUserSettings({ is_muted: isMuted });
  }

  async getVolumeSettings() {
    const settings = await this.getUserSettings();
    return {
      volume: settings.volume || 70,
      isMuted: settings.is_muted || false
    };
  }

  // ============= AUTO PLAY SETTINGS =============
  
  async setAutoPlay(autoPlayAdzan) {
    await this.updateUserSettings({ auto_play_adzan: autoPlayAdzan });
  }

  async setAutoTarhim(autoTarhim) {
    await this.updateUserSettings({ auto_tarhim: autoTarhim });
  }

  async setTarhimDuration(duration) {
    await this.updateUserSettings({ tarhim_duration: duration });
  }

  async getAutoSettings() {
    const settings = await this.getUserSettings();
    return {
      autoPlayAdzan: settings.auto_play_adzan !== false,
      autoTarhim: settings.auto_tarhim !== false,
      tarhimDuration: settings.tarhim_duration || 30
    };
  }

  // ============= LOCATION SETTINGS =============
  
  async setCity(city) {
    await this.updateUserSettings({ 
      city,
      use_manual_times: false 
    });
  }

  async setManualTimes(times) {
    await this.updateUserSettings({
      use_manual_times: true,
      manual_fajr: times.fajr,
      manual_dhuhr: times.dhuhr,
      manual_asr: times.asr,
      manual_maghrib: times.maghrib,
      manual_isha: times.isha
    });
  }

  async setUseManualTimes(useManual) {
    await this.updateUserSettings({ use_manual_times: useManual });
  }

  async getLocationSettings() {
    const settings = await this.getUserSettings();
    return {
      city: settings.city || 'Jakarta',
      useManualTimes: settings.use_manual_times || false,
      manualTimes: {
        fajr: settings.manual_fajr || '04:30',
        dhuhr: settings.manual_dhuhr || '12:00',
        asr: settings.manual_asr || '15:30',
        maghrib: settings.manual_maghrib || '18:00',
        isha: settings.manual_isha || '19:30'
      }
    };
  }

  // ============= NOTIFICATION SETTINGS =============
  
  async setNotificationSettings(settings) {
    await this.updateUserSettings(settings);
  }

  async getNotificationSettings() {
    const settings = await this.getUserSettings();
    return {
      enabled: settings.notifications_enabled || false,
      notify15min: settings.notify_15min !== false,
      notify5min: settings.notify_5min !== false,
      notifyTarhim: settings.notify_tarhim !== false
    };
  }

  // ============= ADZAN HISTORY =============
  
  async logAdzanPlayed(prayerName, isAuto = true, volume = 70, duration = null, completed = true) {
    const userId = this.getUserId();
    
    try {
      const { data, error } = await supabase
        .from('adzan_history')
        .insert([{
          user_id: userId,
          prayer_name: prayerName,
          is_auto: isAuto,
          volume: volume,
          duration_played: duration,
          completed: completed,
          played_at: new Date().toISOString()
        }])
        .select();

      if (error) throw error;

      // Update total count di user_settings
      await supabase.rpc('increment_adzan_count', { user_id: userId });

      // Update daily stats
      await this.updateDailyStats(prayerName, 'adzan');

      // Log activity
      await this.logActivity('adzan_played', { prayerName, isAuto });

      return data;
    } catch (error) {
      console.error('❌ Error logging adzan:', error);
    }
  }

  async logTarhimPlayed(isAuto = true, volume = 70, durationMinutes = 30, stoppedEarly = false) {
    const userId = this.getUserId();
    
    try {
      const { data, error } = await supabase
        .from('tarhim_history')
        .insert([{
          user_id: userId,
          is_auto: isAuto,
          volume: volume,
          duration_minutes: durationMinutes,
          stopped_early: stoppedEarly,
          played_at: new Date().toISOString()
        }])
        .select();

      if (error) throw error;

      // Update total count
      await supabase.rpc('increment_tarhim_count', { user_id: userId });

      // Update daily stats
      await this.updateDailyStats('subuh', 'tarhim');

      // Log activity
      await this.logActivity('tarhim_played', { durationMinutes, stoppedEarly });

      return data;
    } catch (error) {
      console.error('❌ Error logging tarhim:', error);
    }
  }

  // ============= DAILY STATS =============
  
  async updateDailyStats(prayerName, type) {
    const userId = this.getUserId();
    const today = new Date().toISOString().split('T')[0];

    try {
      // Cek apakah sudah ada stats hari ini
      const { data: existing } = await supabase
        .from('daily_stats')
        .select('*')
        .eq('user_id', userId)
        .eq('date', today)
        .single();

      if (existing) {
        // Update
        const updates = {};
        
        if (type === 'adzan') {
          updates.adzan_count = existing.adzan_count + 1;
          updates[`${prayerName}_count`] = existing[`${prayerName}_count`] + 1;
        } else {
          updates.tarhim_count = existing.tarhim_count + 1;
        }

        await supabase
          .from('daily_stats')
          .update(updates)
          .eq('id', existing.id);
      } else {
        // Insert baru
        const newStats = {
          user_id: userId,
          date: today,
          adzan_count: type === 'adzan' ? 1 : 0,
          tarhim_count: type === 'tarhim' ? 1 : 0,
          subuh_count: prayerName === 'subuh' && type === 'adzan' ? 1 : 0,
          dzuhur_count: prayerName === 'dzuhur' ? 1 : 0,
          ashar_count: prayerName === 'ashar' ? 1 : 0,
          maghrib_count: prayerName === 'maghrib' ? 1 : 0,
          isya_count: prayerName === 'isya' ? 1 : 0
        };

        await supabase
          .from('daily_stats')
          .insert([newStats]);
      }
    } catch (error) {
      console.error('❌ Error updating daily stats:', error);
    }
  }

  async getDailyStats(date = null) {
    const userId = this.getUserId();
    const targetDate = date || new Date().toISOString().split('T')[0];

    try {
      const { data, error } = await supabase
        .from('daily_stats')
        .select('*')
        .eq('user_id', userId)
        .eq('date', targetDate)
        .single();

      if (error && error.code === 'PGRST116') {
        return {
          adzan_count: 0,
          tarhim_count: 0,
          subuh_count: 0,
          dzuhur_count: 0,
          ashar_count: 0,
          maghrib_count: 0,
          isya_count: 0
        };
      }

      return data || {};
    } catch (error) {
      console.error('❌ Error getting daily stats:', error);
      return {};
    }
  }

  async getWeeklyStats() {
    const userId = this.getUserId();
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);

    try {
      const { data, error } = await supabase
        .from('daily_stats')
        .select('*')
        .eq('user_id', userId)
        .gte('date', startDate.toISOString().split('T')[0])
        .lte('date', endDate.toISOString().split('T')[0])
        .order('date', { ascending: true });

      return data || [];
    } catch (error) {
      console.error('❌ Error getting weekly stats:', error);
      return [];
    }
  }

  // ============= ACTIVITY LOGS =============
  
  async logActivity(activityType, details = {}) {
    const userId = this.getUserId();
    
    try {
      await supabase
        .from('activity_logs')
        .insert([{
          user_id: userId,
          activity_type: activityType,
          details: details,
          created_at: new Date().toISOString()
        }]);
    } catch (error) {
      console.error('❌ Error logging activity:', error);
    }
  }

  async getRecentActivities(limit = 20) {
    const userId = this.getUserId();
    
    try {
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      return data || [];
    } catch (error) {
      console.error('❌ Error getting activities:', error);
      return [];
    }
  }

  // ============= ADZAN HISTORY QUERIES =============
  
  async getRecentAdzan(limit = 10) {
    const userId = this.getUserId();
    
    try {
      const { data, error } = await supabase
        .from('adzan_history')
        .select('*')
        .eq('user_id', userId)
        .order('played_at', { ascending: false })
        .limit(limit);

      return data || [];
    } catch (error) {
      console.error('❌ Error getting adzan history:', error);
      return [];
    }
  }

  async getLastAdzan(prayerName = null) {
    const userId = this.getUserId();
    
    try {
      let query = supabase
        .from('adzan_history')
        .select('*')
        .eq('user_id', userId)
        .order('played_at', { ascending: false })
        .limit(1);

      if (prayerName) {
        query = query.eq('prayer_name', prayerName);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data[0] || null;
    } catch (error) {
      console.error('❌ Error getting last adzan:', error);
      return null;
    }
  }

  async getTodayAdzanCount() {
    const userId = this.getUserId();
    const today = new Date().toISOString().split('T')[0];

    try {
      const { count, error } = await supabase
        .from('adzan_history')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('played_at', today);

      return count || 0;
    } catch (error) {
      console.error('❌ Error getting today count:', error);
      return 0;
    }
  }

  // ============= TARHIM HISTORY =============
  
  async getRecentTarhim(limit = 10) {
    const userId = this.getUserId();
    
    try {
      const { data, error } = await supabase
        .from('tarhim_history')
        .select('*')
        .eq('user_id', userId)
        .order('played_at', { ascending: false })
        .limit(limit);

      return data || [];
    } catch (error) {
      console.error('❌ Error getting tarhim history:', error);
      return [];
    }
  }

  async getLastTarhim() {
    const userId = this.getUserId();
    
    try {
      const { data, error } = await supabase
        .from('tarhim_history')
        .select('*')
        .eq('user_id', userId)
        .order('played_at', { ascending: false })
        .limit(1);

      return data[0] || null;
    } catch (error) {
      console.error('❌ Error getting last tarhim:', error);
      return null;
    }
  }

  // ============= STATS DASHBOARD =============
  
  async getCompleteStats() {
    const [daily, weekly, lastAdzan, lastTarhim, adzanCount, recentActivities] = await Promise.all([
      this.getDailyStats(),
      this.getWeeklyStats(),
      this.getLastAdzan(),
      this.getLastTarhim(),
      this.getTodayAdzanCount(),
      this.getRecentActivities(5)
    ]);

    return {
      daily,
      weekly,
      lastAdzan,
      lastTarhim,
      adzanCount,
      recentActivities
    };
  }

  // ============= RESET / DELETE DATA =============
  
  async resetAllData() {
    const userId = this.getUserId();
    
    try {
      await Promise.all([
        supabase.from('adzan_history').delete().eq('user_id', userId),
        supabase.from('tarhim_history').delete().eq('user_id', userId),
        supabase.from('activity_logs').delete().eq('user_id', userId),
        supabase.from('daily_stats').delete().eq('user_id', userId)
      ]);

      await this.initUserSettings();

      return true;
    } catch (error) {
      console.error('❌ Error resetting data:', error);
      return false;
    }
  }
}

// Export singleton instance
export const dbService = new DatabaseService();