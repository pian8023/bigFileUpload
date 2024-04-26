<template>
  <div>{{ fileStore.name }}</div>
  <el-button @click="handleUpload">Default</el-button>
</template>

<script setup lang="ts" name="Home">
import { onMounted, ref } from 'vue'
import useFileStore from '@/store/modules/file'
import { get, post } from '@/utils/api'

const fileStore = useFileStore()

const fileList = ref([])

onMounted(async () => {
  // try {
  //   const response = await post('/users', { name: 'John', age: 30 })
  //   console.log(response.data)
  // } catch (error) {
  //   console.error(error)
  // }
})

async function handleUpload() {
  try {
    const response = await get('/upload')
    console.log(response.data)
  } catch (error) {
    console.error(error)
  }
}
</script>
