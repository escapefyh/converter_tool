const sharp = require('sharp');
const ffmpeg = require('fluent-ffmpeg');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { app } = require('electron'); 

// ==========================================
// ✅ 核心修复 1：路径适配逻辑
// ==========================================
let ffmpegBin = require('ffmpeg-static');
let ffprobeBin = null;

try {
  ffprobeBin = require('ffprobe-static').path;
} catch (e) {
  console.log('未检测到 ffprobe-static');
}

if (app && app.isPackaged) {
  if (ffmpegBin) ffmpegBin = ffmpegBin.replace('app.asar', 'app.asar.unpacked');
  if (ffprobeBin) ffprobeBin = ffprobeBin.replace('app.asar', 'app.asar.unpacked');
}

if (ffmpegBin) ffmpeg.setFfmpegPath(ffmpegBin);
if (ffprobeBin) ffmpeg.setFfprobePath(ffprobeBin);
// ==========================================

const IMAGE_EXTS = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.tiff', '.tif', '.bmp', '.avif'];
const VIDEO_EXTS = ['.mov', '.mkv', '.avi', '.flv', '.wmv', '.mp4'];
const AUDIO_EXTS = ['.wav', '.m4a', '.flac', '.ogg', '.wma', '.aac', '.aiff', '.mp3'];

const QUALITY_MAP = {
  light: 90,
  balanced: 75,
  extreme: 50,
};

const VIDEO_CRF_MAP = { light: 20, balanced: 26, extreme: 32 };
const VIDEO_BITRATE_THRESHOLD = { light: 3000000, balanced: 1500000, extreme: 800000 };
const AUDIO_BITRATE_MAP = { light: '192k', balanced: '128k', extreme: '96k' };
const PDF_SETTING_MAP = { light: '/printer', balanced: '/ebook', extreme: '/screen' };

function getMode(mode) {
  if (mode === 'light' || mode === 'balanced' || mode === 'extreme') return mode;
  return 'balanced';
}

function ensureDir(p) {
  try {
    fs.mkdirSync(path.dirname(p), { recursive: true });
  } catch (_) {}
}

function getSize(p) {
  try {
    return fs.statSync(p).size;
  } catch {
    return null;
  }
}

function getMediaInfo(filePath) {
  return new Promise((resolve) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) resolve(null);
      else resolve(metadata);
    });
  });
}

// ==========================================
// ✅ PDF 瘦身逻辑 (加入体积对比拦截)
// ==========================================
async function slimPdf(filePath, mode, outputDir) {
  const m = getMode(mode);
  const setting = PDF_SETTING_MAP[m];
  const inputSize = getSize(filePath);

  const ext = path.extname(filePath);
  const name = path.basename(filePath, ext);
  const dir = outputDir || path.dirname(filePath);
  const outputPath = path.join(dir, `${name}_slim.pdf`);

  ensureDir(outputPath);

  let gsPath;
  if (app.isPackaged) {
    gsPath = path.join(process.resourcesPath, 'bin', 'gs.exe');
  } else {
    gsPath = path.join(app.getAppPath(), 'bin', 'gs.exe');
  }
  
  return new Promise((resolve, reject) => {
    const args = [
      '-sDEVICE=pdfwrite',
      '-dCompatibilityLevel=1.4',
      `-dPDFSETTINGS=${setting}`,
      '-dNOPAUSE', '-dQUIET', '-dBATCH',
      `-sOutputFile=${outputPath}`,
      filePath,
    ];

    const gs = spawn(gsPath, args);

    gs.on('error', (err) => {
      reject(new Error(`压缩 PDF 失败：请确保 bin 目录下有 Ghostscript。错误: ${err.message}`));
    });

    gs.on('close', (code) => {
      if (code === 0) {
        // ✅ 核心拦截逻辑：对比压缩前后的体积
        const outputSize = getSize(outputPath);
        if (outputSize && inputSize && outputSize >= inputSize) {
          // 如果压完反而变大了，说明已达到最优体积，删除生成的文件并拦截
          if (fs.existsSync(outputPath)) {
            fs.unlinkSync(outputPath);
          }
          return reject(new Error("该文件已达到最优体积"));
        }
        resolve(outputPath);
      } else {
        reject(new Error(`Ghostscript 退出码：${code}`));
      }
    });
  });
}

// ==========================================
// 图片、视频、音频逻辑
// ==========================================

async function slimImage(filePath, mode, outputDir) {
  const m = getMode(mode);
  const quality = QUALITY_MAP[m];
  const ext = path.extname(filePath);
  const name = path.basename(filePath, ext);
  const dir = outputDir || path.dirname(filePath);
  const outputPath = path.join(dir, `${name}_slim.jpg`);
  ensureDir(outputPath);
  await sharp(filePath).jpeg({ quality, mozjpeg: true }).toFile(outputPath);
  return outputPath;
}

async function slimVideo(filePath, mode, outputDir) {
  const m = getMode(mode);
  const crf = VIDEO_CRF_MAP[m];
  const targetBitrateNum = VIDEO_BITRATE_THRESHOLD[m];
  const metadata = await getMediaInfo(filePath);
  if (metadata && metadata.format && metadata.format.bit_rate) {
    if (parseInt(metadata.format.bit_rate) <= targetBitrateNum) {
      throw new Error("该文件已达到最优体积");
    }
  }
  const ext = path.extname(filePath);
  const name = path.basename(filePath, ext);
  const dir = outputDir || path.dirname(filePath);
  const outputPath = path.join(dir, `${name}_slim.mp4`);
  ensureDir(outputPath);
  return new Promise((resolve, reject) => {
    ffmpeg(filePath)
      .outputOptions(['-c:v libx264', `-crf ${crf}`, '-preset medium', '-pix_fmt yuv420p'])
      .audioCodec('aac').format('mp4')
      .on('error', (err) => reject(err))
      .on('end', () => resolve(outputPath))
      .save(outputPath);
  });
}

async function slimAudio(filePath, mode, outputDir) {
  const m = getMode(mode);
  const bitrateStr = AUDIO_BITRATE_MAP[m];
  const targetBitrateNum = parseInt(bitrateStr) * 1000;
  const metadata = await getMediaInfo(filePath);
  if (metadata && metadata.format && metadata.format.bit_rate) {
    if (parseInt(metadata.format.bit_rate) <= targetBitrateNum) {
      throw new Error("该文件已达到最优体积");
    }
  }
  const ext = path.extname(filePath);
  const name = path.basename(filePath, ext);
  const dir = outputDir || path.dirname(filePath);
  const outputPath = path.join(dir, `${name}_slim.mp3`);
  ensureDir(outputPath);
  return new Promise((resolve, reject) => {
    ffmpeg(filePath).noVideo().audioCodec('libmp3lame').audioBitrate(bitrateStr).format('mp3')
      .on('error', (err) => reject(err))
      .on('end', () => resolve(outputPath))
      .save(outputPath);
  });
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
      outputPath = await slimPdf(filePath, mode, outputDir); // ✅ 使用拦截逻辑
    } else {
      return { success: false, error: `不支持的文件类型：${ext}` };
    }

    const outputSize = getSize(outputPath);
    return {
      success: true,
      newPath: outputPath,
      inputSize,
      outputSize,
      compressionRatio: inputSize && outputSize ? ((1 - outputSize / inputSize) * 100).toFixed(1) : null,
    };
  } catch (err) {
    return { success: false, error: err.message || '瘦身失败' };
  }
}

module.exports = { slimFile };