import { CHUNK_SIZE } from '@/const'
import webWorker from './webWorker.ts?worker'
import { UploadFile } from 'element-plus'
import { ChunkItem } from '@/types'
import { AxiosProgressEvent } from 'axios'

export const createFileChunk = (file: UploadFile) => {
  const fileChunkList = []
  let cur = 0
  while (cur < file.size!) {
    fileChunkList.push(file.raw!.slice(cur, cur + CHUNK_SIZE))
    cur += CHUNK_SIZE
  }

  return fileChunkList
}

export const calculateHash = (fileChunkList: Blob[]): Promise<string> => {
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

export const getProgress = (item: ChunkItem) => {
  return (progressEvent: AxiosProgressEvent) => {
    if (progressEvent.total === undefined) {
      progressEvent.total = progressEvent.bytes
    }
    item.percentage = Math.floor((progressEvent.loaded / progressEvent.total) * 100)
  }
}

// 并发控制
export const concurRequest = (
  taskPool: Array<() => Promise<void>>,
  onTick: (progress: number) => void,
  maxConcurrent = 6
): Promise<Array<Response | unknown>> => {
  return new Promise((resolve, reject) => {
    const total = taskPool.length
    if (total === 0) {
      onTick(100)
      resolve([])
      return
    }

    let counter = 0
    let processing = 0
    let isCancel = false
    const failList: Array<{ task: () => Promise<void>; retries: number }> = [] // 存储失败的任务和重试次数

    const start = async () => {
      if (isCancel) {
        return reject('canceled')
      } else if (counter === total) {
        onTick(100)
        resolve([])
        return
      } else if (failList.length) {
        // 如果有失败的任务且没有达到并发限制，则重试失败的任务
        const { task, retries } = failList.shift()!
        if (retries < 3) {
          // 如果重试次数没有超过限制，则重新放入 taskPool
          taskPool.push(() =>
            task().catch(() => {
              failList.push({ task, retries: retries + 1 })
            })
          )
        }
        return
      }

      while (taskPool.length && processing < maxConcurrent && !isCancel) {
        const task = taskPool.shift()!
        processing++

        task()
          .then(() => {
            counter++
            onTick(Math.floor((counter / total) * 100))
          })
          .catch((error) => {
            if (!failList.find((f) => f.task === task)) {
              // 确保任务不会被重复添加到 failList
              failList.push({ task, retries: 1 })
            }
            if (!isCancel && error.code === 'ERR_CANCELED') {
              isCancel = true
            }
          })
          .finally(() => {
            processing--
            start()
          })
      }
    }

    start()
  })
}
