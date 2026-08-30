export function Splash() {
  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      height: "100vh",
      width: "100%",
      backgroundColor: "var(--tg-theme-bg-color, #ffffff)"
    }}>
      <img
        src="/logo.svg"
        alt="Akusherlik Test"
        style={{
          width: "120px",
          height: "120px",
          marginBottom: "24px",
          animation: "pulse 2s infinite"
        }}
      />
      <h2 style={{ margin: 0, color: "var(--tg-theme-text-color, #000000)" }}>Akusherlik Test</h2>
      <style>{`
        @keyframes pulse {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.05); opacity: 0.8; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
