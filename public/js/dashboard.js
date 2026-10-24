/* 控制台逻辑：登录校验、拖拽上传（进度条）、文件列表、删除 */
'use strict';

const MAX_SIZE = 4 * 1024 * 1024; // 与服务端限制保持一致：4 MB

const state = { user: null, files: [] };

document.addEventListener('DOMContentLoaded', init);

async function init() {
  let user = null;
  try {
    const data = await API.get('/api/auth/me');
    user = data.user;
  } catch (err) {
    toast('无法连接服务器：' + err.message, 'error');
    return;
  }
  if (!user) {
    location.replace('/login');
    return;
  }

  state.user = user;
  $('#nav-username').textContent = user.username;
  $('#nav-avatar').textContent = (user.username || '?').slice(0, 1).toUpperCase();
  $('#user-email').textContent = `${user.email} 的云盘`;

  bindEvents();
  refreshFiles();
}

function bindEvents() {
  const dropzone = $('#dropzone');
  const input = $('#file-input');

  dropzone.addEventListener('click', () => input.click());
  dropzone.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      input.click();
    }
  });
  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('dragover');
  });
  dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
  dropzone.addEventListener('drop', async (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    await handleFiles(e.dataTransfer.files);
  });
  input.addEventListener('change', async () => {
    await handleFiles(input.files);
    input.value = ''; // 允许连续选择同一个文件
  });

  $('#logout-btn').addEventListener('click', async () => {
    try {
      await API.post('/api/auth/logout', {});
    } catch {
      /* 即使接口失败也照常回首页 */
    }
    location.href = '/';
  });
  $('#refresh-btn').addEventListener('click', refreshFiles);
}

/* ---------- 上传 ---------- */

async function handleFiles(fileList) {
  const files = Array.from(fileList || []);
  if (files.length === 0) return;

  // 每个文件生成一个带进度条的队列项
  const items = files.map((file) => {
    const el = document.createElement('div');
    el.className = 'queue-item';
    el.innerHTML = `
      <div class="queue-row">
        <span class="queue-icon">${iconFor(file.name)}</span>
        <span class="queue-name"></span>
        <span class="queue-status">等待上传</span>
      </div>
      <div class="progress"><div class="progress-fill" style="width: 0%"></div></div>`;
    el.querySelector('.queue-name').textContent = file.name;
    $('#upload-queue').appendChild(el);
    return {
      file,
      el,
      statusEl: el.querySelector('.queue-status'),
      fillEl: el.querySelector('.progress-fill'),
    };
  });

  // 逐个串行上传，避免并发过高
  for (const item of items) {
    await uploadOne(item);
  }

  await refreshFiles();
  setTimeout(() => {
    for (const item of items) {
      item.el.classList.add('queue-out');
      setTimeout(() => item.el.remove(), 400);
    }
  }, 2200);
}

function uploadOne(item) {
  const { file } = item;

  if (file.size > MAX_SIZE) {
    item.el.classList.add('queue-error');
    item.statusEl.textContent = `超过 4 MB 上限（${formatSize(file.size)}）`;
    return Promise.resolve();
  }

  // 用 XHR 而不是 fetch，才能拿到上传进度
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/files/upload');

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        const percent = Math.round((e.loaded / e.total) * 100);
        item.fillEl.style.width = `${percent}%`;
        item.statusEl.textContent = `${percent}%`;
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        item.fillEl.style.width = '100%';
        item.statusEl.textContent = '✓ 完成';
      } else if (xhr.status === 401) {
        item.el.classList.add('queue-error');
        item.statusEl.textContent = '登录已过期';
        setTimeout(() => location.replace('/login'), 800);
      } else {
        let message = `上传失败（${xhr.status}）`;
        try {
          const data = JSON.parse(xhr.responseText);
          if (data && data.error) message = data.error;
        } catch {
          /* 保留默认提示 */
        }
        item.el.classList.add('queue-error');
        item.statusEl.textContent = message;
      }
      resolve();
    });

    xhr.addEventListener('error', () => {
      item.el.classList.add('queue-error');
      item.statusEl.textContent = '网络错误';
      resolve();
    });

    item.statusEl.textContent = '0%';
    const form = new FormData();
    form.append('file', file);
    xhr.send(form);
  });
}

/* ---------- 文件列表 ---------- */

async function refreshFiles() {
  try {
    const data = await API.get('/api/files');
    state.files = data.files || [];
  } catch (err) {
    if (String(err.message).includes('请先登录')) {
      location.replace('/login');
      return;
    }
    toast(err.message, 'error');
    state.files = [];
  }
  renderStats();
  renderFiles();
}

function renderStats() {
  const totalSize = state.files.reduce((sum, f) => sum + (Number(f.size) || 0), 0);
  $('#stat-count').textContent = String(state.files.length);
  $('#stat-size').textContent = formatSize(totalSize);
}

function renderFiles() {
  const list = $('#file-list');
  list.textContent = '';

  if (state.files.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty';
    const icon = document.createElement('div');
    icon.className = 'empty-icon';
    icon.textContent = '🗂️';
    const title = document.createElement('div');
    title.className = 'empty-title';
    title.textContent = '还没有文件';
    const text = document.createElement('div');
    text.className = 'empty-text';
    text.textContent = '把文件拖到上方虚线框，开始第一次上传吧';
    empty.append(icon, title, text);
    list.appendChild(empty);
    return;
  }

  for (const f of state.files) {
    list.appendChild(fileRow(f));
  }
}

function fileRow(f) {
  const row = document.createElement('div');
  row.className = 'file-item';

  const icon = document.createElement('div');
  icon.className = 'file-icon';
  icon.textContent = iconFor(f.filename);

  const info = document.createElement('div');
  info.className = 'file-info';
  const name = document.createElement('a');
  name.className = 'file-name';
  name.href = `/api/files/${f.id}`;
  name.target = '_blank';
  name.rel = 'noopener';
  name.title = f.filename;
  name.textContent = f.filename; // textContent 防止文件名里的 HTML 被执行
  const meta = document.createElement('div');
  meta.className = 'file-meta';
  meta.textContent = `${formatSize(f.size)} · ${formatTime(f.created_at)}`;
  info.append(name, meta);

  const actions = document.createElement('div');
  actions.className = 'file-actions';

  const open = document.createElement('a');
  open.className = 'icon-btn';
  open.href = `/api/files/${f.id}`;
  open.target = '_blank';
  open.rel = 'noopener';
  open.title = '在新标签页打开';
  open.textContent = '↗';

  const copy = document.createElement('button');
  copy.type = 'button';
  copy.className = 'icon-btn';
  copy.title = '复制链接';
  copy.textContent = '🔗';
  copy.addEventListener('click', () => copyLink(`${location.origin}/api/files/${f.id}`));

  const del = document.createElement('button');
  del.type = 'button';
  del.className = 'icon-btn icon-btn-danger';
  del.title = '删除';
  del.textContent = '🗑';
  del.addEventListener('click', () => deleteFile(f.id, f.filename));

  actions.append(open, copy, del);
  row.append(icon, info, actions);
  return row;
}

async function deleteFile(id, filename) {
  if (!confirm(`确定删除「${filename}」吗？此操作不可恢复。`)) return;
  try {
    await API.del(`/api/files/${id}`);
    toast(`已删除「${filename}」`, 'success');
    refreshFiles();
  } catch (err) {
    toast(err.message, 'error');
  }
}

async function copyLink(url) {
  try {
    await navigator.clipboard.writeText(url);
    toast('链接已复制', 'success');
  } catch {
    toast('复制失败，请点击 ↗ 打开后手动复制地址', 'error');
  }
}

/* 按扩展名返回文件图标 */
function iconFor(filename) {
  const ext = (String(filename).split('.').pop() || '').toLowerCase();
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'avif', 'bmp', 'ico'].includes(ext)) return '🖼️';
  if (['mp4', 'mov', 'avi', 'mkv', 'webm', 'm4v'].includes(ext)) return '🎬';
  if (['mp3', 'wav', 'flac', 'ogg', 'm4a', 'aac'].includes(ext)) return '🎵';
  if (ext === 'pdf') return '📕';
  if (['zip', 'rar', '7z', 'tar', 'gz', 'bz2'].includes(ext)) return '🗜️';
  if (['doc', 'docx'].includes(ext)) return '📘';
  if (['xls', 'xlsx', 'csv'].includes(ext)) return '📊';
  if (['ppt', 'pptx'].includes(ext)) return '📽️';
  if (['js', 'ts', 'jsx', 'tsx', 'py', 'java', 'c', 'cpp', 'cs', 'go', 'rs', 'rb', 'php', 'html', 'css', 'json', 'xml', 'md', 'sh', 'yml', 'yaml', 'sql'].includes(ext)) return '📜';
  return '📦';
}
