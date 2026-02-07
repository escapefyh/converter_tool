// 获取 HTML 页面上的元素
const fileInput = document.getElementById('fileInput');
const fileLabel = document.getElementById('fileLabel');
const convertBtn = document.getElementById('convertBtn');
const statusOutput = document.getElementById('status');
const selectDirBtn = document.getElementById('selectDirBtn');
const pathDisplay = document.getElementById('pathDisplay');

const defaultFileLabelText = fileLabel ? fileLabel.innerText : '';

// 统一从父窗口拿到 api（主窗口 preload 暴露在 window.api 上）
const api = (window.parent && window.parent.api) ? window.parent.api : window.api;

console.log('pdf.js 已加载');
// 监听文件选择，更新展示文字
if (fileInput && fileLabel) {
    fileInput.addEventListener('change', () => {
        if (fileInput.files.length > 0) {
            const name = fileInput.files[0].name;
            fileLabel.innerText = `📄 文件名：${name}`;
        } else {
            fileLabel.innerText = defaultFileLabelText;
        }
    });
}

// 定义一个变量，用来存用户选的路径 (默认是 null，代表存原处)
let selectedOutputPath = null;

// ==========================================
// 逻辑 A：点击"更改保存位置"按钮
// ==========================================
selectDirBtn.addEventListener('click', async () => {
    // 呼叫后端打开文件夹窗口
    const path = await api.selectFolder();
    
    // 如果用户真的选了个路径（没点取消）
    if (path) {
        selectedOutputPath = path; // 记下来！
        // 更新界面上的文字，让用户看到
        pathDisplay.innerText = `📂 保存到：${path}`;
        pathDisplay.style.color = '#0056b3'; // 变个颜色提示一下
    }
});

// ==========================================
// 逻辑 B：点击"转换为 PDF"按钮
// ==========================================
convertBtn.addEventListener('click', async () => {
    // 1. 【第一道保险】检查有没有选文件
    if (fileInput.files.length === 0) {
        alert('请先选择一个文件！');
        return;
    }

    const file = fileInput.files[0];
    
    // 2. 【第二道保险】检查文件后缀名
    const allowedExtensions = [
        'jpg', 'jpeg', 'png', 'gif', 'tiff', 'tif',  // 图片
        'html', 'htm', 'txt',                         // 文本
        'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'  // Office
    ];
    const fileExt = file.name.split('.').pop().toLowerCase();

    if (!allowedExtensions.includes(fileExt)) {
        alert(`不支持的文件格式：.${fileExt}\n请选择支持的文件格式！`);
        return;
    }

    // 3. 准备数据
    const filePath = api.getFilePath(file); // 获取真实路径

    // 4. 更新界面状态
    statusOutput.innerText = '正在转换中...⏳';
    statusOutput.style.color = 'black';
    convertBtn.disabled = true; // 禁用按钮，防止重复点击

    try {
        console.log('发送 PDF 转换请求:', { filePath, selectedOutputPath });
        
        // 5. 【核心】呼叫后端
        const result = await api.convertToPdf(filePath, selectedOutputPath);

        console.log('后端返回:', result);

        // 6. 处理结果
        if (result.success) {
            statusOutput.innerText = `✅ 转换成功！保存在：${result.newPath}`;
            statusOutput.style.color = 'green';
        } else {
            statusOutput.innerText = `❌ 失败：${result.error}`;
            statusOutput.style.color = 'red';
        }
    } catch (err) {
        console.error('前端报错:', err);
        statusOutput.innerText = `❌ 程序错误：${err.message}`;
        statusOutput.style.color = 'red';
    } finally {
        convertBtn.disabled = false; // 恢复按钮
    }
});


