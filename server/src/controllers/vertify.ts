import type { Context } from 'koa'
import path from 'path'
import { existsSync, readdirSync } from 'fs-extra'

// 文件上传目录
const UPLOAD_DIR = path.resolve(__dirname, '../../node_modules/.cache')

const vertifyController = (ctx: Context) => {
  const { fileName, fileHash } = ctx.request.query
  const suffix = path.extname(fileName)
  const filePath = path.resolve(UPLOAD_DIR, `${fileHash}${suffix}`)
  console.log('filePath: ', filePath)

  if (existsSync(filePath)) {
    ctx.body = {
      code: 200,
      data: { isExist: true },
    }
  } else {
    const chunkDir = path.resolve(UPLOAD_DIR, `${fileHash}-chunks`)
    const uploadedList = existsSync(chunkDir) ? readdirSync(chunkDir) : []
    ctx.body = {
      code: 200,
      data: { isExist: false, uploadedList },
    }
  }
}

export default vertifyController