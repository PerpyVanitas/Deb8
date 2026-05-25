import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile, toBlobURL } from '@ffmpeg/util'

let ffmpeg: FFmpeg | null = null

async function loadFFmpeg() {
  if (ffmpeg?.loaded) return ffmpeg

  ffmpeg = new FFmpeg()

  const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd'
  
  await ffmpeg.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
  })

  return ffmpeg
}

// Web Worker message listener
self.addEventListener('message', async (e: MessageEvent) => {
  const { type, payload, id } = e.data

  if (type === 'COMPRESS') {
    try {
      const f = await loadFFmpeg()
      const blob = payload as Blob
      
      const inputName = `input_${id}.webm`
      const outputName = `output_${id}.webm`

      // Provide progress updates
      f.on('progress', ({ progress }) => {
        self.postMessage({ type: 'PROGRESS', id, payload: progress })
      })

      await f.writeFile(inputName, await fetchFile(blob))

      await f.exec(['-i', inputName, '-c:a', 'libopus', '-b:a', '32k', '-vbr', 'on', outputName])

      const fileData = await f.readFile(outputName)
      const data = new Uint8Array(fileData as unknown as ArrayBuffer)
      
      const outBlob = new Blob([data], { type: 'audio/webm' })

      await f.deleteFile(inputName)
      await f.deleteFile(outputName)

      self.postMessage({ type: 'DONE', id, payload: outBlob })
    } catch (err: any) {
      self.postMessage({ type: 'ERROR', id, payload: err.message })
    }
  }
})
