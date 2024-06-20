import type { Context } from 'koa'
import path from 'path'
import { existsSync, mkdirSync, moveSync } from 'fs-extra'
import { UPLOAD_DIR } from '../const'

const fileUploadController = (ctx: Context) => {
  const { fileHash, chunkHash } = ctx.request.body
  const chunkFile = ctx.request.files?.chunk
  if (!chunkFile || Array.isArray(chunkFile)) {
    throw new Error('上传无效的文件切片')
  }
  const chunkDir = path.resolve(UPLOAD_DIR, `${fileHash}-chunks`)

  if (!existsSync(chunkDir)) {
    mkdirSync(chunkDir, { recursive: true })
  }

  // 如果临时文件夹里不存在该分片，则将用户上传的分片移到临时文件夹里
  const chunkPath = path.resolve(chunkDir, chunkHash)
  if (!existsSync(chunkPath)) {
    moveSync(chunkFile.filepath, chunkPath)
  }

  ctx.body = {
    code: 200,
    msg: '上传成功',
  }
}

export default fileUploadController
