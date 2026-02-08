// 1. 获取 HTML 页面上的元素
const fileInput = document.getElementById('fileInput');
const fileLabel = document.getElementById('fileLabel');
const formatSelect = document.getElementById('formatSelect');
const convertBtn = document.getElementById('convertBtn');
const statusOutput = document.getElementById('status');
const selectDirBtn = document.getElementById('selectDirBtn');
const pathDisplay = document.getElementById('pathDisplay');

// ✅ 新增：获取 AI 增强按钮
const upscaleBtn = document.getElementById('upscaleBtn');

const defaultFileLabelText = fileLabel ? fileLabel.innerText : '';

// 统一从父窗口拿到 api
const api = (window.parent && window.parent.api) ? window.parent.api : window.api;

console.log('image.js 已加载');

// 监听文件选择
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

// 存储输出路径
let selectedOutputPath = null;

// 点击“更改保存位置”
selectDirBtn.addEventListener('click', async () => {
    const path = await api.selectFolder();
    if (path) {
        selectedOutputPath = path;
        pathDisplay.innerText = `📂 保存到：${path}`;
        pathDisplay.style.color = '#0056b3';
    }
});

// ==========================================
// 逻辑 B：普通转换
// ==========================================
convertBtn.addEventListener('click', async () => {
    if (fileInput.files.length === 0) {
        alert('请先选择一张图片！');
        return;
    }
    const file = fileInput.files[0];
    const targetFormat = formatSelect.value;
    const filePath = api.getFilePath(file);

    statusOutput.innerText = '正在转换中...⏳';
    statusOutput.style.color = 'black';

    try {
        const result = await api.convertImage(filePath, targetFormat, selectedOutputPath);
        if (result.success) {
            statusOutput.innerText = `✅ 转换成功！\n保存路径：${result.newPath}`;
            statusOutput.style.color = 'green';
        } else {
            statusOutput.innerText = `❌ 失败：${result.error}`;
            statusOutput.style.color = 'red';
        }
    } catch (err) {
        statusOutput.innerText = `❌ 程序错误：${err.message}`;
        statusOutput.style.color = 'red';
    }
});

// ==========================================
// ✅ 逻辑 C：AI 画质增强 (新增)
// ==========================================
if (upscaleBtn) {
    upscaleBtn.addEventListener('click', async () => {
        // 1. 检查文件
        if (fileInput.files.length === 0) {
            alert('请先选择一张需要修复的图片！');
            return;
        }

        const file = fileInput.files[0];
        const filePath = api.getFilePath(file);

        // 2. 友好的提示 (AI 比较慢)
        statusOutput.innerHTML = '🚀 正在启动 AI 引擎进行 4倍超分...<br>这可能需要 10-30 秒，请耐心等待，不要关闭窗口。';
        statusOutput.style.color = '#6f42c1'; // 紫色提示

        // 禁用按钮防止重复点击
        upscaleBtn.disabled = true;
        upscaleBtn.innerText = 'AI 处理中...';

        try {
            console.log('开始 AI 增强:', filePath);
            
            // 3. 呼叫后端 api.upscaleImage (需要在 preload.js 定义过)
            const result = await api.upscaleImage(filePath, selectedOutputPath);

            if (result.success) {
                statusOutput.innerHTML = `✅ <b>画质增强成功！</b><br>已保存为：${result.newPath}`;
                statusOutput.style.color = 'green';
            } else {
                statusOutput.innerText = `❌ 增强失败：${result.error}`;
                statusOutput.style.color = 'red';
            }
        } catch (err) {
            console.error(err);
            statusOutput.innerText = `❌ 调用错误：${err.message}\n请检查是否已下载 tools 并放入项目根目录。`;
            statusOutput.style.color = 'red';
        } finally {
            // 恢复按钮状态
            upscaleBtn.disabled = false;
            upscaleBtn.innerText = '⚡ AI 画质增强 (变清晰 4倍)';
        }
    });
}