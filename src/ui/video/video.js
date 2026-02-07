// 获取 HTML 元素
const fileInput = document.getElementById('fileInput');
const fileLabel = document.getElementById('fileLabel');
const selectDirBtn = document.getElementById('selectDirBtn');
const pathDisplay = document.getElementById('pathDisplay');
const btnNormal = document.getElementById('btn-normal');
const btnMuted = document.getElementById('btn-muted');
const statusOutput = document.getElementById('status');

const defaultFileLabelText = fileLabel ? fileLabel.innerText : '';

// 从父窗口拿到 api（preload 暴露在主窗口）
const api = (window.parent && window.parent.api) ? window.parent.api : window.api;

console.log('video.js 已加载');

let selectedOutputPath = null;

// 选择输出目录
selectDirBtn.addEventListener('click', async () => {
  const p = await api.selectFolder();
  if (p) {
    selectedOutputPath = p;
    pathDisplay.innerText = `📂 保存到：${p}`;
    pathDisplay.style.color = '#0056b3';
  }
});

// 文件选择时更新展示文字
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

// 公共：校验文件并返回路径
function prepareFile() {
  if (fileInput.files.length === 0) {
    alert('请先选择一个视频文件！');
    return null;
  }

  const file = fileInput.files[0];
  const allowed = ['mov', 'mkv', 'avi', 'flv', 'wmv', 'mp4'];
  const ext = file.name.split('.').pop().toLowerCase();

  if (!allowed.includes(ext)) {
    alert(`不支持的文件格式：.${ext}\n支持：MOV, MKV, AVI, FLV, WMV, MP4`);
    return null;
  }

  const filePath = api.getFilePath(file);
  return { file, filePath };
}

async function handleConvert(muted) {
  const info = prepareFile();
  if (!info) return;

  const { filePath } = info;

  statusOutput.innerText = '正在转换中，请稍候... ⏳';
  statusOutput.style.color = 'black';
  btnNormal.disabled = true;
  btnMuted.disabled = true;

  try {
    console.log('发送视频转换请求:', { filePath, selectedOutputPath, muted });

    const result = muted
      ? await api.convertVideoMuted(filePath, selectedOutputPath)
      : await api.convertVideo(filePath, selectedOutputPath);

    console.log('后端返回:', result);

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
    btnNormal.disabled = false;
    btnMuted.disabled = false;
  }
}

// 事件绑定
btnNormal.addEventListener('click', () => handleConvert(false));
btnMuted.addEventListener('click', () => handleConvert(true));


