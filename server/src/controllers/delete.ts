import type { Context } from 'koa'
import path from 'path'
import { existsSync, removeSync, unlinkSync } from 'fs-extra'
import { UPLOAD_DIR } from '../const'

const deleteController = (ctx: Context) => {
  const { fileName, fileHash } = ctx.request.query as {
    fileName: string
    fileHash: string
  }
  const suffix = path.extname(fileName)
  const filePath = path.resolve(UPLOAD_DIR, `${fileHash}${suffix}`)
  const chunkDir = path.resolve(UPLOAD_DIR, `${fileHash}-chunks`)

  if (existsSync(filePath) || existsSync(chunkDir)) {
    if (existsSync(filePath)) {
      unlinkSync(filePath)
    } else {
      removeSync(chunkDir)
    }
    ctx.body = {
      code: 200,
      msg: '文件删除成功',
    }
  } else {
    ctx.body = { code: 200, msg: '文件不存在' }
  }
}

export default deleteController
