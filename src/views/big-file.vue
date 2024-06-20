<template>
  <el-upload drag multiple :auto-upload="false" :limit="limitNum" :file-list="fileList" :on-exceed="handleExceed" :on-change="uploadChange">
    <el-icon class="el-icon--upload"><upload-filled /></el-icon>
    <div class="el-upload__text">Drop file here or <em>click to upload</em></div>

    <template #tip>
      <div class="el-upload__tip">大文件上传：limit 3 file</div>
    </template>
  </el-upload>

  <FileList :fileList="fileList" v-show="fileList.length"> </FileList>
</template>

<script setup lang="ts" name="bigFile">
import { ref, onMounted } from 'vue'
import { UploadFilled } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import type { UploadProps, UploadUserFile, UploadFile, UploadFiles } from 'element-plus'
import FileList from '@/components/file-list.vue'
import indexedDB from '@/utils/storage'

const fileList = ref<UploadFiles>([])
const limitNum = ref(3)

onMounted(async () => {
  await indexedDB.initDB()
})

const handleExceed: UploadProps['onExceed'] = (files: File[], uploadFiles: UploadUserFile[]) => {
  ElMessage.warning(
    `The limit is ${limitNum.value}, you selected ${files.length} files this time, add up to ${files.length + uploadFiles.length} totally`
  )
}

const uploadChange = (_file: UploadFile, files: UploadFiles) => {
  fileList.value = files
}
</script>
