const sharp = require('sharp');
const path = require('path');

async function convertImage(filePath, targetFormat, outputDir) {
  try {
    // 1. 格式名称修正（把用户选的格式，翻译成 Sharp 能听懂的）
    let sharpFormat = targetFormat;
    if (targetFormat === 'jpg') sharpFormat = 'jpeg'; // Sharp 只认 jpeg 不认 jpg
    if (targetFormat === 'tif') sharpFormat = 'tiff';

    // 2. 决定存在哪里
    const dir = outputDir ? outputDir : path.dirname(filePath);
    const ext = path.extname(filePath);
    const name = path.basename(filePath, ext);
    
    // 3. 拼接新路径
    const outputPath = path.join(dir, `${name}_converted.${targetFormat}`);

    // 4. 开始转换
    // 这里的 .toFormat() 用的是修正后的名字 (jpeg)
    // 这里的 .toFile() 用的是原本的后缀名 (.jpg)
    await sharp(filePath)
      .toFormat(sharpFormat) 
      .toFile(outputPath);

    return { success: true, newPath: outputPath };
  } catch (error) {
    console.error('转换失败:', error);
    return { success: false, error: error.message };
  }
}

module.exports = { convertImage };