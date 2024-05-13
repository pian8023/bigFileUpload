import type { Context } from 'koa'
import path from 'path'
import { existsSync, readdirSync, unlinkSync } from 'fs-extra'

// 文件上传目录
const UPLOAD_DIR = path.resolve(__dirname, '../../node_modules/.cache')

const deleteController = (ctx: Context) => {
  const { fileName, fileHash } = ctx.request.query
  const suffix = path.extname(fileName)
  const filePath = path.resolve(UPLOAD_DIR, `${fileHash}${suffix}`)

  if (existsSync(filePath)) {
    unlinkSync(filePath)
    ctx.body = {
      code: 200,
      msg: '文件删除成功',
    }
  } else {
    ctx.body = { code: 200, msg: '文件不存在' }
  }
}

export default deleteController
