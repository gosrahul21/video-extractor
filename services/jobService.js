import { supabase } from '../config/supabaseClient.js';
import crypto from 'crypto';

export const jobService = {
  /**
   * Create a new processing job in Supabase
   */
  async createJob({ url, user_id }) {
    const id = crypto.randomUUID();
    const newJob = {
      id,
      user_id,
      url,
      state: 'waiting',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('processing_jobs')
      .insert(newJob)
      .select()
      .single();

    if (error) {
      console.error('[JobService] Failed to create job in Supabase:', error);
      throw error;
    }

    return data;
  },

  /**
   * Get job status by ID
   */
  async getJob(id) {
    const { data, error } = await supabase
      .from('processing_jobs')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error('[JobService] Failed to fetch job:', error);
      throw error;
    }

    return data;
  },

  /**
   * Update job status and payload
   */
  async updateJob(id, updates) {
    const { data, error } = await supabase
      .from('processing_jobs')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error(`[JobService] Failed to update job ${id}:`, error);
      throw error;
    }

    return data;
  }
};

