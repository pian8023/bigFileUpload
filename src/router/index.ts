import { RouteRecordRaw, createRouter, createWebHistory } from 'vue-router'

const routes: Array<RouteRecordRaw> = [
  { path: '/', redirect: '/bigFile' },
  { path: '/bigFile', name: 'bigFile', component: () => import('@/views/big-file.vue') },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
