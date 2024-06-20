import type { Context } from 'koa'
import path from 'path'
import { createReadStream, createWriteStream, readdirSync, unlinkSync, rm } from 'fs-extra'
import { UPLOAD_DIR } from '../const'

const pipeStream = (path: string, writeStream: NodeJS.WritableStream) =>
  new Promise((resolve) => {
    // 创建可读流
    const readStream = createReadStream(path)
    readStream.on('end', () => {
      // 删除切片文件
      unlinkSync(path)
      resolve(true)
    })
    readStream.pipe(writeStream)
  })

async function mergeFileChunk(filePath: string, chunkDir: string, size: number) {
  // 读取所有切片
  const chunkPaths = readdirSync(chunkDir)
  // 切片排序
  chunkPaths.sort((a, b) => Number(a.split('-')[1]) - Number(b.split('-')[1]))
  await Promise.all(
    chunkPaths.map((chunkPath, index) =>
      pipeStream(
        path.resolve(chunkDir, chunkPath),
        // 创建可写流
        createWriteStream(filePath, {
          start: index * size,
        })
      )
    )
  )
  await rm(chunkDir, { recursive: true }) // 合并后删除保存切片的目录
}

const mergeController = async (ctx: Context) => {
  const { fileName, fileHash, chunkSize } = ctx.request.body
  const suffix = path.extname(fileName)
  const filePath = path.resolve(UPLOAD_DIR, `${fileHash}${suffix}`)
  const chunkDir = path.resolve(UPLOAD_DIR, `${fileHash}-chunks`)

  mergeFileChunk(filePath, chunkDir, chunkSize)

  ctx.body = {
    code: 200,
    msg: '合并成功',
  }
}

export default mergeController
