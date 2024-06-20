export interface VertifyParams {
  fileName: string
  fileHash: string
}

export interface MergeParams {
  fileName: string
  fileHash: string
  chunkSize: number
}

export interface ChunkItem {
  fileHash: string
  chunkHash: string
  index: number
  chunk: Blob
  size: number
}
