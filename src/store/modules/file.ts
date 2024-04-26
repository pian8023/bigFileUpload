import { defineStore } from 'pinia'

// 第一个参数是应用程序中 store 的唯一 id
const useFileStore = defineStore('file', {
  state: () => {
    return {
      name: '上传文件',
    }
  },
})

export default useFileStore
