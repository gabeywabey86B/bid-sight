export default function LoadingScreen() {
  return (
    <div className="loading-overlay">
      <div className="loading-container">
        <div className="loading-logo">⚡</div>
        <h2 className="loading-title">BidSight</h2>
        <div className="loading-dots">
          <div className="dot"></div>
          <div className="dot"></div>
          <div className="dot"></div>
        </div>
        <p className="loading-text">Loading your insights...</p>
        <div className="loading-bar">
          <div className="loading-progress"></div>
        </div>
      </div>
    </div>
  );
}
