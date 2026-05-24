import { createClient } from '@/lib/supabase/client'

export async function uploadAudio(blob: Blob, userId: string, sessionId: string) {
  const supabase = createClient()
  const path = `${userId}/${sessionId}/speech.webm`
  const { data, error } = await supabase.storage
    .from('speeches')
    .upload(path, blob, { contentType: 'audio/webm', upsert: true })
    
  if (error) throw error
  return path
}
