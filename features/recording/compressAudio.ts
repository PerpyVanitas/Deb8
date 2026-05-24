import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile, toBlobURL } from '@ffmpeg/util'

// Create a singleton instance so we only load WASM once per session
let ffmpeg: FFmpeg | null = null

export async function loadFFmpeg() {
  if (ffmpeg) return ffmpeg

  ffmpeg = new FFmpeg()

  const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd'
  
  // NOTE: We deliberately use the standard single-threaded core.
  // Using the multi-threaded core requires SharedArrayBuffer, 
  // which forces strict COOP/COEP headers and breaks Supabase OAuth.
  await ffmpeg.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
  })

  return ffmpeg
}

export async function compressWebm(blob: Blob): Promise<Blob> {
  const f = await loadFFmpeg()

  const inputName = 'input.webm'
  const outputName = 'output.webm'

  // Write input blob to FFmpeg's virtual file system
  await f.writeFile(inputName, await fetchFile(blob))

  // Execute compression command
  // -c:a libopus: Use Opus codec optimized for speech
  // -b:a 32k: High compression (32kbps), excellent for voice retention
  // -vbr on: Variable Bitrate
  await f.exec(['-i', inputName, '-c:a', 'libopus', '-b:a', '32k', '-vbr', 'on', outputName])

  // Read output
  const fileData = await f.readFile(outputName)
  const data = new Uint8Array(fileData as unknown as ArrayBuffer)

  // Clean up
  await f.deleteFile(inputName)
  await f.deleteFile(outputName)

  return new Blob([data], { type: 'audio/webm' })
}
