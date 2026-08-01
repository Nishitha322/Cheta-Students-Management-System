import React, { useState, useEffect } from 'react';
import { 
  Clock, CheckCircle, TrendingUp, Calendar, ClipboardList, 
  Flame, Trophy, Award, User, ArrowRight, ShieldCheck,
  Mail, Phone, GraduationCap, IdCard, BookOpen, Sparkles
} from 'lucide-react';
import HolographicStudentName from './HolographicStudentName';
import CSMSSeal from './CSMSSeal';

export default function Dashboard({ data, refreshData, API_URL, token, setActiveTab }) {
  let { 
    student, 
    batch, 
    taskCompletion, 
    leaderboard, 
    attendance, 
    checkInState, 
    recentActivities,
    mockDrives,
    gradeTrend
  } = data || {};

  student = student || {};
  batch = batch || {};
  taskCompletion = taskCompletion || { doneRate: 0, completed: 0, pending: 0, notSubmitted: 0 };
  leaderboard = leaderboard || { rank: 'N/A' };
  attendance = attendance || { totalDays: 0, rate: 0, present: 0, leave: 0 };
  checkInState = checkInState || { isCheckedIn: false, isCheckedOut: false, sessionDuration: 0 };
  recentActivities = recentActivities || [];
  mockDrives = mockDrives || [];
  gradeTrend = gradeTrend || [];

  const [checkingIn, setCheckingIn] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(checkInState ? (checkInState.sessionDuration || 0) : 0);

  // Timer effect for check-in duration
  useEffect(() => {
    let interval = null;
    if (checkInState.isCheckedIn && !checkInState.isCheckedOut) {
      interval = setInterval(() => {
        setTimerSeconds(prev => prev + 1);
      }, 1000);
    } else {
      setTimerSeconds(checkInState.sessionDuration || 0);
    }
    return () => clearInterval(interval);
  }, [checkInState.isCheckedIn, checkInState.isCheckedOut, checkInState.sessionDuration]);

  const formatTime = (totalSecs) => {
    const hrs = Math.floor(totalSecs / 3600).toString().padStart(2, '0');
    const mins = Math.floor((totalSecs % 3600) / 60).toString().padStart(2, '0');
    const secs = (totalSecs % 60).toString().padStart(2, '0');
    return `${hrs}:${mins}:${secs}`;
  };

  const handleCheckInOut = async () => {
    setCheckingIn(true);
    const action = checkInState.isCheckedIn ? 'checkout' : 'checkin';
    try {
      const res = await fetch(`${API_URL}/student/checkin/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ action })
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error);
      
      alert(resData.status);
      refreshData();
    } catch (err) {
      alert(err.message);
    } finally {
      setCheckingIn(false);
    }
  };

  const renderChart = () => {
    const points = gradeTrend || [];
    if (points.length === 0) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 160, color: '#9ca3af', textAlign: 'center', width: '100%' }}>
          <TrendingUp size={36} style={{ marginBottom: 12, color: '#4b5563' }} />
          <span style={{ fontSize: 14, fontWeight: '700', fontFamily: 'var(--font-primary)' }}>No graded tasks available</span>
          <span style={{ fontSize: 12, color: '#6b7280', marginTop: 4, maxWidth: 300 }}>Complete and get your first graded task to see your performance trend.</span>
        </div>
      );
    }

    const width = 500;
    const height = 150;
    const paddingX = 45;
    const paddingY = 25;
    const plotWidth = width - 2 * paddingX;
    const plotHeight = height - 2 * paddingY;

    const coords = points.map((p, idx) => {
      const x = points.length === 1 
        ? width / 2 
        : paddingX + (idx / (points.length - 1)) * plotWidth;
      const y = height - paddingY - (p.percentage / 100) * plotHeight;
      return { x, y, ...p };
    });

    const getBezierPath = (pts) => {
      if (pts.length < 2) return "";
      let d = `M ${pts[0].x} ${pts[0].y}`;
      for (let i = 0; i < pts.length - 1; i++) {
        const p0 = pts[i];
        const p1 = pts[i + 1];
        const cpX1 = p0.x + (p1.x - p0.x) / 2;
        const cpY1 = p0.y;
        const cpX2 = p0.x + (p1.x - p0.x) / 2;
        const cpY2 = p1.y;
        d += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${p1.x} ${p1.y}`;
      }
      return d;
    };

    let linePath = "";
    let areaPath = "";
    if (coords.length > 1) {
      linePath = getBezierPath(coords);
      areaPath = linePath + ` L ${coords[coords.length - 1].x} ${height - paddingY} L ${coords[0].x} ${height - paddingY} Z`;
    }

    return (
      <div style={{ width: '100%', overflowX: 'auto', padding: '10px 0' }}>
        <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} style={{ overflow: 'visible' }}>
          <defs>
            <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.25" />
              <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="strokeGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="var(--primary)" />
              <stop offset="100%" stopColor="var(--info)" />
            </linearGradient>
          </defs>
          
          {[0, 50, 100].map(val => {
            const y = height - paddingY - (val / 100) * plotHeight;
            return (
              <g key={val}>
                <line x1={paddingX} y1={y} x2={width - paddingX} y2={y} stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" />
                <text x={paddingX - 8} y={y + 4} fill="#6b7280" fontSize="9" fontWeight="600" textAnchor="end">{val}%</text>
              </g>
            );
          })}

          {coords.length > 1 && (
            <path d={areaPath} fill="url(#chartGrad)" />
          )}

          {coords.length > 1 && (
            <path d={linePath} fill="none" stroke="url(#strokeGrad)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          )}

          {coords.map((c, idx) => (
            <g key={idx}>
              <circle cx={c.x} cy={c.y} r="5" fill="var(--primary)" stroke="#ffffff" strokeWidth="2.5" />
              <text x={c.x} y={c.y - 12} fill="#ffffff" fontSize="10" fontWeight="700" fontFamily="var(--font-primary)" textAnchor="middle">
                {Math.round(c.percentage)}%
              </text>
              <text x={c.x} y={height - 6} fill="#9ca3af" fontSize="9" fontWeight="600" textAnchor="middle" title={c.task_title}>
                T{idx + 1}
              </text>
            </g>
          ))}
        </svg>
      </div>
    );
  };

  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (taskCompletion.doneRate / 100) * circumference;

  const studentFullName = (
    `${student.first_name || ''} ${student.last_name || ''}`.trim() || 
    student.full_name || 
    student.name || 
    (student.username ? student.username.split('@')[0] : '') || 
    'STUDENT'
  );
  const displayName = student.first_name || student.full_name || student.name || (student.username ? student.username.split('@')[0] : 'Student');

  return (
    <div style={styles.container}>
      {/* ==================================================== */}
      {/* 1. REBUILT FULL-SCREEN ENTERPRISE SAAS HERO BANNER */}
      {/* ==================================================== */}
      <div className="hero-saas-container">
        {/* TOP ROW: Hero Greeting & Holographic Name Display */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 24, zIndex: 2 }}>
          {/* LEFT: Avatar + Title + Badges */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
            <div className="saas-avatar-box">
              <img 
                src={`https://api.dicebear.com/7.x/bottts/svg?seed=${student.first_name || student.username || 'Student'}`} 
                alt="Student Avatar" 
                className="saas-avatar-img" 
              />
              <span className="saas-pulse-dot" title="Live Online"></span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span className="saas-pill-badge">
                  <span className="live-dot-inline"></span>LEARNING PORTAL ACTIVE
                </span>
                <span className="saas-pill-badge-gold">
                  <ShieldCheck size={13} /> INSTITUTIONALLY VERIFIED
                </span>
              </div>
              <h1 className="saas-hero-name">
                Hello, {displayName}! 👋
              </h1>
              <p className="saas-hero-subtitle">
                Welcome back! Your specialized training modules and academic trajectory are active.
              </p>
            </div>
          </div>

          {/* RIGHT: Holographic Name Component Showcase */}
          <div style={{ minWidth: 260, flex: 1, maxWidth: 420, height: 115, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <HolographicStudentName name={studentFullName} />
          </div>
        </div>

        {/* MIDDLE SECTION: REBUILT ENTERPRISE STUDENT PROFILE CARD & QUICK STATS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 1.4fr) minmax(280px, 1fr)', gap: 24, zIndex: 2 }}>
          {/* REBUILT STUDENT INFORMATION PANEL */}
          <div className="student-profile-saas-card">
            {/* Watermark */}
            <div style={styles.idCardWatermark} aria-hidden="true">
              <CSMSSeal variant="watermark" size={240} opacity={0.035} />
            </div>

            {/* Top Card Header */}
            <div style={styles.idCardTopHeader}>
              <div>
                <div style={styles.idCardSubTitle}>STUDENT PROFILE IDENTITY</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#ffffff', marginTop: 2 }}>
                  {batch.name || 'CSMS Base Training'}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div className="csms-seal-wrapper" title="CSMS Official Identity Seal">
                  <CSMSSeal variant="stamp" size={50} opacity={0.94} />
                </div>
                <div className="verified-seal-tag">
                  <ShieldCheck size={13} style={{ color: 'var(--primary)' }} />
                  <span>VERIFIED</span>
                </div>
              </div>
            </div>

            {/* 2-COLUMN BALANCED INFORMATION GRID */}
            <div className="saas-detail-grid">
              <div className="saas-detail-item">
                <div className="saas-detail-icon"><User size={18} /></div>
                <div>
                  <div className="saas-detail-label">Student Name</div>
                  <div className="saas-detail-value">{studentFullName}</div>
                </div>
              </div>

              <div className="saas-detail-item">
                <div className="saas-detail-icon"><IdCard size={18} /></div>
                <div>
                  <div className="saas-detail-label">Roll Number</div>
                  <div className="saas-detail-value" style={{ color: 'var(--primary)', fontFamily: 'var(--font-mono, monospace)' }}>
                    {student.roll_number || 'N/A'}
                  </div>
                </div>
              </div>

              <div className="saas-detail-item">
                <div className="saas-detail-icon"><Mail size={18} /></div>
                <div>
                  <div className="saas-detail-label">Email Address</div>
                  <div className="saas-detail-value" style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: 190 }}>
                    {student.email || 'N/A'}
                  </div>
                </div>
              </div>

              <div className="saas-detail-item">
                <div className="saas-detail-icon"><Phone size={18} /></div>
                <div>
                  <div className="saas-detail-label">Phone Number</div>
                  <div className="saas-detail-value">{student.phone_number || 'N/A'}</div>
                </div>
              </div>

              <div className="saas-detail-item">
                <div className="saas-detail-icon"><BookOpen size={18} /></div>
                <div>
                  <div className="saas-detail-label">Batch Enrolled</div>
                  <div className="saas-detail-value">{batch.name || 'CSMS Base'}</div>
                </div>
              </div>

              <div className="saas-detail-item">
                <div className="saas-detail-icon"><Sparkles size={18} /></div>
                <div>
                  <div className="saas-detail-label">Learning Status</div>
                  <div className="saas-detail-value" style={{ color: '#34d399', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#34d399', boxShadow: '0 0 8px #34d399' }}></span>
                    Active Student
                  </div>
                </div>
              </div>
            </div>

            {/* CARD FOOTER: Session Duration + Check-In Action Button */}
            <div style={styles.idCardFooterRow}>
              <div>
                <div className="saas-detail-label">Session Duration</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--primary)', fontFamily: 'var(--font-primary)', display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
                  <span className="live-dot-inline"></span>
                  {formatTime(timerSeconds)}
                </div>
              </div>

              <div>
                <button 
                  className="btn-action-primary" 
                  onClick={handleCheckInOut} 
                  disabled={checkingIn}
                  style={{ 
                    padding: '11px 22px',
                    borderRadius: 14,
                    fontSize: 14,
                    background: (checkInState.isCheckedIn && !checkInState.isCheckedOut) 
                      ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' 
                      : 'linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%)',
                    boxShadow: (checkInState.isCheckedIn && !checkInState.isCheckedOut)
                      ? '0 6px 20px rgba(239, 68, 68, 0.35)'
                      : '0 6px 20px var(--primary-glow)',
                  }}
                >
                  <Clock size={16} />
                  {checkingIn ? 'Processing...' : (checkInState.isCheckedIn && !checkInState.isCheckedOut) ? 'Check Out (WFH)' : 'Check In (WFH)'}
                </button>
              </div>
            </div>
          </div>

          {/* QUICK STATS SHOWCASE CARDS (Right Column inside Hero) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Quick Stat 1: Streak & League */}
            <div className="hero-stat-card">
              <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(249, 115, 22, 0.12)', color: '#f97316', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Flame size={22} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.8px' }}>Active Streak</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: '#ffffff', marginTop: 2 }}>{student.streak || '0d'}</div>
              </div>
              <span className="saas-pill-badge-gold">{student.league || 'Gold'}</span>
            </div>

            {/* Quick Stat 2: Task Completion Progress */}
            <div className="hero-stat-card interactive" onClick={() => setActiveTab('tasks')} style={{ cursor: 'pointer' }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--primary-glow)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <ClipboardList size={22} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.8px' }}>Task Progress</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: '#ffffff', marginTop: 2 }}>{Math.round(taskCompletion.doneRate)}% Completed</div>
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#10b981' }}>{taskCompletion.completed} Done</div>
            </div>

            {/* Quick Stat 3: Leaderboard Standing */}
            <div className="hero-stat-card interactive" onClick={() => setActiveTab('leaderboard')} style={{ cursor: 'pointer' }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(167, 139, 250, 0.12)', color: '#a78bfa', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Trophy size={22} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.8px' }}>Leaderboard Rank</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: '#ffffff', marginTop: 2 }}>#{leaderboard.rank}</div>
              </div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                Batch Rank <ArrowRight size={14} />
              </div>
            </div>

            {/* Quick Stat 4: Attendance Overview */}
            <div className="hero-stat-card interactive" onClick={() => setActiveTab('attendance')} style={{ cursor: 'pointer' }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(16, 185, 129, 0.12)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Calendar size={22} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.8px' }}>Attendance Rate</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: '#ffffff', marginTop: 2 }}>{attendance.rate}%</div>
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#10b981' }}>{attendance.present} Present</div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. SECONDARY DASHBOARD GRID (4 COLUMNS) */}
      <div style={styles.secondaryGrid}>
        {/* Performance Insights */}
        <div className="glass-card interactive widget-performance" style={styles.widget} onClick={() => setActiveTab('grades')}>
          <div style={styles.widgetHeader}>
            <h3 style={styles.widgetTitle}>Performance Insights</h3>
            <span style={styles.widgetSub}>Real-time evaluations</span>
          </div>
          <div style={styles.insightsContent}>
            <div style={styles.insightRow}>
              <span>Avg Score:</span>
              <strong style={{ color: '#10b981', fontFamily: 'var(--font-primary)' }}>100%</strong>
            </div>
            <div style={styles.insightRow}>
              <span>Trend:</span>
              <strong style={{ color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                Improving <TrendingUp size={16} />
              </strong>
            </div>
            <div style={styles.insightRow}>
              <span>Total Grades:</span>
              <strong style={{ fontFamily: 'var(--font-primary)' }}>{taskCompletion.completed} Total</strong>
            </div>
            <button className="btn-secondary" style={{ marginTop: 14, width: '100%', justifyContent: 'center', borderRadius: 10, padding: '7px 14px', fontSize: 12 }}>
              View Academic Reports
            </button>
          </div>
        </div>

        {/* Mock Placement Drives */}
        <div className="glass-card interactive widget-mock" style={styles.widget} onClick={() => setActiveTab('grades')}>
          <div style={styles.widgetHeader}>
            <h3 style={styles.widgetTitle}>Mock Placement Drives</h3>
            <span style={styles.widgetSub}>Aptitude & Technical</span>
          </div>
          {mockDrives && mockDrives.length > 0 ? (
            <div style={styles.insightsContent}>
              <div style={styles.insightRow}>
                <span>Latest Test:</span>
                <strong style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: 140 }}>{mockDrives[0].test_name}</strong>
              </div>
              <div style={styles.insightRow}>
                <span>Total Score:</span>
                <strong style={{ color: '#f59e0b', fontFamily: 'var(--font-primary)' }}>
                  {(mockDrives[0].total_score / 10).toFixed(1)}% (Grade: {mockDrives[0].grade})
                </strong>
              </div>
              <div style={styles.insightRow}>
                <span>Attempts:</span>
                <strong style={{ fontFamily: 'var(--font-primary)' }}>{mockDrives.length} Attempt(s)</strong>
              </div>
              <button className="btn-secondary" style={{ marginTop: 14, width: '100%', justifyContent: 'center', borderRadius: 10, padding: '7px 14px', fontSize: 12 }}>
                View Test Details
              </button>
            </div>
          ) : (
            <div style={styles.insightsContent}>
              <div style={{ padding: '16px 0', textAlign: 'center', color: '#9ca3af', fontWeight: '500', fontSize: 13 }}>
                No attempts yet
              </div>
            </div>
          )}
        </div>

        {/* Attendance Summary */}
        <div className="glass-card interactive widget-attendance" style={styles.widget} onClick={() => setActiveTab('attendance')}>
          <div style={styles.widgetHeader}>
            <h3 style={styles.widgetTitle}>Attendance Summary</h3>
            <span style={styles.widgetSub}>{attendance.totalDays} Days Tracked</span>
          </div>
          <div style={styles.insightsContent}>
            <div style={{ ...styles.largeRank, fontSize: 34, color: '#10b981', textAlign: 'center', margin: '4px 0', fontFamily: 'var(--font-primary)', fontWeight: 700 }}>
              {attendance.rate}%
            </div>
            <div style={styles.insightRow}>
              <span>Present:</span>
              <span style={{ color: '#10b981', fontWeight: 600, fontFamily: 'var(--font-primary)' }}>{attendance.present} Days</span>
            </div>
            <div style={styles.insightRow}>
              <span>Leaves Approved:</span>
              <span style={{ color: 'var(--primary)', fontWeight: 600, fontFamily: 'var(--font-primary)' }}>{attendance.leave} Days</span>
            </div>
            <button className="btn-secondary" style={{ marginTop: 14, width: '100%', justifyContent: 'center', borderRadius: 10, padding: '7px 14px', fontSize: 12 }}>
              View Attendance
            </button>
          </div>
        </div>

        {/* Active Batch */}
        <div className="glass-card interactive widget-analytics" style={styles.widget} onClick={() => setActiveTab('chat')}>
          <div style={styles.widgetHeader}>
            <h3 style={styles.widgetTitle}>My Active Batch</h3>
            <span style={styles.widgetSub}>Batch Group Room</span>
          </div>
          <div style={styles.insightsContent}>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--primary)', marginBottom: 4, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{batch.name || 'CSMS Batch'}</div>
            <p style={{ color: '#9ca3af', fontSize: 12, marginBottom: 12, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', height: 34, lineHeight: 1.4 }}>{batch.description || 'Active batch training room.'}</p>
            <div style={styles.insightRow}>
              <span>Status:</span>
              <span className="badge badge-success">Active</span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. ANALYTICS & RECENT FEED ROW */}
      <div style={styles.bottomGrid}>
        <div className="glass-card" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ marginBottom: 18, fontSize: 16 }}>Score Grades Trend</h3>
          {renderChart()}
          {gradeTrend && gradeTrend.length > 0 && (
            <span style={{ fontSize: 12, color: '#9ca3af', marginTop: 10, display: 'block' }}>
              {gradeTrend.length === 1 
                ? "Performance trend from your first graded task."
                : `Performance trend across ${gradeTrend.length} graded tasks.`
              }
            </span>
          )}
        </div>

        <div className="glass-card" style={{ flex: 1 }}>
          <h3 style={{ marginBottom: 18, fontSize: 16 }}>Recent Activities</h3>
          <div style={styles.activitiesFeed}>
            {recentActivities.map((act, index) => (
              <div key={index} style={styles.activityItem}>
                <div style={styles.activityDot}></div>
                <div style={styles.activityInfo}>
                  <div style={styles.activityTitle}>{act.title}</div>
                  <div style={styles.activityDetail}>{act.detail}</div>
                  <div style={styles.activityTime}>{new Date(act.timestamp).toLocaleString()}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: 24,
    width: '100%',
    position: 'relative',
    zIndex: 2,
  },

  // 1. Welcome Hero Banner Styles
  welcomeBanner: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 20,
    padding: '20px 24px',
    borderRadius: '24px',
    background: 'linear-gradient(135deg, var(--bg-card) 0%, rgba(15, 23, 42, 0.6) 100%)',
    border: '1px solid var(--border-color)',
    boxShadow: 'var(--shadow-lg), 0 0 30px var(--glow-color)',
    flexWrap: 'wrap',
  },
  bannerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    minWidth: 260,
  },
  greetingTextCol: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  bannerHeading: {
    fontSize: 22,
    fontWeight: 800,
    color: '#ffffff',
    margin: 0,
    lineHeight: 1.2,
  },
  bannerSub: {
    fontSize: 13,
    color: '#9ca3af',
    margin: 0,
  },
  bannerCenter: {
    flex: 1,
    minWidth: 220,
    height: 110,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  statPill: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    padding: '10px 16px',
    borderRadius: 14,
    background: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid var(--border-color)',
    minWidth: 90,
  },
  pillLabel: {
    fontSize: 11,
    fontWeight: 600,
    color: '#9ca3af',
  },
  pillVal: {
    fontSize: 16,
    fontWeight: 800,
    color: '#ffffff',
    fontFamily: 'var(--font-primary)',
  },

  // 2. Primary 3-Column Grid
  primaryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: 20,
  },
  widget: {
    display: 'flex',
    flexDirection: 'column',
    borderRadius: '20px',
  },
  widgetHeader: {
    marginBottom: 16,
  },
  widgetTitle: {
    fontSize: 17,
    fontWeight: 700,
    color: '#ffffff',
    letterSpacing: '-0.01em',
  },
  widgetSub: {
    fontSize: 12,
    color: '#cbd5e1',
    fontWeight: 400,
  },
  progressContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: 20,
  },
  svgWrapper: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsCol: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  statLabel: {
    fontSize: 13,
    color: '#d1d5db',
  },

  // Digital Student ID Card Styles
  digitalIdCard: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    borderRadius: '20px',
    border: '1px solid var(--border-hover)',
    background: 'linear-gradient(135deg, var(--id-card-bg-start) 0%, var(--id-card-bg-end) 100%)',
    boxShadow: 'var(--shadow-md), 0 0 25px var(--glow-color)',
    padding: '22px',
    position: 'relative',
    overflow: 'hidden',
  },
  idCardWatermark: {
    position: 'absolute',
    top: '50%',
    right: '8%',
    transform: 'translateY(-50%)',
    pointerEvents: 'none',
    userSelect: 'none',
    zIndex: 0,
  },
  idCardTopHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid var(--border-color)',
    paddingBottom: 12,
    marginBottom: 16,
    position: 'relative',
    zIndex: 1,
  },
  idCardFieldsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px 16px',
    marginBottom: 16,
    position: 'relative',
    zIndex: 1,
  },
  idCardFooterRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTop: '1px solid var(--border-color)',
    position: 'relative',
    zIndex: 1,
  },
  idCardSubTitle: {
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: '1px',
    color: 'var(--primary)',
    textTransform: 'uppercase',
  },
  idCardTitle: {
    fontSize: 16,
    fontWeight: 800,
    color: '#ffffff',
    marginTop: 2,
  },
  idCardFieldsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px 16px',
    marginBottom: 16,
  },
  idCardFieldLabel: {
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '0.8px',
    color: '#9ca3af',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  idCardFieldValue: {
    fontSize: 13,
    fontWeight: 700,
    color: '#ffffff',
    fontFamily: 'var(--font-primary)',
  },
  idCardFooterRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTop: '1px solid var(--border-color)',
  },

  // Leaderboard Card Styles
  centeredCol: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    padding: '8px 0',
  },
  leaderboardTitleLabel: {
    fontSize: 12,
    fontWeight: 600,
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: '1px',
  },
  largeRank: {
    fontSize: 44,
    fontFamily: 'var(--font-primary)',
    fontWeight: 800,
    color: '#ffffff',
    letterSpacing: '-0.02em',
    margin: '4px 0',
  },
  motivateText: {
    color: '#9ca3af',
    fontSize: 12,
    fontWeight: 400,
    textAlign: 'center',
  },

  // 3. Secondary 4-Column Grid
  secondaryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: 20,
  },
  insightsContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    flex: 1,
    justifyContent: 'center',
  },
  insightRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 13,
  },

  // 4. Analytics Bottom Grid
  bottomGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
    gap: 20,
  },
  activitiesFeed: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  activityItem: {
    display: 'flex',
    gap: 14,
    alignItems: 'flex-start',
  },
  activityDot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    background: 'var(--primary)',
    marginTop: 6,
    boxShadow: '0 0 8px var(--primary)',
  },
  activityInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  activityTitle: {
    fontWeight: '600',
    fontSize: 14,
    color: '#ffffff',
  },
  activityDetail: {
    fontSize: 12,
    color: '#9ca3af',
  },
  activityTime: {
    fontSize: 10,
    color: '#6b7280',
    marginTop: 2,
  }
};
