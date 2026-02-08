const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const upscaleHandler = require('./src/services/upscaleService'); // ✅
const path = require('path')

// ==========================================================
// ✅✅✅ 【核心修复】FFmpeg 路径修正逻辑
// ==========================================================
let ffmpegPath = require('ffmpeg-static');
const ffmpeg = require('fluent-ffmpeg');

if (app.isPackaged) {
  ffmpegPath = ffmpegPath.replace('app.asar', 'app.asar.unpacked');
}
ffmpeg.setFfmpegPath(ffmpegPath);

try {
    let ffprobePath = require('ffprobe-static').path;
    if (app.isPackaged) {
        ffprobePath = ffprobePath.replace('app.asar', 'app.asar.unpacked');
    }
    ffmpeg.setFfprobePath(ffprobePath);
} catch (e) {
    console.log('未检测到 ffprobe-static，跳过配置');
}

console.log('✅ FFmpeg 路径已修正为:', ffmpegPath);
// ==========================================================


// ✅ 引入业务处理模块
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

  win.loadFile('src/index.html')
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

  // ✅ 监听视频转换
  ipcMain.handle('convert-video', async (event, filePath, outputDir) => {
    const result = await videoHandler.convertToMp4(filePath, outputDir);
    return result;
  });

  ipcMain.handle('convert-video-muted', async (event, filePath, outputDir) => {
    const result = await videoHandler.convertToMutedMp4(filePath, outputDir);
    return result;
  });

  // ✅ 监听音频转换
  ipcMain.handle('convert-audio', async (event, filePath, outputDir) => {
    const result = await audioHandler.convertToMp3(filePath, outputDir);
    return result;
  });

  // ✅ 监听文件压缩/解压
  ipcMain.handle('zip-compress', async (event, filePaths, outputDir) => {
    const result = await zipHandler.compressFiles(filePaths, outputDir);
    return result;
  });

  ipcMain.handle('zip-extract', async (event, zipPath, outputDir) => {
    const result = await zipHandler.extractZip(zipPath, outputDir);
    return result;
  });

  // ✅ 监听文件瘦身
  ipcMain.handle('slim-file', async (event, filePath, mode, outputDir) => {
    const result = await slimHandler.slimFile(filePath, mode, outputDir);
    return result;
  });

  // ==========================================
  // ✅ 修改：监听 AI 画质增强请求 (接收 modelType)
  // ==========================================
  ipcMain.handle('upscale-image', async (event, filePath, outputDir, modelType) => {
    // 将 modelType 透传给 Service
    const result = await upscaleHandler.upscaleImage(filePath, outputDir, modelType);
    return result;
  });
  
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})