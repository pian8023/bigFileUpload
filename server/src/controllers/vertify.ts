import type { Context } from 'koa'
import path from 'path'
import { existsSync, readdirSync } from 'fs-extra'
import { UPLOAD_DIR } from '../const'

const vertifyController = (ctx: Context) => {
  const { fileName, fileHash } = ctx.request.query as {
    fileName: string
    fileHash: string
  }
  const suffix = path.extname(fileName)
  const filePath = path.resolve(UPLOAD_DIR, `${fileHash}${suffix}`)

  if (existsSync(filePath)) {
    ctx.body = {
      code: 200,
      msg: '文件已存在',
      data: { isExist: true },
    }
  } else {
    const chunkDir = path.resolve(UPLOAD_DIR, `${fileHash}-chunks`)
    const uploadedList = existsSync(chunkDir) ? readdirSync(chunkDir) : []
    ctx.body = {
      code: 200,
      msg: '文件不存在',
      data: { isExist: false, uploadedList },
    }
  }
}

export default vertifyController
