/* 公共工具：请求封装、轻提示、格式化 */
'use strict';

const $ = (sel, root = document) => root.querySelector(sel);

const API = {
  async request(path, options = {}) {
    const init = { method: options.method || 'GET', headers: {} };
    if (options.body !== undefined) {
      if (options.body instanceof FormData) {
        init.body = options.body; // FormData 由浏览器自动设置 Content-Type
      } else {
        init.headers['Content-Type'] = 'application/json';
        init.body = JSON.stringify(options.body);
      }
    }

    let res;
    try {
      res = await fetch(path, init);
    } catch {
      throw new Error('网络错误，请检查连接后重试');
    }

    let data = null;
    try {
      data = await res.json();
    } catch {
      /* 响应不是 JSON 时忽略 */
    }
    if (!res.ok) {
      throw new Error((data && data.error) || `请求失败（${res.status}）`);
    }
    return data;
  },
  get(path) {
    return this.request(path);
  },
  post(path, body) {
    return this.request(path, { method: 'POST', body });
  },
  del(path) {
    return this.request(path, { method: 'DELETE' });
  },
};

/** 获取当前登录用户；接口异常或未登录都返回 null */
async function getCurrentUser() {
  try {
    const data = await API.get('/api/auth/me');
    return data.user;
  } catch {
    return null;
  }
}

function toast(message, type = 'info') {
  const host = $('#toasts');
  if (!host) {
    alert(message);
    return;
  }
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.textContent = message;
  host.appendChild(el);
  setTimeout(() => {
    el.classList.add('toast-out');
    setTimeout(() => el.remove(), 300);
  }, 3200);
}

function formatSize(bytes) {
  const n = Number(bytes) || 0;
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function formatTime(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const diff = Date.now() - d.getTime();
  if (diff < 60 * 1000) return '刚刚';
  if (diff < 60 * 60 * 1000) return `${Math.floor(diff / 60000)} 分钟前`;
  if (diff < 24 * 60 * 60 * 1000) return `${Math.floor(diff / 3600000)} 小时前`;
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
