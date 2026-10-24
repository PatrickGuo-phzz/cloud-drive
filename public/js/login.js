/* 登录页逻辑 */
'use strict';

const form = document.getElementById('login-form');
const alertBox = document.getElementById('form-alert');
const submitBtn = document.getElementById('submit-btn');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  hideAlert();

  const identifier = $('#identifier').value.trim();
  const password = $('#password').value;
  if (!identifier || !password) {
    showAlert('请填写账号和密码');
    return;
  }

  setLoading(true);
  try {
    await API.post('/api/auth/login', { identifier, password });
    location.href = '/dashboard';
  } catch (err) {
    showAlert(err.message);
    setLoading(false);
  }
});

function setLoading(loading) {
  submitBtn.disabled = loading;
  submitBtn.textContent = loading ? '登录中…' : '登 录';
}

function showAlert(message) {
  alertBox.textContent = message;
  alertBox.classList.remove('hidden');
}

function hideAlert() {
  alertBox.classList.add('hidden');
}

// 已登录的用户直接进入控制台
getCurrentUser().then((user) => {
  if (user) location.replace('/dashboard');
});
