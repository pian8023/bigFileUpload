import type { Context } from 'koa'
import path from 'path'
import { createReadStream, createWriteStream, readdirSync, unlinkSync, rmdirSync, rm } from 'fs-extra'

// 文件上传目录
const UPLOAD_DIR = path.resolve(__dirname, '../../node_modules/.cache')

const pipeStream = (path, writeStream) =>
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

async function mergeFileChunk(filePath, chunkDir, size) {
  // 读取所有切片
  const chunkPaths = readdirSync(chunkDir)
  // 切片排序
  chunkPaths.sort((a, b) => a.split('-')[1] - b.split('-')[1])
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
  // rmdirSync(chunkDir, { recursive: true }) // 合并后删除保存切片的目录
  await rm(chunkDir, { recursive: true }) // 合并后删除保存切片的目录
}

const mergeController = async (ctx: Context) => {
  const { fileName, fileHash, chunkSize } = ctx.request.body
  const suffix = path.extname(fileName)
  const filePath = path.resolve(UPLOAD_DIR, `${fileHash}${suffix}`)
  const chunkDir = path.resolve(UPLOAD_DIR, `${fileHash}-chunks`)

  /* // 读取所有切片
  const chunkPaths = readdirSync(chunkDir)
  // 切片排序
  chunkPaths.sort((a, b) => a.split('-')[1] - b.split('-')[1])

  const pool = chunkPaths.map(
    (chunk, index) =>
      new Promise((resolve) => {
        // 创建可写流
        const writeStream = createWriteStream(filePath, {
          start: index * chunkSize,
        })
        // 创建可读流
        const chunkPath = path.resolve(chunkDir, chunk)
        const readStream = createReadStream(chunkPath)
        readStream.on('end', () => {
          // 删除切片文件
          unlinkSync(chunkPath)
          resolve(true)
        })
        readStream.pipe(writeStream)
      })
  )
  await Promise.all(pool)

  // 合并后删除保存切片的目录
  rmdirSync(chunkDir, { recursive: true }) */

  mergeFileChunk(filePath, chunkDir, chunkSize)

  ctx.body = {
    code: 200,
    msg: '合并成功',
  }
}

export default mergeController