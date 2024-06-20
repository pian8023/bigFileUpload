class DBStorage {
  db: IDBDatabase | null
  dbName: string
  dbVersion: number

  constructor(dbName: string, dbVersion: number = 1.0) {
    this.db = null
    this.dbName = dbName
    this.dbVersion = dbVersion
  }

  initDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = window.indexedDB.open(this.dbName, this.dbVersion)
      // 打开或创建数据库出错时触发
      request.onerror = (event) => {
        reject((event.target as IDBRequest).error)
      }
      // 成功打开或创建数据库时触发
      request.onsuccess = (event) => {
        this.db = (event.target as IDBRequest).result
        resolve((event.target as IDBRequest).result)
      }
      // 数据库版本发生变化时触发
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBRequest).result
        if (!db.objectStoreNames.contains('chunks')) {
          db.createObjectStore('chunks', {
            keyPath: 'name',
          })
          db.createObjectStore('fileHash', {
            keyPath: 'name',
          })
        }
      }
    })
  }

  getStore(storeName: string, operationMode: IDBTransactionMode) {
    return this.db?.transaction(storeName, operationMode)?.objectStore(storeName)
  }

  getItem(storeName: string, key: string) {
    return new Promise((resolve, reject) => {
      const store = this.getStore(storeName, 'readonly')
      const req = store.get(key)
      req.onsuccess = (event) => {
        resolve((event.target as IDBRequest).result)
      }
      req.onerror = (event) => {
        reject((event.target as IDBRequest).error)
      }
    })
  }

  setItem(storeName: string, data: string | object) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite')
      const objectStore = transaction.objectStore(storeName)
      const req = objectStore.put(data)
      req.onsuccess = (event) => {
        resolve((event.target as IDBRequest).result)
      }
      req.onerror = (event) => {
        reject((event.target as IDBRequest).error)
      }
    })
  }

  addItem(storeName: string, data: string | object) {
    return new Promise((resolve, reject) => {
      const store = this.getStore(storeName, 'readwrite')
      const req = store.add(data)
      req.onsuccess = (event) => {
        resolve((event.target as IDBRequest).result)
      }
      req.onerror = (event) => {
        reject((event.target as IDBRequest).error)
      }
    })
  }

  removeItem(storeName: string, key: string) {
    return new Promise((resolve, reject) => {
      const store = this.getStore(storeName, 'readwrite')
      const req = store.delete(key)
      req.onsuccess = (event) => {
        resolve((event.target as IDBRequest).result)
      }
      req.onerror = (event) => {
        reject((event.target as IDBRequest).error)
      }
    })
  }

  readAll(storeName: string) {
    return new Promise((resolve, reject) => {
      const store = this.getStore(storeName, 'readwrite')
      store.openCursor().onsuccess = (event) => {
        const cursor = event.target.result
        if (cursor) {
          console.log('读取数据成功：', cursor.value)
          // 游标没有遍历完则继续遍历
          cursor.continue()
        } else {
          // 如果全部遍历完毕...
          resolve(event.target.result)
        }

        store.openCursor().onerror = (event) => {
          reject(event.target.error)
        }
      }
    })
  }
}

const indexedDB = new DBStorage('fileDataBase')
export default indexedDB
