// src/services/upscaleService.js
const { execFile } = require('child_process');
const path = require('path');
const { app } = require('electron');
const fs = require('fs');

/**
 * 获取 Real-ESRGAN 可执行文件的路径
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

// ✅ 修改函数签名，增加 modelType 参数
async function upscaleImage(filePath, outputDir, modelType) {
  return new Promise((resolve, reject) => {
    try {
      const exePath = getBinaryPath();
      
      // 1. 检查工具是否存在
      if (!fs.existsSync(exePath)) {
        return reject(`找不到画质增强工具，路径错误: ${exePath}`);
      }

      // 2. 准备输出路径
      const dir = outputDir ? outputDir : path.dirname(filePath);
      const ext = path.extname(filePath);
      const name = path.basename(filePath, ext);
      
      // ✅ 策略核心：根据 modelType 选择模型名称
      // 'photo' -> 'realesrgan-x4plus'
      // 'anime' -> 'realesrgan-x4plus-anime'
      const modelName = (modelType === 'anime') 
          ? 'realesrgan-x4plus-anime' 
          : 'realesrgan-x4plus';

      // 输出文件名也可以带上模型标识，方便区分
      const outputPath = path.join(dir, `${name}_${modelName}_hd.png`); 

      // 3. 准备命令参数
      // -n 参数现在是动态变量 modelName
      const args = [
        '-i', filePath,
        '-o', outputPath,
        '-n', modelName, 
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