import Koa from 'koa'
// import json from 'koa-json'
// import body from 'koa-body'
import Router from 'koa-router'
// import fileRouter from './src/router/index'

const app = new Koa()
const router = new Router()
// 路由前缀
router.prefix('/api')
// router.use(fileRouter.routes(), fileRouter.allowedMethods())
app.use(router.routes())

// app.use(json())
// app.use(body())

app.use(async (ctx) => {
  ctx.body = 'hello'
})

router.get('/upload', async (ctx: Koa.Context) => {
  ctx.body = 'upload';
});

app.listen(3000, () => {
  console.log(`Local: http://localhost:3000/`)
})
