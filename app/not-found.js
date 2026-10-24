export default function NotFound() {
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        fontFamily: 'system-ui, "Microsoft YaHei", sans-serif',
        color: '#333',
      }}
    >
      <h1 style={{ fontSize: 52, margin: 0 }}>404</h1>
      <p style={{ margin: 0, color: '#777' }}>页面不存在</p>
      <a href="/" style={{ color: '#4f46e5' }}>
        返回首页
      </a>
    </main>
  );
}
