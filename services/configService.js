import { supabase } from '../config/supabaseClient.js';

// In-memory cache for Lambda container
const cache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export const configService = {
  /**
   * Get configuration value by key (with memory caching)
   */
  async get(key) {
    const cached = cache.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.value;
    }

    try {
      const { data, error } = await supabase
        .from('app_config')
        .select('value')
        .eq('key', key)
        .maybeSingle();

      if (error) {
        console.warn(`[ConfigService] Error fetching config for "${key}":`, error.message);
        return null;
      }

      if (data?.value) {
        cache.set(key, { value: data.value, timestamp: Date.now() });
        return data.value;
      }
    } catch (err) {
      console.warn(`[ConfigService] Failed to load "${key}" from Supabase:`, err.message);
    }

    return null;
  },

  /**
   * Set / Rotate configuration value
   */
  async set(key, value) {
    const { data, error } = await supabase
      .from('app_config')
      .upsert({
        key,
        value,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    cache.set(key, { value, timestamp: Date.now() });
    return data;
  }
};
