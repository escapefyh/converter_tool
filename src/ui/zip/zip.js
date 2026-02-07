// 元素引用
const modeRadios = document.getElementsByName('mode');
const fileInput = document.getElementById('fileInput');
const addFolderBtn = document.getElementById('addFolderBtn');
const folderListText = document.getElementById('folderListText');
const selectDirBtn = document.getElementById('selectDirBtn');
const pathDisplay = document.getElementById('pathDisplay');
const convertBtn = document.getElementById('convertBtn');
const statusOutput = document.getElementById('status');

// 从父窗口拿到 api
const api = (window.parent && window.parent.api) ? window.parent.api : window.api;

console.log('zip.js 已加载');

let selectedOutputPath = null;
let selectedFolders = [];

// 选择输出目录
selectDirBtn.addEventListener('click', async () => {
  const p = await api.selectFolder();
  if (p) {
    selectedOutputPath = p;
    pathDisplay.innerText = `📂 保存到：${p}`;
    pathDisplay.style.color = '#0056b3';
  }
});

// 添加需要压缩的文件夹
addFolderBtn.addEventListener('click', async () => {
  const p = await api.selectFolder();
  if (p) {
    // 避免重复
    if (!selectedFolders.includes(p)) {
      selectedFolders.push(p);
    }
    if (selectedFolders.length > 0) {
      folderListText.innerText = `已添加文件夹：${selectedFolders.join('；')}`;
      folderListText.style.color = '#0056b3';
    }
  }
});

function getMode() {
  for (const r of modeRadios) {
    if (r.checked) return r.value;
  }
  return 'compress';
}

function prepareFiles() {
  const mode = getMode();

  // 压缩：允许多选；解压：只取第一个，并要求是 .zip
  if (mode === 'compress') {
    const paths = [];
    for (const f of fileInput.files) {
      paths.push(api.getFilePath(f));
    }
    // 再加上通过“添加文件夹”选中的目录
    paths.push(...selectedFolders);

    if (paths.length === 0) {
      alert('请至少选择一个文件或文件夹进行压缩！');
      return null;
    }

    return { mode, paths };
  } else {
    if (fileInput.files.length === 0) {
      alert('请先选择一个 ZIP 文件！');
      return null;
    }
    const f = fileInput.files[0];
    const ext = f.name.split('.').pop().toLowerCase();
    if (ext !== 'zip') {
      alert('解压模式下，请选择 .zip 文件！');
      return null;
    }
    return { mode, zipPath: api.getFilePath(f) };
  }
}

convertBtn.addEventListener('click', async () => {
  const info = prepareFiles();
  if (!info) return;

  const mode = info.mode;

  statusOutput.innerText = mode === 'compress'
    ? '正在压缩，请稍候... ⏳'
    : '正在解压，请稍候... ⏳';
  statusOutput.style.color = 'black';
  convertBtn.disabled = true;

  try {
    let result;
    if (mode === 'compress') {
      console.log('发送压缩请求:', { files: info.paths, selectedOutputPath });
      result = await api.zipCompress(info.paths, selectedOutputPath);
    } else {
      console.log('发送解压请求:', { zipPath: info.zipPath, selectedOutputPath });
      result = await api.zipExtract(info.zipPath, selectedOutputPath);
    }

    console.log('后端返回:', result);

    if (result.success) {
      statusOutput.innerText = `✅ 成功！输出位置：${result.newPath}`;
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


