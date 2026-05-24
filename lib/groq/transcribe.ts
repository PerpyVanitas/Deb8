export async function transcribeAudio(audioBuffer: ArrayBuffer) {
  const formData = new FormData()
  formData.append('file', new Blob([audioBuffer], { type: 'audio/webm' }), 'speech.webm')
  formData.append('model', 'whisper-large-v3')
  formData.append('response_format', 'verbose_json')
  formData.append('language', 'en')

  const res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
    body: formData,
  })

  if (!res.ok) {
    const text = await res.text()
    console.error('Groq API Error:', text)
    throw new Error('Transcription failed')
  }

  const data = await res.json()
  return { 
    text: data.text, 
    segments: data.segments ?? [],
    duration: data.duration ?? 0
  }
}
