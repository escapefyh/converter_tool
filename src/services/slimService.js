const sharp = require('sharp');
const ffmpeg = require('fluent-ffmpeg');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { app } = require('electron'); // 引入 electron 以检测打包状态

// ==========================================
// ✅ 核心修复 1：防止 ffmpeg 路径在 require 时被重置错误
// ==========================================
let ffmpegBin = require('ffmpeg-static');

// 如果是打包环境，强制修正路径到 app.asar.unpacked
if (app && app.isPackaged && ffmpegBin) {
  ffmpegBin = ffmpegBin.replace('app.asar', 'app.asar.unpacked');
}

if (ffmpegBin) {
  ffmpeg.setFfmpegPath(ffmpegBin);
}
// ==========================================

const IMAGE_EXTS = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.tiff', '.tif', '.bmp', '.avif'];
const VIDEO_EXTS = ['.mov', '.mkv', '.avi', '.flv', '.wmv', '.mp4'];
const AUDIO_EXTS = ['.wav', '.m4a', '.flac', '.ogg', '.wma', '.aac', '.aiff', '.mp3'];

const QUALITY_MAP = {
  light: 90,
  balanced: 75,
  extreme: 50,
};

const VIDEO_CRF_MAP = {
  light: 20,
  balanced: 26,
  extreme: 32,
};

const AUDIO_BITRATE_MAP = {
  light: '192k',
  balanced: '128k',
  extreme: '96k',
};

const PDF_SETTING_MAP = {
  light: '/printer',
  balanced: '/ebook',
  extreme: '/screen',
};

function getMode(mode) {
  if (mode === 'light' || mode === 'balanced' || mode === 'extreme') return mode;
  return 'balanced';
}

function ensureDir(p) {
  try {
    fs.mkdirSync(path.dirname(p), { recursive: true });
  } catch (_) {}
}

async function slimImage(filePath, mode, outputDir) {
  const m = getMode(mode);
  const quality = QUALITY_MAP[m];
  const ext = path.extname(filePath);
  const name = path.basename(filePath, ext);
  const dir = outputDir || path.dirname(filePath);
  const outputPath = path.join(dir, `${name}_slim.jpg`);

  ensureDir(outputPath);

  await sharp(filePath)
    .jpeg({ quality, mozjpeg: true })
    .toFile(outputPath);

  return outputPath;
}

function slimVideo(filePath, mode, outputDir) {
  const m = getMode(mode);
  const crf = VIDEO_CRF_MAP[m];
  const audioBitrate = AUDIO_BITRATE_MAP[m];

  const ext = path.extname(filePath);
  const name = path.basename(filePath, ext);
  const dir = outputDir || path.dirname(filePath);
  const outputPath = path.join(dir, `${name}_slim.mp4`);

  ensureDir(outputPath);

  return new Promise((resolve, reject) => {
    ffmpeg(filePath)
      .outputOptions([
        '-c:v libx264',       // 强制使用 H.264 编码 (兼容性最好)
        `-crf ${crf}`,
        '-preset medium',
        '-movflags +faststart',
        // ==========================================
        // ✅ 核心修复 2：强制像素格式为 yuv420p
        // 这是解决手机/微信无法播放、黑屏的关键！
        // ==========================================
        '-pix_fmt yuv420p',
      ])
      .audioCodec('aac')      // 强制使用 AAC 音频
      .audioBitrate(audioBitrate)
      .format('mp4')
      .on('start', (cmd) => console.log('开始视频瘦身:', cmd))
      .on('error', (err) => reject(err))
      .on('end', () => resolve(outputPath))
      .save(outputPath);
  });
}

function slimAudio(filePath, mode, outputDir) {
  const m = getMode(mode);
  const bitrate = AUDIO_BITRATE_MAP[m];

  const ext = path.extname(filePath);
  const name = path.basename(filePath, ext);
  const dir = outputDir || path.dirname(filePath);
  const outputPath = path.join(dir, `${name}_slim.mp3`);

  ensureDir(outputPath);

  return new Promise((resolve, reject) => {
    ffmpeg(filePath)
      .noVideo()
      .audioCodec('libmp3lame')
      .audioBitrate(bitrate)
      .format('mp3')
      .on('start', (cmd) => console.log('开始音频瘦身:', cmd))
      .on('error', (err) => reject(err))
      .on('end', () => resolve(outputPath))
      .save(outputPath);
  });
}

function slimPdf(filePath, mode, outputDir) {
  const m = getMode(mode);
  const setting = PDF_SETTING_MAP[m];

  const ext = path.extname(filePath);
  const name = path.basename(filePath, ext);
  const dir = outputDir || path.dirname(filePath);
  const outputPath = path.join(dir, `${name}_slim.pdf`);

  ensureDir(outputPath);

  // =======================================================
  // ✅✅✅ 【核心修复 3】自动寻找打包好的 gs.exe
  // 必须根据是否打包来决定去哪里找 bin 文件夹
  // =======================================================
  let gsPath;
  if (app.isPackaged) {
    // 生产环境：在 resources/bin/gs.exe (配合 package.json 的 extraResources)
    gsPath = path.join(process.resourcesPath, 'bin', 'gs.exe');
  } else {
    // 开发环境：在项目根目录/bin/gs.exe
    gsPath = path.join(app.getAppPath(), 'bin', 'gs.exe');
  }
  
  console.log('正在调用 Ghostscript 路径:', gsPath);

  return new Promise((resolve, reject) => {
    const args = [
      '-sDEVICE=pdfwrite',
      '-dCompatibilityLevel=1.4',
      `-dPDFSETTINGS=${setting}`,
      '-dNOPAUSE',
      '-dQUIET',
      '-dBATCH',
      `-sOutputFile=${outputPath}`,
      filePath,
    ];

    // ✅ 使用计算好的正确路径来启动 gs
    const gs = spawn(gsPath, args);

    gs.on('error', (err) => {
      console.error('调用 Ghostscript 失败:', err);
      reject(
        new Error(
          `压缩 PDF 失败：无法调用 Ghostscript。路径: ${gsPath}。错误信息: ${err.message}`
        )
      );
    });

    gs.on('close', (code) => {
      if (code === 0) {
        resolve(outputPath);
      } else {
        reject(new Error(`Ghostscript 退出码：${code}`));
      }
    });
  });
}

function getSize(p) {
  try {
    return fs.statSync(p).size;
  } catch {
    return null;
  }
}

async function slimFile(filePath, mode, outputDir) {
  try {
    const ext = path.extname(filePath).toLowerCase();
    const inputSize = getSize(filePath);

    let outputPath;
    if (IMAGE_EXTS.includes(ext)) {
      outputPath = await slimImage(filePath, mode, outputDir);
    } else if (VIDEO_EXTS.includes(ext)) {
      outputPath = await slimVideo(filePath, mode, outputDir);
    } else if (AUDIO_EXTS.includes(ext)) {
      outputPath = await slimAudio(filePath, mode, outputDir);
    } else if (ext === '.pdf') {
      outputPath = await slimPdf(filePath, mode, outputDir);
    } else {
      return {
        success: false,
        error: `不支持的文件类型：${ext}（仅支持图片、视频、音频和 PDF）`,
      };
    }

    const outputSize = getSize(outputPath);
    let ratio = null;
    if (inputSize && outputSize) {
      ratio = ((1 - outputSize / inputSize) * 100).toFixed(1);
    }

    return {
      success: true,
      newPath: outputPath,
      inputSize,
      outputSize,
      compressionRatio: ratio,
    };
  } catch (err) {
    console.error('瘦身失败:', err);
    return {
      success: false,
      error: err.message || '瘦身失败',
    };
  }
}

module.exports = {
  slimFile,
};

