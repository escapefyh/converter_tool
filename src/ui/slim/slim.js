const fileInput = document.getElementById('fileInput');
const fileLabel = document.getElementById('fileLabel');
const modeRadios = document.getElementsByName('mode');
const selectDirBtn = document.getElementById('selectDirBtn');
const pathDisplay = document.getElementById('pathDisplay');
const convertBtn = document.getElementById('convertBtn');
const statusOutput = document.getElementById('status');

const defaultFileLabelText = fileLabel ? fileLabel.innerText : '';

const api = (window.parent && window.parent.api) ? window.parent.api : window.api;

console.log('slim.js 已加载');

let selectedOutputPath = null;

selectDirBtn.addEventListener('click', async () => {
  const p = await api.selectFolder();
  if (p) {
    selectedOutputPath = p;
    pathDisplay.innerText = `📂 保存到：${p}`;
    pathDisplay.style.color = '#0056b3';
  }
});

function getMode() {
  for (const r of modeRadios) {
    if (r.checked) return r.value;
  }
  return 'balanced';
}

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

convertBtn.addEventListener('click', async () => {
  if (fileInput.files.length === 0) {
    alert('请先选择一个文件！');
    return;
  }

  const file = fileInput.files[0];
  const filePath = api.getFilePath(file);
  const mode = getMode();

  statusOutput.innerText = '正在瘦身中，请稍候... ⏳';
  statusOutput.style.color = 'black';
  convertBtn.disabled = true;

  try {
    console.log('发送瘦身请求:', { filePath, mode, selectedOutputPath });
    const result = await api.slimFile(filePath, mode, selectedOutputPath);
    console.log('后端返回:', result);

    if (result.success) {
      let extra = '';
      if (result.inputSize && result.outputSize && result.compressionRatio != null) {
        const inMb = (result.inputSize / 1024 / 1024).toFixed(2);
        const outMb = (result.outputSize / 1024 / 1024).toFixed(2);
        extra = `（由 ${inMb} MB ➜ ${outMb} MB，压缩率约 ${result.compressionRatio}%）`;
      }
      statusOutput.innerText = `✅ 瘦身成功！新文件：${result.newPath} ${extra}`;
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


