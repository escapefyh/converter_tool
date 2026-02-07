// 获取 HTML 元素
const fileInput = document.getElementById('fileInput');
const fileLabel = document.getElementById('fileLabel');
const selectDirBtn = document.getElementById('selectDirBtn');
const pathDisplay = document.getElementById('pathDisplay');
const convertBtn = document.getElementById('convertBtn');
const statusOutput = document.getElementById('status');

const defaultFileLabelText = fileLabel ? fileLabel.innerText : '';

// 拿到主窗口中 preload 暴露的 api
const api = (window.parent && window.parent.api) ? window.parent.api : window.api;

console.log('audio.js 已加载');

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

function prepareFile() {
  if (fileInput.files.length === 0) {
    alert('请先选择一个音频或视频文件！');
    return null;
  }

  const file = fileInput.files[0];
  const allowed = [
    'wav', 'm4a', 'flac', 'ogg', 'wma', 'aac', 'aiff',
    'mp4', 'mov', 'mkv',
  ];
  const ext = file.name.split('.').pop().toLowerCase();

  if (!allowed.includes(ext)) {
    alert(`不支持的文件格式：.${ext}\n支持：wav, m4a, flac, ogg, wma, aac, aiff, mp4, mov, mkv`);
    return null;
  }

  const filePath = api.getFilePath(file);
  return { filePath };
}

convertBtn.addEventListener('click', async () => {
  const info = prepareFile();
  if (!info) return;

  const { filePath } = info;

  statusOutput.innerText = '正在转换为 MP3，请稍候... ⏳';
  statusOutput.style.color = 'black';
  convertBtn.disabled = true;

  try {
    console.log('发送音频转换请求:', { filePath, selectedOutputPath });
    const result = await api.convertAudio(filePath, selectedOutputPath);
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
    convertBtn.disabled = false;
  }
});


