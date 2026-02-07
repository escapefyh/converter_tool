const PDFDocument = require('pdfkit');
const officeToPdf = require('office-to-pdf');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;
const { createWriteStream } = require('fs');

/**
 * 将文件转换为 PDF
 * @param {string} filePath - 源文件路径
 * @param {string} outputDir - 输出目录（可选）
 * @returns {Promise<{success: boolean, newPath?: string, error?: string}>}
 */
async function convertToPdf(filePath, outputDir) {
  try {
    const ext = path.extname(filePath).toLowerCase();
    const dir = outputDir ? outputDir : path.dirname(filePath);
    const name = path.basename(filePath, ext);
    const outputPath = path.join(dir, `${name}.pdf`);

    // 判断文件类型并选择相应的转换方法
    if (['.jpg', '.jpeg', '.png', '.gif', '.tiff', '.tif'].includes(ext)) {
      // 图片格式转 PDF
      return await convertImageToPdf(filePath, outputPath);
    } else if (['.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx'].includes(ext)) {
      // Office 文档转 PDF
      return await convertOfficeToPdf(filePath, outputPath);
    } else if (['.html', '.htm'].includes(ext)) {
      // HTML 转 PDF
      return await convertHtmlToPdf(filePath, outputPath);
    } else if (ext === '.txt') {
      // TXT 转 PDF
      return await convertTxtToPdf(filePath, outputPath);
    } else {
      return {
        success: false,
        error: `不支持的文件格式：${ext}`
      };
    }
  } catch (error) {
    console.error('PDF 转换失败:', error);
    return {
      success: false,
      error: error.message || '转换失败'
    };
  }
}

/**
 * 图片转 PDF (使用 PDFKit)
 */
async function convertImageToPdf(filePath, outputPath) {
  try {
    const ext = path.extname(filePath).toLowerCase();
    
    // 对于 GIF 和 TIFF，先转换为 PNG（PDFKit 原生支持 JPEG 和 PNG）
    let imagePath = filePath;
    let tempPath = null;
    
    if (['.gif', '.tiff', '.tif'].includes(ext)) {
      // 使用 sharp 将 GIF/TIFF 转换为 PNG
      tempPath = path.join(path.dirname(outputPath), `temp_${Date.now()}.png`);
      await sharp(filePath)
        .png()
        .toFile(tempPath);
      imagePath = tempPath;
    }
    
    try {
      // 获取图片尺寸（使用 sharp）
      const metadata = await sharp(imagePath).metadata();
      const { width, height } = metadata;
      
      // 创建 PDF 文档
      // PDF 单位是点（1/72 英寸），假设图片 DPI 为 72，直接使用像素值
      // 如果图片 DPI 不是 72，需要转换：points = pixels * (72 / dpi)
      const dpi = metadata.density || 72;
      const pdfWidth = (width * 72) / dpi;
      const pdfHeight = (height * 72) / dpi;
      
      const doc = new PDFDocument({
        size: [pdfWidth, pdfHeight],
        margin: 0 // 无边距，让图片填满页面
      });
      
      // 创建写入流
      const writeStream = createWriteStream(outputPath);
      doc.pipe(writeStream);
      
      // 添加图片，填充整个页面
      doc.image(imagePath, {
        width: pdfWidth,
        height: pdfHeight,
        fit: [pdfWidth, pdfHeight]
      });
      
      // 完成 PDF
      doc.end();
      
      // 等待写入完成
      await new Promise((resolve, reject) => {
        writeStream.on('finish', resolve);
        writeStream.on('error', reject);
      });
      
      // 清理临时文件
      if (tempPath) {
        try {
          await fs.unlink(tempPath);
        } catch (e) {
          console.warn('清理临时文件失败:', e);
        }
      }
      
      return {
        success: true,
        newPath: outputPath
      };
    } catch (error) {
      // 清理临时文件
      if (tempPath) {
        try {
          await fs.unlink(tempPath);
        } catch (e) {
          console.warn('清理临时文件失败:', e);
        }
      }
      throw error;
    }
  } catch (error) {
    throw new Error(`图片转 PDF 失败: ${error.message}`);
  }
}

/**
 * Office 文档转 PDF
 */
async function convertOfficeToPdf(filePath, outputPath) {
  try {
    const inputBuffer = await fs.readFile(filePath);
    const pdfBuffer = await officeToPdf(inputBuffer);
    await fs.writeFile(outputPath, pdfBuffer);
    return {
      success: true,
      newPath: outputPath
    };
  } catch (error) {
    throw new Error(`Office 文档转 PDF 失败: ${error.message}`);
  }
}

/**
 * HTML 转 PDF
 * 注意：office-to-pdf 可能不支持 HTML，这里先尝试，如果不行需要安装其他库
 */
async function convertHtmlToPdf(filePath, outputPath) {
  try {
    // 尝试使用 office-to-pdf
    const inputBuffer = await fs.readFile(filePath);
    const pdfBuffer = await officeToPdf(inputBuffer);
    await fs.writeFile(outputPath, pdfBuffer);
    return {
      success: true,
      newPath: outputPath
    };
  } catch (error) {
    // 如果 office-to-pdf 不支持，返回错误提示
    throw new Error(`HTML 转 PDF 失败: ${error.message}。可能需要安装额外的库（如 puppeteer）`);
  }
}

/**
 * TXT 转 PDF
 * 将 TXT 内容读取后，转换为简单的 PDF
 */
async function convertTxtToPdf(filePath, outputPath) {
  try {
    // 读取 TXT 文件内容
    const content = await fs.readFile(filePath, 'utf-8');
    
    // 创建一个简单的 HTML 包装
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body {
            font-family: "Microsoft YaHei", Arial, sans-serif;
            padding: 40px;
            line-height: 1.6;
            white-space: pre-wrap;
        }
    </style>
</head>
<body>
${content.replace(/</g, '&lt;').replace(/>/g, '&gt;')}
</body>
</html>`;
    
    // 将 HTML 写入临时文件
    const tempHtmlPath = path.join(path.dirname(outputPath), `temp_${Date.now()}.html`);
    await fs.writeFile(tempHtmlPath, htmlContent, 'utf-8');
    
    try {
      // 尝试使用 office-to-pdf 转换 HTML
      const inputBuffer = await fs.readFile(tempHtmlPath);
      const pdfBuffer = await officeToPdf(inputBuffer);
      await fs.writeFile(outputPath, pdfBuffer);
      
      // 删除临时文件
      await fs.unlink(tempHtmlPath);
      
      return {
        success: true,
        newPath: outputPath
      };
    } catch (error) {
      // 清理临时文件
      try {
        await fs.unlink(tempHtmlPath);
      } catch (e) {}
      throw error;
    }
  } catch (error) {
    throw new Error(`TXT 转 PDF 失败: ${error.message}`);
  }
}

module.exports = { convertToPdf };

