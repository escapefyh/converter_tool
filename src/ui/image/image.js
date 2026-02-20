// 1. 获取 HTML 页面上的元素
const fileInput = document.getElementById('fileInput');
const fileLabel = document.getElementById('fileLabel');
const formatSelect = document.getElementById('formatSelect');
const convertBtn = document.getElementById('convertBtn');
const statusOutput = document.getElementById('status'); // 显示结果的文字标签
const selectDirBtn = document.getElementById('selectDirBtn'); // 选择路径按钮
const pathDisplay = document.getElementById('pathDisplay');   // 显示路径的文字
const upscaleBtn = document.getElementById('upscaleBtn'); // AI 增强按钮
const modelSelect = document.getElementById('modelSelect'); // 模型选择

// 统一从父窗口拿到 api（主窗口 preload 暴露在 window.api 上）
// 在 iframe 里面直接用 window.api 可能是 undefined，这里做兼容
const api = (window.parent && window.parent.api) ? window.parent.api : window.api;

console.log('image.js 已加载');

// 保存默认的 fileLabel 文本
const defaultFileLabelText = fileLabel ? fileLabel.innerHTML : '';

// 定义一个变量，用来存用户选的路径 (默认是 null，代表存原处)
let selectedOutputPath = null;

// ==========================================
// 文件选择时更新展示文字
// ==========================================
if (fileInput && fileLabel) {
    fileInput.addEventListener('change', () => {
        if (fileInput.files.length > 0) {
            const name = fileInput.files[0].name;
            fileLabel.innerHTML = `📄 文件名：${name}`;
        } else {
            fileLabel.innerHTML = defaultFileLabelText;
        }
    });
}

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
// 逻辑 B：点击"开始转换"按钮
// ==========================================
convertBtn.addEventListener('click', async () => {
    // 1. 【第一道保险】检查有没有选文件
    if (fileInput.files.length === 0) {
        alert('请先选择一张图片！');
        return;
    }

    const file = fileInput.files[0];
    
    // 2. 【第二道保险】检查文件后缀名（防止用户选错文件）
    const allowedExtensions = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'tiff', 'avif', 'svg'];
    // 获取文件后缀（去掉点，转成小写），例如 "image.PNG" -> "png"
    const fileExt = file.name.split('.').pop().toLowerCase();

    if (!allowedExtensions.includes(fileExt)) {
        alert(`不支持的文件格式：.${fileExt}\n请选择图片文件！`);
        return; // 直接打断，不让错误的格式传给后端
    }

    // 3. 准备数据
    const targetFormat = formatSelect.value;
    const filePath = api.getFilePath(file); // 获取真实路径

    // 4. 更新界面状态
    statusOutput.innerText = '正在转换中...⏳';
    statusOutput.style.color = 'black';

    try {
        console.log('发送转换请求:', { filePath, targetFormat, selectedOutputPath });
        
        // 5. 【核心】呼叫后端，并传入 selectedOutputPath
        const result = await api.convertImage(filePath, targetFormat, selectedOutputPath);

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
    }
});

// ==========================================
// 逻辑 C：AI 画质增强按钮（如果存在）
// ==========================================
if (upscaleBtn && modelSelect) {
    upscaleBtn.addEventListener('click', async () => {
        if (fileInput.files.length === 0) {
            alert('请先选择一张图片！');
            return;
        }

        const file = fileInput.files[0];
        const allowedExtensions = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'tiff', 'avif', 'svg'];
        const fileExt = file.name.split('.').pop().toLowerCase();

        if (!allowedExtensions.includes(fileExt)) {
            alert(`不支持的文件格式：.${fileExt}\n请选择图片文件！`);
            return;
        }

        const filePath = api.getFilePath(file);
        const modelType = modelSelect.value; // 'photo' 或 'anime'

        statusOutput.innerText = '正在 AI 增强中，请稍候... ⏳';
        statusOutput.style.color = 'black';
        upscaleBtn.disabled = true;

        try {
            console.log('发送 AI 增强请求:', { filePath, modelType, selectedOutputPath });
            
            // 调用 AI 增强 API（如果存在）
            if (api.upscaleImage) {
                const result = await api.upscaleImage(filePath, selectedOutputPath, modelType);
                
                if (result.success) {
                    statusOutput.innerText = `✅ AI 增强成功！保存在：${result.newPath}`;
                    statusOutput.style.color = 'green';
                } else {
                    statusOutput.innerText = `❌ 失败：${result.error}`;
                    statusOutput.style.color = 'red';
                }
            } else {
                statusOutput.innerText = `❌ AI 增强功能暂未启用`;
                statusOutput.style.color = 'red';
            }
        } catch (err) {
            console.error('前端报错:', err);
            statusOutput.innerText = `❌ 程序错误：${err.message}`;
            statusOutput.style.color = 'red';
        } finally {
            upscaleBtn.disabled = false;
        }
    });
}