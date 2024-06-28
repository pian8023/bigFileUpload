<template>
  <el-table :data="props.fileList" class="table" border>
    <el-table-column prop="name" label="名字"> </el-table-column>
    <el-table-column prop="size" label="大小" width="90" :formatter="(_row, _column, value) => prettsize(value)"> </el-table-column>
    <el-table-column prop="percentage" label="进度">
      <template #default="scope">
        <el-progress :percentage="scope.row.percentage"></el-progress>
      </template>
    </el-table-column>

    <el-table-column prop="operate" label="操作" width="120">
      <template #default="scope">
        <el-icon class="el-icon" @click.stop="handleUpload(scope.row)" v-if="scope.row.percentage < 100">
          <Upload />
        </el-icon>
        <el-icon class="el-icon" @click.stop="handlePause(scope.row)" v-if="scope.row.percentage > 0 && scope.row.percentage < 100">
          <VideoPause />
        </el-icon>
        <el-icon class="el-icon" @click.stop="handleDelete(scope.row)" v-if="scope.row.percentage > 0"><Delete /></el-icon>
      </template>
    </el-table-column>
  </el-table>
</template>

<script setup lang="ts">
import prettsize from 'prettysize'
import { ElMessage } from 'element-plus'
import type { UploadFile, UploadFiles } from 'element-plus'
// 应该是：
// import { type ChunkItem } from '@/types'
import { ChunkItem } from '@/types'
import { CHUNK_SIZE } from '@/const'
import { createFileChunk, calculateHash, concurRequest, getProgress } from '@/utils/file'
import { deleteFile, verifyFile, uploadChunks, mergeChunks } from '@/utils/api'
import indexedDB from '@/utils/storage'

const controllersMap = new Map<string | number, AbortController>()

const props = defineProps({
  fileList: {
    type: Array as () => UploadFiles,
    default: () => [],
  },
})

const handleUpload = async (file: UploadFile) => {
  // 分片
  const chunkList = createFileChunk(file)

  // 计算hash
  // 用 file name 来记录 hash，不太靠谱吧？
  const dbHash: any = await indexedDB.getItem('fileHash', file.name)
  let fileHash = ''
  if (dbHash) {
    fileHash = dbHash.hash
  } else {
    fileHash = await calculateHash(chunkList)
    await indexedDB.setItem('fileHash', {
      name: file.name,
      hash: fileHash,
    })
  }

  // 判断文件是否存在
  const { isExist, uploadedList } = await verifyFile({ fileHash, fileName: file.name })
  if (isExist) {
    file.percentage = 100
    ElMessage.success('文件已存在，秒传成功')
    return
  }

  const fileChunkList = chunkList.map((chunk, index) => {
    const chunkHash = `${fileHash} - ${index}`
    return {
      fileHash,
      chunkHash,
      index,
      chunk,
      size: chunk.size,
    }
  })
  // 未上传的分片
  const unUploadChunks = fileChunkList.filter((chunk) => !uploadedList.includes(chunk.chunkHash))

  uploadFileChunk(unUploadChunks, file, fileHash)
}

const uploadFileChunk = async (unUploadChunks: ChunkItem[], file: UploadFile, fileHash: string) => {
  const taskPool = unUploadChunks.map((chunk) => {
    return async () => {
      const controller = new AbortController()
      controllersMap.set(chunk.index, controller)

      await uploadChunks(chunk, getProgress(chunk), controller.signal)

      // indexedDB.addItem('chunks', {
      //   name: chunk.chunk,
      //   chunk,
      // })
      controllersMap.delete(chunk.index)
    }
  })

  const onTick = (progress: number) => {
    getPercentage(file, progress)
  }

  await concurRequest(taskPool, onTick)
  await mergeChunks({ fileName: file.name, fileHash, chunkSize: CHUNK_SIZE })
}

const handlePause = (file: UploadFile) => {
  file.status = 'ready'
  controllersMap.forEach((controller) => controller.abort())
}

// 这函数名字是 get，但内容确实有副作用的
const getPercentage = (file: UploadFile, progress: number) => {
  file.percentage = progress
}

const handleDelete = async (file: UploadFile) => {
  // 假如吧每一行都拆成单独组件，这里就不需要做 findIndex 操作了
  const index = props.fileList.findIndex((item) => item.uid === file.uid)
  props.fileList.splice(index, 1)

  // 难怪上面要缓存
  const chunkList = createFileChunk(file)
  const hashValue = await calculateHash(chunkList)

  await deleteFile({ fileHash: hashValue, fileName: file.name })
}
</script>

<style lang="less" scoped>
.table {
  width: 1000px;
  margin-top: 10px;
}
.el-icon {
  font-size: 20px;
  margin: 0 4px;
  cursor: pointer;
}
</style>
