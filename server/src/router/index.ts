import { Context } from 'koa';
import Router from 'koa-router';
const router = new Router();

router.get('/findUserInfo/:username', async (ctx: Context) => {
  const { username } = ctx.params;
  ctx.body = `欢迎${username}`;
});

// post 请求
router.post('/addUser', async (ctx: Context) => {
  const { username } = ctx.request.body;
  ctx.body = `欢迎${username}`;
});

export default router;
