import axios, { AxiosInstance, GenericAbortSignal, AxiosProgressEvent } from 'axios'
import type { VertifyParams, MergeParams, ChunkItem } from '@/types'

const axiosInstance: AxiosInstance = axios.create({
  baseURL: '/api',
  timeout: 10 * 1000,
})

// 添加请求拦截器
axiosInstance.interceptors.request.use(
  (config) => {
    // 在发送请求之前做些什么
    return config
  },
  (error) => {
    // 处理请求错误
    return Promise.reject(error)
  }
)

// 添加响应拦截器
axiosInstance.interceptors.response.use(
  (response) => {
    // 对响应数据做点什么
    return response
  },
  (error) => {
    // 处理响应错误
    return Promise.reject(error)
  }
)

export const verifyFile = async (params: VertifyParams) => {
  const res = await axiosInstance.get('/vertify', {
    params,
  })
  return res.data.data
}

export const uploadChunks = async (chunk: ChunkItem, onUploadProgress?: (progressEvent: AxiosProgressEvent) => void, signal?: GenericAbortSignal) => {
  const formData = new FormData()
  Object.entries(chunk).forEach(([key, val]) => {
    formData.append(key, val)
  })

  const res = await axiosInstance({
    url: '/upload',
    method: 'POST',
    data: formData,
    headers: {
      'Content-type': 'multipart/form-data;charset=UTF-8',
    },
    onUploadProgress,
    signal,
  })
  return res.data.data
}

export const mergeChunks = async (params: MergeParams) => {
  const res = await axiosInstance.post('/merge', params)
  return res.data.data
}

export const deleteFile = async (params: VertifyParams) => {
  const res = await axiosInstance.delete('/delete', {
    params,
  })
  return res.data.data
}
