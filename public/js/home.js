/* 首页：已登录时把入口换成「进入控制台」 */
'use strict';

(async function () {
  const user = await getCurrentUser();
  if (!user) return;

  const login = $('#nav-login');
  const register = $('#nav-register');
  if (login) {
    login.textContent = '控制台';
    login.href = '/dashboard';
  }
  if (register) register.style.display = 'none';

  const cta = $('#hero-cta');
  if (cta) {
    cta.textContent = '';
    const a = document.createElement('a');
    a.className = 'btn btn-primary btn-lg';
    a.href = '/dashboard';
    a.textContent = `进入控制台（${user.username}）`;
    cta.appendChild(a);
  }
})();
