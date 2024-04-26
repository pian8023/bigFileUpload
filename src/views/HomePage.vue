<template>
  <div>{{ fileStore.name }}</div>
</template>

<script setup lang="ts" name="Home">
import useFileStore from '@/store/modules/file'

const fileStore = useFileStore()
</script>
