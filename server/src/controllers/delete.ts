import type { Context } from 'koa'
import path from 'path'
import { existsSync, unlinkSync } from 'fs-extra'
import { UPLOAD_DIR } from '../const'

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
