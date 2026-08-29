export function Skeleton() {
  return (
    <div style={{ padding: 20 }}>
      <div className="skeleton-line" style={{ width: "60%", height: 24, marginBottom: 16 }} />
      <div className="skeleton-line" style={{ width: "100%", height: 16, marginBottom: 8 }} />
      <div className="skeleton-line" style={{ width: "80%", height: 16, marginBottom: 24 }} />
      
      <div className="skeleton-card" style={{ height: 100, marginBottom: 16 }} />
      <div className="skeleton-card" style={{ height: 100, marginBottom: 16 }} />
    </div>
  );
}
