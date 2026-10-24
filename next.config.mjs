/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    // 前端是 public/ 下的纯 HTML/CSS/JS，这里把简洁路径映射到对应的 HTML 文件
    return {
      beforeFiles: [
        { source: '/', destination: '/index.html' },
        { source: '/login', destination: '/login.html' },
        { source: '/register', destination: '/register.html' },
        { source: '/dashboard', destination: '/dashboard.html' },
      ],
    };
  },
};

export default nextConfig;
