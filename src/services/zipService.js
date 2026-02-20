const AdmZip = require('adm-zip');
const path = require('path');
const fs = require('fs');

/**
 * 压缩：把一个或多个文件打成 zip
 * @param {string[]} inputPaths 需要压缩的文件路径数组
 * @param {string} outputDir 输出目录（可选）
 */
function compressFiles(inputPaths, outputDir) {
  return new Promise((resolve) => {
    try {
      if (!Array.isArray(inputPaths) || inputPaths.length === 0) {
        return resolve({ success: false, error: '没有需要压缩的文件' });
      }

      const first = inputPaths[0];
      const dir = outputDir || path.dirname(first);
      const baseName = inputPaths.length === 1
        ? path.basename(first, path.extname(first))
        : 'archive';
      const outputPath = path.join(dir, `${baseName}.zip`);

      try {
        fs.mkdirSync(dir, { recursive: true });
      } catch (_) {}

      const zip = new AdmZip();
      inputPaths.forEach((p) => {
        const stat = fs.statSync(p);
        if (stat.isDirectory()) {
          zip.addLocalFolder(p, path.basename(p));
        } else {
          zip.addLocalFile(p);
        }
      });

      zip.writeZip(outputPath);

      resolve({
        success: true,
        newPath: outputPath,
      });
    } catch (err) {
      console.error('压缩失败:', err);
      resolve({
        success: false,
        error: err.message || '压缩失败',
      });
    }
  });
}

/**
 * 解压：把 zip 解压到指定目录
 * @param {string} zipPath zip 文件路径
 * @param {string} outputDir 解压目标目录（可选）
 */
function extractZip(zipPath, outputDir) {
  return new Promise((resolve) => {
    try {
      if (!fs.existsSync(zipPath)) {
        return resolve({ success: false, error: 'ZIP 文件不存在' });
      }

      const zip = new AdmZip(zipPath);
      const dir = outputDir || path.join(path.dirname(zipPath), path.basename(zipPath, '.zip'));

      try {
        fs.mkdirSync(dir, { recursive: true });
      } catch (_) {}

      zip.extractAllTo(dir, true);

      resolve({
        success: true,
        newPath: dir,
      });
    } catch (err) {
      console.error('解压失败:', err);
      resolve({
        success: false,
        error: err.message || '解压失败',
      });
    }
  });
}

module.exports = {
  compressFiles,
  extractZip,
};




