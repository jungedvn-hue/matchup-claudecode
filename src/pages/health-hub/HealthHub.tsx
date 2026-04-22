import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  TrendingUp, 
  Utensils, 
  Watch, 
  Heart, 
  Wind, 
  Zap, 
  Map, 
  CheckCircle2, 
  Smartphone,
  Info
} from 'lucide-react';
import './HealthHub.css';

const HealthHub = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [view, setView] = useState('week');
  const [metrics, setMetrics] = useState({
    hr: 72,
    dist: 4.2,
    stress: 'Thấp',
    breath: 14,
    hrv: 65
  });

  const weeklyData = [65, 82, 110, 75, 95, 120, 88];
  const [monthlyData] = useState(() => Array.from({ length: 30 }, () => Math.floor(Math.random() * 60) + 40));

  const recommendations = [
    { title: 'Hydration+', detail: 'Nạp thêm 750ml nước dừa hoặc Oresol vì cường độ vận động tuần này tăng 15%.', icon: <Droplets className="w-5 h-5" /> },
    { title: 'Magnesium', detail: 'Mức độ stress tăng nhẹ cuối ngày, bổ sung Magnesium để ngủ ngon hơn.', icon: <Zap className="w-5 h-5" /> },
    { title: 'Carb Loading', detail: 'Cho trận đấu ngày mai: Ưu tiên tinh bột chậm (yến mạch, khoai lang).', icon: <Utensils className="w-5 h-5" /> },
    { title: 'Protein', detail: 'Sau buổi tập hôm nay: Cần 30g Đạm để tái tạo cơ bắp.', icon: <Activity className="w-5 h-5" /> }
  ];

  const [currentRecommendations, setCurrentRecommendations] = useState(recommendations.slice(0, 3));

  // Simulation for live dashboard updates
  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(prev => ({
        ...prev,
        hr: 70 + Math.floor(Math.random() * 10),
        breath: 12 + Math.floor(Math.random() * 4)
      }));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const renderStatsChart = () => {
    const data = view === 'week' ? weeklyData : monthlyData;
    const max = Math.max(...data);
    
    return data.map((val, i) => {
      const heightPercent = (val / max) * 100;
      return (
        <div 
          key={i}
          className="chart-bar" 
          style={{ height: `${heightPercent}%` }}
          data-value={val}
        />
      );
    });
  };

  const renderMatchChart = () => {
    const matchData = [40, 50, 80, 75, 90, 150, 165, 140, 120, 130, 90, 70];
    const max = 200;
    
    return matchData.map((val, i) => {
      const heightPercent = (val / max) * 100;
      let background = '';
      if (val > 140) background = 'linear-gradient(to top, hsl(var(--accent)), transparent)';
      else if (val > 100) background = 'linear-gradient(to top, hsl(var(--primary)), transparent)';
      
      return (
        <div 
          key={i}
          className="chart-bar" 
          style={{ height: `${heightPercent}%`, background }}
        />
      );
    });
  };

  return (
    <div className="app-shell health-hub-container">
      <header>
        <h1>Health Hub</h1>
        <p className="subtitle">Đồng bộ sức khoẻ & Hiệu suất thi đấu</p>
      </header>

      {/* Section: Dashboard */}
      {activeTab === 'dashboard' && (
        <section className="active">
          <div className="card">
            <div className="metric-grid">
              <div className="metric-card primary">
                <div className="metric-label">Nhịp tim</div>
                <div className="metric-value">
                  {metrics.hr} <span className="metric-unit">BPM</span>
                </div>
                <div className="subtitle">Vừa đồng bộ</div>
              </div>
              <div className="metric-card accent">
                <div className="metric-label">Quãng đường</div>
                <div className="metric-value">
                  {metrics.dist} <span className="metric-unit">km</span>
                </div>
                <div className="subtitle">Mục tiêu: 5km</div>
              </div>
              <div className="metric-card muted">
                <div className="metric-label">Mức độ Stress</div>
                <div className="metric-value">{metrics.stress}</div>
                <div className="subtitle">HRV: {metrics.hrv}ms</div>
              </div>
              <div className="metric-card accent">
                <div className="metric-label">Nhịp thở</div>
                <div className="metric-value">
                  {metrics.breath} <span className="metric-unit">/phút</span>
                </div>
                <div className="subtitle">Bình thường</div>
              </div>
            </div>
          </div>

          <div className="card">
            <h3>Hoạt động trong trận đấu</h3>
            <div className="chart-container">
              {renderMatchChart()}
            </div>
            <div className="subtitle" style={{ textAlign: 'center', marginTop: '8px' }}>
              Cường độ tim mạch (Trận: Semi-Final)
            </div>
          </div>
        </section>
      )}

      {/* Section: Statistics */}
      {activeTab === 'stats' && (
        <section className="active">
          <div className="toggle-group">
            <button 
              className={`toggle-btn ${view === 'week' ? 'active' : ''}`} 
              onClick={() => setView('week')}
            >
              Tuần
            </button>
            <button 
              className={`toggle-btn ${view === 'month' ? 'active' : ''}`} 
              onClick={() => setView('month')}
            >
              Tháng
            </button>
          </div>

          <div className="card">
            <h3>Xu hướng năng lượng</h3>
            <div className="chart-container">
              {renderStatsChart()}
            </div>
          </div>

          <div className="card">
            <div className="nutrition-item">
              <div className="nutrition-icon"><Zap /></div>
              <div className="nutrition-info">
                <h4>Năng lượng tiêu thụ</h4>
                <p>12,450 kcal</p>
              </div>
            </div>
            <div className="nutrition-item">
              <div className="nutrition-icon"><Map /></div>
              <div className="nutrition-info">
                <h4>Tổng quãng đường</h4>
                <p>32.5 km</p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Section: Nutrition */}
      {activeTab === 'nutrition' && (
        <section className="active">
          <div className="card" style={{ background: 'linear-gradient(135deg, hsla(var(--accent), 0.1), hsla(var(--background), 0.4))' }}>
            <h2 style={{ color: 'hsl(var(--accent))', marginBottom: '8px', fontFamily: 'var(--font-display)' }}>
              Đề xuất Dinh dưỡng
            </h2>
            <p className="subtitle">Dựa trên mức độ vận động và stress trong 24h qua.</p>
          </div>

          <div id="nutrition-list">
            {currentRecommendations.map((item, index) => (
              <div key={index} className="card">
                <div className="nutrition-item">
                  <div className="nutrition-icon">{item.icon}</div>
                  <div className="nutrition-info">
                    <h4>{item.title}</h4>
                    <p>{item.detail}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Section: Connect */}
      {activeTab === 'connect' && (
        <section className="active">
          <div className="card">
            <h3>Thiết bị thông minh</h3>
            <p className="subtitle">Kết nối để tự động đồng bộ chỉ số.</p>
            <br />
            
            <DeviceItem 
              name="Apple Watch" 
              status="connected" 
              logo={<AppleLogo />} 
              bgColor="#000"
            />
            <DeviceItem 
              name="Oura Ring" 
              status="disconnected" 
              logo={<span style={{ color: '#fff', fontWeight: 800, fontSize: '20px' }}>O</span>} 
              bgColor="#e11d48"
            />
            <DeviceItem 
              name="Garmin Connect" 
              status="disconnected" 
              logo={<span style={{ color: '#fff', fontWeight: 800, fontSize: '11px' }}>GARMIN</span>} 
              bgColor="#007cc3"
            />
          </div>
        </section>
      )}

      {/* Local Bottom Navigation for internal tab switching */}
      <nav className="bottom-nav">
        <div className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>
          <Activity className="nav-icon" />
          <span>Dashboard</span>
        </div>
        <div className={`nav-item ${activeTab === 'stats' ? 'active' : ''}`} onClick={() => setActiveTab('stats')}>
          <TrendingUp className="nav-icon" />
          <span>Thống kê</span>
        </div>
        <div className={`nav-item ${activeTab === 'nutrition' ? 'active' : ''}`} onClick={() => setActiveTab('nutrition')}>
          <Utensils className="nav-icon" />
          <span>Dinh dưỡng</span>
        </div>
        <div className={`nav-item ${activeTab === 'connect' ? 'active' : ''}`} onClick={() => setActiveTab('connect')}>
          <Watch className="nav-icon" />
          <span>Thiết bị</span>
        </div>
      </nav>
    </div>
  );
};

// Sub-components
const DeviceItem = ({ name, status, logo, bgColor }) => (
  <div className="device-item">
    <div className="device-logo" style={{ background: bgColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {logo}
    </div>
    <div className="device-details">
      <h4>{name}</h4>
      <span className={`device-status ${status === 'connected' ? 'status-connected' : ''}`}>
        {status === 'connected' ? 'Đã kết nối' : 'Chưa kết nối'}
      </span>
    </div>
    <button className="btn-connect" style={status === 'connected' ? { background: 'rgba(255,255,255,0.1)', color: '#fff' } : {}}>
      {status === 'connected' ? 'Ngắt' : 'Kết nối'}
    </button>
  </div>
);

const AppleLogo = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
     <path d="M17.05,20.28c-.96.78-2.1,1.24-3.23,1.24-1.14,0-2.02-.38-2.91-.38-.91,0-1.87.38-2.93.38-1.55,0-3.13-.93-4.14-2.58-1.07-1.74-1.12-4.11-.11-5.83,1.01-1.72,2.71-2.61,4.24-2.61.98,0,1.86.38,2.77.38.89,0,1.82-.38,2.94-.38,1.49,0,3,.88,3.92,2.37-3.08,1.81-2.59,6.04.53,8.41ZM12.03,7.25c-.02-2.13,1.61-3.99,3.64-4.13.1,2.26-1.7,4.35-3.64,4.13Z"/>
  </svg>
);

const Droplets = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5s-3 3.5-3 5.5a7 7 0 0 0 7 7z"/>
  </svg>
);

export default HealthHub;
