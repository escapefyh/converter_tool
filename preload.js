const { contextBridge, ipcRenderer, webUtils } = require('electron')

contextBridge.exposeInMainWorld('api', {
  // 1. 获取文件真实路径 (Electron 核心功能)
  getFilePath: (file) => webUtils.getPathForFile(file),

  // 2. 【新增】选择文件夹接口
  selectFolder: () => ipcRenderer.invoke('select-folder'),

  // 3. 【修改】图片转换接口 (支持传递 outputDir)
  convertImage: (filePath, targetFormat, outputDir) => 
    ipcRenderer.invoke('convert-image', filePath, targetFormat, outputDir),

  // 4. PDF 转换接口
  convertToPdf: (filePath, outputDir) => 
    ipcRenderer.invoke('convert-to-pdf', filePath, outputDir),

  // 5. 视频转换（普通 MP4，保留声音）
  convertVideo: (filePath, outputDir) =>
    ipcRenderer.invoke('convert-video', filePath, outputDir),

  // 6. 视频转换（静音 MP4）
  convertVideoMuted: (filePath, outputDir) =>
    ipcRenderer.invoke('convert-video-muted', filePath, outputDir),

  // 7. 音频转换为 MP3
  convertAudio: (filePath, outputDir) =>
    ipcRenderer.invoke('convert-audio', filePath, outputDir),

  // 8. 文件压缩
  zipCompress: (filePaths, outputDir) =>
    ipcRenderer.invoke('zip-compress', filePaths, outputDir),

  // 9. 文件解压
  zipExtract: (zipPath, outputDir) =>
    ipcRenderer.invoke('zip-extract', zipPath, outputDir),

  // 10. 文件瘦身（图片/视频/音频/PDF）
  slimFile: (filePath, mode, outputDir) =>
    ipcRenderer.invoke('slim-file', filePath, mode, outputDir),

  // ✅ 新增：AI 画质增强接口
  upscaleImage: (filePath, outputDir) =>
    ipcRenderer.invoke('upscale-image', filePath, outputDir)
})