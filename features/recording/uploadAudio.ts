import { createClient } from '@/lib/supabase/client'

export async function uploadAudio(blob: Blob, userId: string, sessionId: string, speakerIndex: number = 0) {
  const supabase = createClient()
  const path = `${userId}/${sessionId}/speech_${speakerIndex}.webm`
  const { data, error } = await supabase.storage
    .from('speeches')
    .upload(path, blob, { contentType: 'audio/webm', upsert: true })
    
  if (error) throw error
  return path
}
