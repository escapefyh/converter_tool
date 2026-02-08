// src/services/upscaleService.js
const { execFile } = require('child_process');
const path = require('path');
const { app } = require('electron');
const fs = require('fs');

/**
 * 获取 Real-ESRGAN 可执行文件的路径
 * 关键点：开发环境和打包后的环境路径不一样，这里自动判断
 */
function getBinaryPath() {
  if (app.isPackaged) {
    // 生产环境：会被打包到 resources/tools 目录下
    return path.join(process.resourcesPath, 'tools', 'realesrgan-ncnn-vulkan.exe');
  } else {
    // 开发环境：直接在根目录下的 tools 找
    return path.join(process.cwd(), 'tools', 'realesrgan-ncnn-vulkan.exe');
  }
}

async function upscaleImage(filePath, outputDir) {
  return new Promise((resolve, reject) => {
    try {
      const exePath = getBinaryPath();
      
      // 1. 检查工具是否存在
      if (!fs.existsSync(exePath)) {
        return reject(`找不到画质增强工具，路径错误: ${exePath}`);
      }

      // 2. 准备输出路径 (默认在文件名后加 _hd)
      const dir = outputDir ? outputDir : path.dirname(filePath);
      const ext = path.extname(filePath);
      const name = path.basename(filePath, ext);
      const outputPath = path.join(dir, `${name}_hd.png`); // AI 增强通常输出 png 质量最好

      // 3. 准备命令参数
      // -i 输入, -o 输出, -n 模型名(realesrgan-x4plus), -s 放大倍数(4)
      const args = [
        '-i', filePath,
        '-o', outputPath,
        '-n', 'realesrgan-x4plus', 
        '-s', '4'
      ];

      console.log('正在执行 AI 增强:', exePath, args);

      // 4. 开始运行
      execFile(exePath, args, (error, stdout, stderr) => {
        if (error) {
          console.error('AI 增强失败:', stderr);
          reject(`处理失败: ${stderr || error.message}`);
        } else {
          console.log('AI 增强成功:', stdout);
          resolve({ success: true, newPath: outputPath });
        }
      });

    } catch (err) {
      reject(err.message);
    }
  });
}

module.exports = { upscaleImage };