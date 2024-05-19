<!-- 给你加个越苏吧，这个文件的代码行数不要超过 100 -->
<template>
  <div class="container">
    <el-upload
      class="upload-demo"
      drag
      :auto-upload="false"
      :multiple="false"
      :limit="1"
      :file-list="fileList"
      :on-exceed="handleExceed"
      :on-change="uploadChange"
    >
      <el-icon class="el-icon--upload"><upload-filled /></el-icon>
      <div class="el-upload__text">Drop file here or <em>click to upload</em></div>

      <!-- <template #tip>
        <div class="el-upload__tip">limit 3 file, new file will cover the old file</div>
      </template> -->
    </el-upload>

    <el-button type="primary" @click="handleUploadFile"> 上传 </el-button>
    <el-button type="primary" @click="pauseUploadFile" v-if="uploadPercentage && uploadPercentage !== 100">
      {{ isPaused ? '恢复' : '暂停' }}
    </el-button>
  </div>

  <div v-show="fileList.length">
    <!-- 这块代码建议拆出去，作为独立组件 -->
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
          <!-- <el-icon class="el-icon" @click.stop="handleSingleUpload(scope.row)">
            <Upload />
          </el-icon>
          <el-icon class="el-icon" v-if="scope.row.percentage && scope.row.percentage !== 100"><VideoPause /></el-icon> -->
          <el-icon class="el-icon" @click.stop="handleDelete(scope.row)"><Delete /></el-icon>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script setup lang="ts" name="Home">
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import type { UploadProps } from 'element-plus'
import { UploadFilled } from '@element-plus/icons-vue'
import { CHUNK_SIZE } from '@/const'
import { createFileChunk, calculateHash } from '@/utils/file'
import { verifyFile, uploadChunks, mergeChunks, deleteFile } from '@/utils/api'
import prettsize from 'prettysize'
// 这个包并没有用到啊
import JSZip from 'jszip'

// 状态太多了，拆
const fileList = ref([])
const fileHash = ref('')
const isPaused = ref(false)

const fileChunkList = ref([])
const currentFile = ref(null)
const unUploadChunks = ref([]) // 未上传的切片
let controller: AbortController | null = null

const handleExceed: UploadProps['onExceed'] = (files, uploadFiles) => {
  // 既然限制了上传文件数量，对超限的文件应该在前端进行拦截，不生成对应的 file 对象，避免上传操作
  ElMessage.warning(`The limit is 3, you selected ${files.length} files this time, add up to ${files.length + uploadFiles.length} totally`)
}

const uploadPercentage = computed(() => {
  if (!fileList.value.length || !fileChunkList.value.length) return 0
  const uploadedSize = fileChunkList.value.map((item) => item.size * item.percentage).reduce((acc, cur) => acc + cur, 0)
  return Math.floor(uploadedSize / currentFile.value.size)
})

const uploadChange = (file, files) => {
  console.log('file, files: ', file, files)
  // 这可能导致正在上传的文件丢失进度把？如果允许多文件上传，这里需要优化
  resetData()
  currentFile.value = file
  fileList.value = files
}

watch(uploadPercentage, async (val) => {
  if (val === 100) {
    await mergeChunks({
      fileName: currentFile.value.name,
      fileHash: fileHash.value,
      chunkSize: CHUNK_SIZE,
    })
  }
})

const getProgress = (item: { percentage: number }) => {
  return (progressEvent: { loaded: number; total: number }) => {
    item.percentage = Math.floor((progressEvent.loaded / progressEvent.total) * 100)
  }
}

// 这段逻辑很啰嗦，抽出去
const handleUploadFile = async () => {
  if (!fileList.value.length) {
    ElMessage.warning('请选择文件')
    return
  }

  resetData()

  /*   const zip = new JSZip()
  zip.file(currentFile.value.name, currentFile.value, { binary: true })
  const zipBlob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: {
      level: 5,
    },
  }) */

  // 分片
  const chunkList = createFileChunk(currentFile.value.raw)
  // 计算hash
  fileHash.value = await calculateHash(chunkList)
  // 判断文件是否存在
  const { isExist, uploadedList } = await verifyFile({ fileHash: fileHash.value, fileName: currentFile.value.name })
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
      percentage: uploadedList.includes(chunkHash) ? 100 : 0,
    }
  })

  /* const formDatas = unUploadChunks.value.map((chunk) => {
    const formData = new FormData()
    Object.entries(chunk).forEach(([key, val]) => {
      formData.append(key, val)
    })

    return formData
  })

  const taskPool = formDatas.map((formData, index) => {
    return () => {
      if (controller) {
        controller = null
      }
      controller = new AbortController()
      return uploadChunks(formData, getProgress(unUploadChunks.value[index]), controller.signal)
    }
  })

  await concurRequest(taskPool, 6) */

  unUploadChunks.value = fileChunkList.value.filter((chunk) => !uploadedList.includes(chunk.chunkHash))
  await sendRequest(unUploadChunks.value)
}

// 控制请求发送以及上传错误处理
const sendRequest = (chunks, max = 6) => {
  // 并发控制是很独立的逻辑，抽出去
  return new Promise((resolve, reject) => {
    let counter = 0 // 发送成功的请求数
    const retryArr: never[] = []

    chunks.forEach((item: { status: number }) => (item.status = 1))

    const start = async () => {
      let Err = false

      while (counter < chunks.length && !isPaused.value && !Err) {
        // 创建请求列表
        let requestArr = []

        // 并发控制请求
        for (let i = 0; i < max; i++) {
          let idx = chunks.findIndex((item: { status: number }) => item.status === 1 || item.status === 2)
          if (idx === -1) {
            Err = true
            return
          }

          chunks[idx].status = 3

          if (controller) {
            controller = null
          }
          controller = new AbortController()

          requestArr.push(
            uploadChunks(chunks[idx], getProgress(chunks[idx]), controller.signal)
            // 用 async-await
              .then(() => {
                chunks[idx].status = 3
                counter++
                if (counter === chunks.length) {
                  resolve(true)
                }
              })
              .catch((err) => {
                reject(err)
                chunks[idx].status = 2
                if (typeof retryArr[idx] !== 'number') {
                  ElMessage.info(`第 ${idx + 1} 个片段上传失败，系统准备重试`)
                  retryArr[idx] = 0
                }

                // 次数累加
                retryArr[idx]++
                if (retryArr[idx] > 3) {
                  ElMessage.error(`第 ${idx + 1} 个片段重试多次无效，系统准备放弃上传`)
                  chunks[idx].status = 4
                  chunks[idx].percentage = 0
                  // 终止当前所有请求
                  Err = true
                  controller.abort()
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

// 控制请求并发
// 这个函数并没有用到
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

const pauseUploadFile = async () => {
  isPaused.value = !isPaused.value
  if (isPaused.value) {
    controller.abort()
    unUploadChunks.value = []
  } else {
    const { uploadedList } = await verifyFile({ fileHash: fileHash.value, fileName: currentFile.value.name })
    unUploadChunks.value = fileChunkList.value.filter((chunk) => !uploadedList.includes(chunk.chunkHash))
    await sendRequest(unUploadChunks.value)
  }
}

const handleDelete = async (file) => {
  const index = fileList.value.findIndex((item) => item.uid === file.uid)
  fileList.value.splice(index, 1)

  const chunkList = createFileChunk(file.raw)
  const hashValue = await calculateHash(chunkList)

  await deleteFile({ fileHash: hashValue, fileName: file.name })
}

// 这个函数也没用到
const handleSingleUpload = async (file) => {
  const chunkList = createFileChunk(file.raw)
  const hashValue = await calculateHash(chunkList)
  const { isExist, uploadedList } = await verifyFile({ fileHash: hashValue, fileName: file.name })
  if (isExist) {
    ElMessage.success('文件已存在，秒传成功')
    return
  }

  const fileChunkList = chunkList.map((file, index) => {
    const chunkHash = `${hashValue} - ${index}`
    return {
      fileHash: hashValue,
      chunkHash,
      index,
      chunk: file,
      size: file.size,
      percentage: uploadedList.includes(chunkHash) ? 100 : 0,
    }
  })
  const unUploadChunks = fileChunkList.filter((chunk) => !uploadedList.includes(chunk.chunkHash))
  await sendRequest(unUploadChunks)

  const uploadedSize = fileChunkList.map((item) => item.size * item.percentage).reduce((acc, cur) => acc + cur, 0)
  file.percentage = Math.floor(uploadedSize / file.size)

  if (file.percentage === 100) {
    await mergeChunks({
      fileName: file.name,
      fileHash: hashValue,
      chunkSize: CHUNK_SIZE,
    })
  }
}

// 频繁 resetdata 了，而且你这个是支持多文件并行上传的，reset 应该有问题
const resetData = () => {
  fileChunkList.value = []
  unUploadChunks.value = []
  fileHash.value = ''
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
