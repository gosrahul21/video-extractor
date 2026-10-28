import { createClient } from '@supabase/supabase-js';
import { Expo } from 'expo-server-sdk';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey, { db: { schema: 'freakyfit' } })
  : null;

const expo = new Expo();

export const sendWorkoutPushNotification = async (userId) => {
  try {
    if (!userId || !supabase) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('push_token')
      .eq('id', userId)
      .single();

    if (profile && profile.push_token && Expo.isExpoPushToken(profile.push_token)) {
      await expo.sendPushNotificationsAsync([{
        to: profile.push_token,
        sound: 'default',
        title: 'Workout Extracted!',
        body: 'Your video has been successfully processed and added to your library.'
      }]);
      console.log(`[PushNotification] Push notification sent to ${userId}`);
    }
  } catch (err) {
    console.error('[PushNotification] Error sending push notification:', err);
  }
};
