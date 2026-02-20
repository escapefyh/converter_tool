const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const path = require('path');
const fs = require('fs');

// 配置 ffmpeg 可执行文件路径（使用 ffmpeg-static）
if (ffmpegPath) {
  ffmpeg.setFfmpegPath(ffmpegPath);
}

/**
 * 检查并规范输出目录、输出文件名
 */
function getOutputPath(inputPath, outputDir, suffix) {
  const ext = path.extname(inputPath);
  const name = path.basename(inputPath, ext);
  const dir = outputDir || path.dirname(inputPath);
  const safeSuffix = suffix ? `_${suffix}` : '';
  return path.join(dir, `${name}${safeSuffix}.mp4`);
}

/**
 * 通用视频转码函数
 * @param {string} inputPath 源视频路径
 * @param {string|null} outputDir 输出目录（可选）
 * @param {boolean} mute 是否生成无声视频
 */
function convertToMp4Internal(inputPath, outputDir, mute = false) {
  return new Promise((resolve, reject) => {
    const allowedExt = ['.mov', '.mkv', '.avi', '.flv', '.wmv', '.mp4'];
    const ext = path.extname(inputPath).toLowerCase();

    if (!allowedExt.includes(ext)) {
      return resolve({
        success: false,
        error: `不支持的输入格式：${ext}（支持：MOV, MKV, AVI, FLV, WMV, MP4）`
      });
    }

    const suffix = mute ? 'muted' : 'converted';
    const outputPath = getOutputPath(inputPath, outputDir, suffix);

    // 确保输出目录存在
    try {
      fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    } catch (e) {
      // ignore
    }

    let command = ffmpeg(inputPath)
      .outputOptions([
        '-c:v libx264',       // 视频编码为 H.264
        '-preset fast',       // 编码速度/质量折衷
        '-movflags +faststart', // 优化网络播放
      ])
      .format('mp4');

    if (mute) {
      // 移除所有音轨
      command = command.noAudio();
    } else {
      // 保留音频，统一成 AAC
      command = command.audioCodec('aac');
    }

    command
      .on('start', (cmdLine) => {
        console.log('开始执行 ffmpeg 命令:', cmdLine);
      })
      .on('error', (err) => {
        console.error('视频转换失败:', err);
        reject({
          success: false,
          error: err.message || '视频转换失败'
        });
      })
      .on('end', () => {
        console.log('视频转换完成:', outputPath);
        resolve({
          success: true,
          newPath: outputPath
        });
      })
      .save(outputPath);
  });
}

/**
 * 普通：转为 MP4（保留声音）
 */
async function convertToMp4(filePath, outputDir) {
  try {
    return await convertToMp4Internal(filePath, outputDir, false);
  } catch (err) {
    return err.success !== undefined ? err : {
      success: false,
      error: err.message || '视频转换失败'
    };
  }
}

/**
 * 一步到位：生成“静音 MP4”
 */
async function convertToMutedMp4(filePath, outputDir) {
  try {
    return await convertToMp4Internal(filePath, outputDir, true);
  } catch (err) {
    return err.success !== undefined ? err : {
      success: false,
      error: err.message || '静音视频转换失败'
    };
  }
}

module.exports = {
  convertToMp4,
  convertToMutedMp4,
};




