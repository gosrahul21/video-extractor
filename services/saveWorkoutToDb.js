import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { db: { schema: 'freakyfit' } }
);

export const saveWorkoutToDb = async (user_id, url, workoutData, thumbnailUrl) => {
  console.log(`[4/4] Saving to Supabase...`);
  
  let finalThumbnailUrl = null;

  if (thumbnailUrl) {
    try {
      console.log(`Uploading thumbnail to Supabase...`);
      const response = await fetch(thumbnailUrl);
      if (response.ok) {
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const fileExt = thumbnailUrl.split('.').pop().split('?')[0] || 'jpg';
        const fileName = `workout_${Date.now()}.${fileExt}`;
        
        const { data, error } = await supabase.storage
          .from('thumbnails')
          .upload(fileName, buffer, { contentType: response.headers.get('content-type') || 'image/jpeg' });
          
        if (error) {
          console.error("Failed to upload thumbnail to Supabase:", error);
        } else {
          const { data: publicUrlData } = supabase.storage.from('thumbnails').getPublicUrl(fileName);
          finalThumbnailUrl = publicUrlData.publicUrl;
        }
      }
    } catch (err) {
      console.error("Failed to fetch and upload thumbnail:", err);
    }
  }

  // Step A: Insert workout
  const { data: workoutInsert, error: workoutError } = await supabase
    .from('workouts') 
    .insert({
      user_id,
      title: workoutData.workout_title,
      description: workoutData.description,
      is_ai_generated: true,
      source_url: url,
      thumbnail_url: finalThumbnailUrl
    })
    .select('id')
    .single();

  if (workoutError) throw workoutError;
  const workout_id = workoutInsert.id;

  // Step B: Loop through exercises
  for (const ex of workoutData.exercises) {
    let { data: existingEx, error: findExError } = await supabase
      .from('exercises')
      .select('id')
      .ilike('name', ex.name)
      .maybeSingle();
    
    if (findExError) throw findExError;

    let exercise_id = existingEx?.id;

    if (!exercise_id) {
      const { data: newEx, error: newExError } = await supabase
        .from('exercises')
        .insert({ 
          name: ex.name, 
          description: ex.description || null,
          primary_muscle: ex.primary_muscle ? [ex.primary_muscle] : [], 
          equipment: ex.equipment ? [ex.equipment] : [] 
        })
        .select('id')
        .single();
      
      if (newExError) throw newExError;
      exercise_id = newEx.id;
    }

    const { error: linkError } = await supabase
      .from('workout_exercises')
      .insert({
        workout_id,
        exercise_id,
        sets: ex.sets || null,
        reps: ex.reps || null,
        timestamp_start: ex.timestamp_start || null,
        timestamp_end: ex.timestamp_end || null,
        notes: ex.notes || null
      });
    
    if (linkError) throw linkError;
  }

  return workout_id;
};
