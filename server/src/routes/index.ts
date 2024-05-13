import Router from 'koa-router'
import { koaBody } from 'koa-body'
import uploadController from '../controllers/upload'
import mergeController from '../controllers/merge'
import vertifyController from '../controllers/vertify'
import deleteController from '../controllers/delete'

const router = new Router()
router.prefix('/api')

router.get('/', (ctx, next) => {
  ctx.body = 'Hello, Koa with TypeScript!'
})

router.post('/upload', koaBody({ multipart: true }), uploadController)
router.post('/merge', mergeController)
router.get('/vertify', vertifyController)
router.delete('/delete', deleteController)

export default router