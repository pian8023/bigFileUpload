<template>
  <div class="container">
    <el-upload class="upload-demo" drag multiple :limit="3" :auto-upload="false" :file-list="fileList" :on-change="uploadChange">
      <el-icon class="el-icon--upload"><upload-filled /></el-icon>
      <div class="el-upload__text">Drop file here or <em>click to upload</em></div>
    </el-upload>

    <el-button type="primary" @click="handleUpload"> 上传 </el-button>
    <el-button type="primary" @click="pauseUpload"> {{ isPaused ? '暂停' : '继续' }} </el-button>
  </div>

  <div v-show="fileList.length">
    <h3>上传总进度</h3>
    <el-progress :percentage="uploadPercentage" style="margin-bottom: 20px"></el-progress>

    <el-table :data="fileList" style="width: 1000px" border>
      <el-table-column prop="name" label="名字"> </el-table-column>
      <el-table-column prop="size" label="大小" width="90" :formatter="(row, column, value) => prettsize(value)"> </el-table-column>
      <el-table-column prop="percentage" label="进度">
        <template #default="scope">
          <el-progress :percentage="scope.row.percentage"></el-progress>
        </template>
      </el-table-column>

      <el-table-column prop="operate" label="操作" width="120">
        <template #default="scope">
          <el-icon class="el-icon"><VideoPlay /></el-icon>
          <el-icon class="el-icon"><VideoPause /></el-icon>
          <el-icon class="el-icon" @click.stop="handleDelete(scope.row.uid)"><Delete /></el-icon>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script setup lang="ts" name="Home">
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { UploadFilled } from '@element-plus/icons-vue'
import { CHUNK_SIZE } from '@/const'
import { createFileChunk, calculateHash } from '@/utils/file'
import { verifyFile, uploadChunks, mergeChunks } from '@/utils/api'
import prettsize from 'prettysize'

const fileList = ref([])
const fileHash = ref('')
const isPaused = ref(false)

const fileChunkList = ref([])
const currentFile = ref(null)
const unUploadChunks = ref([]) // 未上传的切片
let controller: AbortController | null = null

const uploadPercentage = computed(() => {
  if (!fileList.value.length) return 0
  const uploadedSize = fileChunkList.value.map((item) => item.size * item.percentage).reduce((acc, cur) => acc + cur, 0)
  return Math.floor(uploadedSize / currentFile.value.size)
})

const uploadChange = (file, files) => {
  console.log('file, files: ', file, files)
  currentFile.value = file
  fileList.value = files
}

watch(uploadPercentage, async (val) => {
  console.log('val: ', val)
  if (val == 100) {
    await mergeChunks({
      fileName: currentFile.value.name,
      fileHash: fileHash.value,
      chunkSize: CHUNK_SIZE,
    })
  }
})

const getProgress = (item) => {
  return (progressEvent) => {
    item.percentage = Math.floor((progressEvent.loaded / progressEvent.total) * 100)
  }
}

const handleUpload = async () => {
  if (!fileList.value.length) {
    ElMessage.warning('请选择文件')
    return
  }

  // 分片
  const chunkList = createFileChunk(currentFile.value.raw)
  // 计算hash
  fileHash.value = await calculateHash(chunkList)
  // 判断文件是否存在
  const { isExist, uploadedChunks } = await verifyFile({ fileHash: fileHash.value, fileName: currentFile.value.name })
  if (isExist) {
    ElMessage.success('文件已存在，秒传成功')
    return
  }

  fileChunkList.value = chunkList.map((file, index) => {
    const chunkHash = `${fileHash.value} - ${index}`
    return {
      fileHash: fileHash.value,
      chunkHash,
      index,
      chunk: file,
      size: file.size,
      percentage: uploadedChunks.includes(chunkHash) ? 100 : 0,
    }
  })

  if (controller) {
    controller = null
  }
  controller = new AbortController()
  unUploadChunks.value = fileChunkList.value.filter((chunk) => !uploadedChunks.includes(chunk.chunkHash))

  const formDatas = unUploadChunks.value.map((chunk) => {
    const formData = new FormData()
    Object.entries(chunk).forEach(([key, val]) => {
      formData.append(key, val)
    })

    return formData
  })

  const taskPool = formDatas.map(
    (formData, index: number) => () => uploadChunks(formData, getProgress(unUploadChunks.value[index]), controller.signal)
  )

  await concurRequest(taskPool, 6)

  // await mergeChunks({
  //   fileName: currentFile.value.name,
  //   fileHash:fileHash.value,
  //   chunkSize: CHUNK_SIZE,
  // })

  // await sendRequest(unUploadChunks.value)
}

// 控制请求发送以及上传错误处理
function sendRequest(chunks, max = 6) {
  return new Promise((resolve, reject) => {
    let counter = 0 // 发送成功的请求数
    const retryArr = []

    chunks.forEach((item) => (item.status = 1))

    const start = async () => {
      let Err = false

      while (counter < chunks.length && !isPaused.value && !Err) {
        // 创建请求列表
        let requestArr = []

        // 并发控制请求
        for (let i = 0; i < max; i++) {
          let idx = chunks.findIndex((item) => item.status === 1 || item.status === 2)
          if (idx === -1) {
            Err = true
            return
          }

          chunks[idx].status = 3

          requestArr.push(
            uploadChunks(chunks[idx], getProgress(chunks[idx]), controller.signal)
              .then(() => {
                chunks[idx].status = 3
                counter++
                if (counter === chunks.length) {
                  resolve(true)
                }
              })
              .catch((err) => {
                reject(err)
                chunks[idx].status = 4
                if (typeof retryArr[idx] !== 'number') {
                  ElMessage.info(`第 ${idx} 个片段上传失败，系统准备重试`)
                  retryArr[idx] = 0
                }

                // 次数累加
                retryArr[idx]++
                if (retryArr[idx] > 3) {
                  ElMessage.error(`第 ${idx} 个片段重试多次无效，系统准备放弃上传`)
                  chunks[idx].status = 4
                  chunks[idx].percentage = 0
                  // 终止当前所有请求
                  Err = true
                  requestArr.forEach((element) => {
                    controller.abort()
                  })
                  requestArr = []
                }
              })
          )

          await Promise.all(requestArr)
        }
      }
    }

    start()
  })
}

function pauseUpload() {}

// 控制请求并发
const concurRequest = (taskPool: Array<() => Promise<Response>>, max: number): Promise<Array<Response | unknown>> => {
  return new Promise((resolve) => {
    if (taskPool.length === 0) {
      resolve([])
      return
    }

    const results: Array<Response | unknown> = []
    let index = 0
    let count = 0

    const request = async () => {
      if (index === taskPool.length) return
      const i = index
      const task = taskPool[index]
      index++
      try {
        results[i] = await task()
      } catch (err) {
        results[i] = err
      } finally {
        count++
        if (count === taskPool.length) {
          resolve(results)
        }
        request()
      }
    }

    const times = Math.min(max, taskPool.length)
    for (let i = 0; i < times; i++) {
      request()
    }
  })
}

const handleDelete = (uid: number) => {
  const index = fileList.value.findIndex((file) => file.uid === uid)
  fileList.value.splice(index, 1)
}
</script>

<style lang="less" scoped>
.container {
  width: 600px;
}

.el-icon {
  font-size: 20px;
  margin: 0 4px;
  cursor: pointer;
}
</style>
