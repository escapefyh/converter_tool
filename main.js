const { app, BrowserWindow, ipcMain, dialog } = require('electron')
// ... 其他引入 ...
const upscaleHandler = require('./src/services/upscaleService'); // ✅ 新增这一行
const path = require('path')

// ==========================================================
// ✅✅✅ 【核心修复】FFmpeg 路径修正逻辑 (开始)
// 必须放在 require 你的业务服务(services) 之前
// ==========================================================
let ffmpegPath = require('ffmpeg-static');
const ffmpeg = require('fluent-ffmpeg');

// 关键逻辑：如果是打包后的环境 (生产环境)
// Electron 会把文件压缩进 app.asar，但 .exe 不能在压缩包里运行
// 我们在 package.json 配置了 asarUnpack，所以真正的文件在 app.asar.unpacked 里
// 这里我们需要手动修正路径，把 'app.asar' 替换为 'app.asar.unpacked'
if (app.isPackaged) {
  ffmpegPath = ffmpegPath.replace('app.asar', 'app.asar.unpacked');
}

// 告诉 fluent-ffmpeg 全局使用这个正确的路径
ffmpeg.setFfmpegPath(ffmpegPath);

// (可选) 如果你用了 ffprobe，最好也加上这一段，防止以后报错
try {
    let ffprobePath = require('ffprobe-static').path;
    if (app.isPackaged) {
        ffprobePath = ffprobePath.replace('app.asar', 'app.asar.unpacked');
    }
    ffmpeg.setFfprobePath(ffprobePath);
} catch (e) {
    // 如果没安装 ffprobe-static 插件，这就忽略
    console.log('未检测到 ffprobe-static，跳过配置');
}

console.log('✅ FFmpeg 路径已修正为:', ffmpegPath);
// ==========================================================
// 🚀 FFmpeg 路径修正逻辑 (结束)
// ==========================================================


// ✅ 引入业务处理模块 (确保这些文件内部使用的是 require('fluent-ffmpeg'))
const imageHandler = require('./src/services/imageService')
const pdfHandler = require('./src/services/pdfService')
const videoHandler = require('./src/services/videoService')
const audioHandler = require('./src/services/audioService')
const zipHandler = require('./src/services/zipService')
const slimHandler = require('./src/services/slimService')

function createWindow () {
  const win = new BrowserWindow({
    width: 900,
    height: 700,
    icon: path.join(__dirname, 'assets', 'icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  // ✅ 告诉 Electron 去 src 文件夹里找界面
  win.loadFile('src/index.html')
  
  // win.webContents.openDevTools() // 开发调试用
}

app.whenReady().then(() => {
  createWindow()

  // ✅ 监听“选择文件夹”
  ipcMain.handle('select-folder', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory']
    });
    if (!result.canceled) {
      return result.filePaths[0];
    }
    return null;
  });

  // ✅ 监听图片转换请求
  ipcMain.handle('convert-image', async (event, filePath, targetFormat, outputDir) => {
    const result = await imageHandler.convertImage(filePath, targetFormat, outputDir);
    return result;
  });

  // ✅ 监听 PDF 转换请求
  ipcMain.handle('convert-to-pdf', async (event, filePath, outputDir) => {
    const result = await pdfHandler.convertToPdf(filePath, outputDir);
    return result;
  });

  // ✅ 监听视频转换（普通 MP4）
  ipcMain.handle('convert-video', async (event, filePath, outputDir) => {
    const result = await videoHandler.convertToMp4(filePath, outputDir);
    return result;
  });

  // ✅ 监听视频转换（静音 MP4）
  ipcMain.handle('convert-video-muted', async (event, filePath, outputDir) => {
    const result = await videoHandler.convertToMutedMp4(filePath, outputDir);
    return result;
  });

  // ✅ 监听音频转换为 MP3
  ipcMain.handle('convert-audio', async (event, filePath, outputDir) => {
    const result = await audioHandler.convertToMp3(filePath, outputDir);
    return result;
  });

  // ✅ 监听文件压缩
  ipcMain.handle('zip-compress', async (event, filePaths, outputDir) => {
    const result = await zipHandler.compressFiles(filePaths, outputDir);
    return result;
  });

  // ✅ 监听文件解压
  ipcMain.handle('zip-extract', async (event, zipPath, outputDir) => {
    const result = await zipHandler.extractZip(zipPath, outputDir);
    return result;
  });

  // ✅ 监听文件瘦身（图片/视频/音频/PDF）
  ipcMain.handle('slim-file', async (event, filePath, mode, outputDir) => {
    const result = await slimHandler.slimFile(filePath, mode, outputDir);
    return result;
  });

  // ✅ 新增：监听 AI 画质增强请求
  ipcMain.handle('upscale-image', async (event, filePath, outputDir) => {
    const result = await upscaleHandler.upscaleImage(filePath, outputDir);
    return result;
  });
  
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})