/* 注册页逻辑 */
'use strict';

const form = document.getElementById('register-form');
const alertBox = document.getElementById('form-alert');
const submitBtn = document.getElementById('submit-btn');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  hideAlert();

  const username = $('#username').value.trim();
  const email = $('#email').value.trim();
  const password = $('#password').value;
  const confirm = $('#confirm-password').value;

  // 与服务端一致的校验规则
  if (!/^[\w\u4e00-\u9fa5]{2,20}$/.test(username)) {
    return showAlert('用户名需为 2-20 位字母、数字、下划线或中文');
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return showAlert('请输入有效的邮箱地址');
  }
  if (password.length < 8) return showAlert('密码至少需要 8 位');
  if (password !== confirm) return showAlert('两次输入的密码不一致');

  setLoading(true);
  try {
    // 注册成功后服务端会自动设置会话 Cookie
    await API.post('/api/auth/register', { username, email, password });
    location.href = '/dashboard';
  } catch (err) {
    showAlert(err.message);
    setLoading(false);
  }
});

function setLoading(loading) {
  submitBtn.disabled = loading;
  submitBtn.textContent = loading ? '注册中…' : '注 册';
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
