import { CHUNK_SIZE } from '../const'
import webWorker from './webWorker.ts?worker'

export const createFileChunk = (file: File) => {
  const fileChunkList = []
  let cur = 0
  while (cur < file.size) {
    fileChunkList.push(file.slice(cur, cur + CHUNK_SIZE))
    cur += CHUNK_SIZE
  }

  return fileChunkList
}

export const calculateHash = (fileChunkList): Promise<string> => {
  return new Promise((resolve, reject) => {
    const worker = new webWorker()
    worker.postMessage(fileChunkList)

    worker.onmessage = (e) => {
      resolve(e.data)
      if (e.data === 'ended') {
        worker.terminate() // 终止操作
      }
    }

    worker.onerror = (e) => {
      reject(e)
    }
  })
}
