import SparkMD5 from 'spark-md5'

const readFile = (file: File) => {
  return new Promise((resolve, reject) => {
    const fileReader = new FileReader()
    fileReader.readAsArrayBuffer(file)

    fileReader.onload = function (e) {
      resolve((e.target as FileReader).result as ArrayBuffer)
    }

    fileReader.onerror = function (error) {
      reject(error)
    }
  })
}

self.onmessage = async (e) => {
  try {
    const spark = new SparkMD5.ArrayBuffer()

    const fileChunkList = e.data || []

    for (let i = 0; i < fileChunkList.length; i++) {
      const res = await readFile(fileChunkList[i])
      spark.append(res)
    }
    self.postMessage(spark.end())
  } catch (error) {
    self.postMessage({
      error,
    })
  }
}
