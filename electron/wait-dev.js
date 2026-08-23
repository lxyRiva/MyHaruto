// 等待界面引擎(vite)就绪后启动 Electron 窗口（替代 wait-on，逻辑直白可调试）
const { spawn } = require('child_process')
const http = require('http')

const URL_DEV = 'http://127.0.0.1:5173'

function tryLoad() {
  http
    .get(URL_DEV, (res) => {
      res.resume() // 丢弃响应体，只看状态码
      if (res.statusCode > 0) start()
      else retry()
    })
    .on('error', retry)
}

function retry() {
  setTimeout(tryLoad, 400)
}

function start() {
  const electronPath = require('electron') // node_modules/electron 模块导出可执行文件路径
  const child = spawn(electronPath, ['.'], {
    stdio: 'inherit',
    env: { ...process.env, VITE_DEV_SERVER_URL: URL_DEV },
  })
  child.on('exit', (code) => process.exit(code ?? 0))
}

tryLoad()
