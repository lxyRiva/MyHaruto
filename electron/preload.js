// 桥梁：把主进程的数据读写能力安全暴露给界面
const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('myharuto', {
  getDb: () => ipcRenderer.invoke('db:get'),
  saveDb: (db) => ipcRenderer.invoke('db:save', db),
})
