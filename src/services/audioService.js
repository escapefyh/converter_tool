const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const path = require('path');
const fs = require('fs');

// 配置 ffmpeg 可执行文件路径
if (ffmpegPath) {
  ffmpeg.setFfmpegPath(ffmpegPath);
}

function getOutputPath(inputPath, outputDir) {
  const ext = path.extname(inputPath);
  const name = path.basename(inputPath, ext);
  const dir = outputDir || path.dirname(inputPath);
  return path.join(dir, `${name}.mp3`);
}

/**
 * 将各种音频/视频格式转为 MP3
 * 支持：.wav, .m4a, .flac, .ogg, .wma, .aac, .aiff, 以及 .mp4, .mov, .mkv
 */
function convertToMp3(filePath, outputDir) {
  return new Promise((resolve, reject) => {
    const allowedExt = [
      '.wav', '.m4a', '.flac', '.ogg', '.wma', '.aac', '.aiff',
      '.mp4', '.mov', '.mkv',
    ];
    const ext = path.extname(filePath).toLowerCase();

    if (!allowedExt.includes(ext)) {
      return resolve({
        success: false,
        error: `不支持的输入格式：${ext}（支持：wav, m4a, flac, ogg, wma, aac, aiff, mp4, mov, mkv）`,
      });
    }

    const outputPath = getOutputPath(filePath, outputDir);

    // 确保目录存在
    try {
      fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    } catch (_) {}

    ffmpeg(filePath)
      .noVideo() // 不要视频流，只保留音频
      .audioCodec('libmp3lame')
      .audioBitrate('192k')
      .format('mp3')
      .on('start', (cmd) => {
        console.log('开始执行音频转换命令:', cmd);
      })
      .on('error', (err) => {
        console.error('音频转换失败:', err);
        reject({
          success: false,
          error: err.message || '音频转换失败',
        });
      })
      .on('end', () => {
        console.log('音频转换完成:', outputPath);
        resolve({
          success: true,
          newPath: outputPath,
        });
      })
      .save(outputPath);
  });
}

module.exports = {
  convertToMp3,
};


