// We keep loadFFmpeg as a no-op or just preload the worker if needed, 
// but we'll instantiate the worker dynamically to avoid SSR issues.

let workerInstance: Worker | null = null

function getWorker() {
  if (typeof window === 'undefined') return null
  if (!workerInstance) {
    workerInstance = new Worker(new URL('./ffmpeg.worker.ts', import.meta.url))
  }
  return workerInstance
}

export async function loadFFmpeg() {
  // Pre-initialize worker so it can start downloading WASM in the background
  getWorker()
  return true
}

export function compressWebm(blob: Blob, onProgress?: (p: number) => void): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const worker = getWorker()
    if (!worker) {
      return reject(new Error("Web Workers are not supported in this environment"))
    }

    const id = Math.random().toString(36).substring(7)

    const handleMessage = (e: MessageEvent) => {
      const { type, payload, id: msgId } = e.data
      if (msgId !== id) return

      if (type === 'PROGRESS' && onProgress) {
        onProgress(payload)
      } else if (type === 'DONE') {
        worker.removeEventListener('message', handleMessage)
        resolve(payload as Blob)
      } else if (type === 'ERROR') {
        worker.removeEventListener('message', handleMessage)
        reject(new Error(payload))
      }
    }

    worker.addEventListener('message', handleMessage)
    worker.postMessage({ type: 'COMPRESS', id, payload: blob })
  })
}
