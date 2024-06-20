import Router from 'koa-router'
import { koaBody } from 'koa-body'
import uploadController from '../controllers/upload'
import mergeController from '../controllers/merge'
import vertifyController from '../controllers/vertify'
import deleteController from '../controllers/delete'
import { API_DELETE, API_MERGE, API_UPLOAD, API_VERTIFY } from '../const'

const router = new Router()
router.prefix('/api')

router.get('/', (ctx) => {
  ctx.body = 'Hello, Koa with TypeScript!'
})

router.post(API_UPLOAD, koaBody({ multipart: true }), uploadController)
router.post(API_MERGE, mergeController)
router.get(API_VERTIFY, vertifyController)
router.delete(API_DELETE, deleteController)

export default router
