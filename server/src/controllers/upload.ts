import type { Context } from 'koa'
import path from 'path'
import { existsSync, mkdirSync, moveSync } from 'fs-extra'

// 文件上传目录
const UPLOAD_DIR = path.resolve(__dirname, '../../node_modules/.cache')

const fileUploadController = (ctx: Context) => {
  const { fileHash, chunkHash } = ctx.request.body
  const { filepath } = ctx.request.files?.chunk
  console.log('filepath: ', filepath)
  const chunkDir = path.resolve(UPLOAD_DIR, `${fileHash}-chunks`)
  console.log('chunkDir: ', chunkDir)

  if (!existsSync(chunkDir)) {
    mkdirSync(chunkDir, { recursive: true })
  }

  // 如果临时文件夹里不存在该分片，则将用户上传的分片移到临时文件夹里
  const chunkPath = path.resolve(chunkDir, chunkHash)
  console.log('chunkPath: ', chunkPath)
  if (!existsSync(chunkPath)) {
    moveSync(filepath, chunkPath)
  }

  ctx.body = {
    code: 200,
    msg: '上传成功',
  }
}

export default fileUploadController
