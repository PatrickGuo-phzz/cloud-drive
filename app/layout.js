export const metadata = {
  title: '云盒 CloudBox',
  description: '简单的云端文件管理：注册登录、拖拽上传、随时下载。',
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
