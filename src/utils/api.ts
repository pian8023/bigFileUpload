import axiosInstance from './request'

export interface ApiResult<T> {
  code: number
  message: string
  data: T
}

// export async function get<T>(url: string, params?: any): Promise<ApiResult<T>> {
//   const response = await axiosInstance.get<ApiResult<T>>(url, { params })
//   return response.data
// }
// export async function post<T>(url: string, data?: any): Promise<ApiResult<T>> {
//   const response = await axiosInstance.post<ApiResult<T>>(url, data)
//   return response.data
// }

// export async function put<T>(url: string, data?: any): Promise<ApiResult<T>> {
//   const response = await axiosInstance.put<ApiResult<T>>(url, data)
//   return response.data
// }
// export async function del<T>(url: string, params?: any): Promise<ApiResult<T>> {
//   const response = await axiosInstance.delete<ApiResult<T>>(url, { params })
//   return response.data
// }

export const verifyFile = async (params) => {
  const res = await axiosInstance.get('/vertify', {
    params,
  })
  return res.data.data
}

export const uploadChunks = async (formData, onUploadProgress?, signal?) => {
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

export const mergeChunks = async (params) => {
  const res = await axiosInstance.post('/merge', params)
  return res.data.data
}
