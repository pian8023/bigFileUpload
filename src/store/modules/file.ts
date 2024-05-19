import { defineStore } from 'pinia'

// 第一个参数是应用程序中 store 的唯一 id
// 看起来没用？
const useFileStore = defineStore('file', {
  state: () => {
    return {
      name: '大文件上传',
    }
  },
})

export default useFileStore
