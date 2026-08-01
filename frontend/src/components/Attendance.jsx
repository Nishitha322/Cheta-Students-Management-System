import React, { useState, useEffect } from 'react';
import { Calendar, Download, RefreshCw, FileSpreadsheet } from 'lucide-react';

export default function Attendance({ API_URL, token }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewStyle, setViewStyle] = useState('daily'); // 'daily' or 'calendar'

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/student/attendance/?_cb=${Date.now()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setLogs(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleExport = () => {
    // Generate CSV data from logs
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Date,First Check-In,Last Check-Out,Total Time,Daily Status\n";
    logs.forEach(log => {
      const checkInStr = log.check_in ? new Date(log.check_in).toLocaleTimeString() : 'N/A';
      const checkOutStr = log.check_out ? new Date(log.check_out).toLocaleTimeString() : 'N/A';
      const timeStr = log.total_time ? log.total_time : 'N/A';
      csvContent += `${log.date},${checkInStr},${checkOutStr},${timeStr},${log.status.toUpperCase()}\n`;
    });
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `attendance_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper formatting for durations
  const formatDuration = (dur) => {
    if (!dur) return 'N/A';
    // Format "08:05:00" style strings
    return dur.split('.')[0]; 
  };

  // Stats calculation
  const presentDays = logs.filter(l => l.status === 'present').length;
  const leaveDays = logs.filter(l => l.status === 'leave').length;
  const totalTracked = logs.length;
  const percentage = totalTracked - leaveDays > 0 
    ? Math.round((presentDays / (totalTracked - leaveDays)) * 100) 
    : 0;

  if (loading) return <div style={{ color: '#fff' }}>Loading attendance tracking...</div>;

  return (
    <div style={styles.container}>
      <div style={styles.headerRow}>
        <div>
          <h2 style={styles.header}>My Attendance</h2>
          <p style={styles.subheader}>Track your daily attendance, verify check-in logs, and manage leaves</p>
        </div>
        <div style={styles.actionsRow}>
          <select className="custom-input" style={{ width: 140, height: 44 }} value={viewStyle} onChange={e => setViewStyle(e.target.value)}>
            <option value="daily">Daily List</option>
            <option value="calendar">Calendar Grid</option>
          </select>
          <button className="btn-secondary" onClick={handleExport} style={{ gap: 8 }}>
            <FileSpreadsheet size={16} /> Export CSV
          </button>
          <button className="btn-secondary" onClick={fetchLogs} style={{ padding: 12 }}>
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div style={styles.statsRow}>
        <div className="glass-card" style={styles.statCard}>
          <div style={styles.statVal} style={{ color: '#10b981', fontSize: 36, fontWeight: 600 }}>{percentage}%</div>
          <div style={styles.statLabel}>Overall Percentage</div>
        </div>
        <div className="glass-card" style={styles.statCard}>
          <div style={styles.statVal}>{totalTracked} Days</div>
          <div style={styles.statLabel}>Total Days Tracked</div>
        </div>
        <div className="glass-card" style={styles.statCard}>
          <div style={styles.statVal} style={{ color: '#10b981' }}>{presentDays} Days</div>
          <div style={styles.statLabel}>Present Days</div>
        </div>
        <div className="glass-card" style={styles.statCard}>
          <div style={styles.statVal} style={{ color: '#3b82f6' }}>{leaveDays} Days</div>
          <div style={styles.statLabel}>Leave Days Approved</div>
        </div>
      </div>

      <div style={styles.infoBanner}>
        ℹ️ **Attendance Policy**: You must log at least 8 to 10 hours daily to be marked **PRESENT**. Days marked as **LEAVE** do not count against your attendance percentage.
      </div>

      {viewStyle === 'daily' ? (
        <div className="table-container" style={{ margin: 0 }}>
          <table className="custom-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>First Check-In</th>
                <th>Last Check-Out</th>
                <th>Total Logged Time</th>
                <th>Daily Status</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log, index) => (
                <tr key={index}>
                  <td style={{ fontWeight: '700', color: '#ffffff' }}>{log.date}</td>
                  <td style={{ fontFamily: 'var(--font-primary)' }}>
                    {log.check_in ? new Date(log.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'N/A'}
                  </td>
                  <td style={{ fontFamily: 'var(--font-primary)' }}>
                    {log.check_out ? new Date(log.check_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'N/A'}
                  </td>
                  <td style={{ fontFamily: 'var(--font-primary)' }}>{formatDuration(log.total_time)}</td>
                  <td>
                    {log.status === 'present' ? (
                      <span className="badge badge-success">Present</span>
                    ) : log.status === 'leave' ? (
                      <span className="badge badge-info">Leave</span>
                    ) : (
                      <span className="badge badge-danger">Absent</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={styles.calendarGrid}>
          {logs.map((log, index) => {
            const dateObj = new Date(log.date);
            const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
            const dayNum = dateObj.getDate();
            const monthName = dateObj.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
            
            return (
              <div 
                key={index} 
                className="glass-card" 
                style={{ 
                  ...styles.calCard, 
                  border: log.status === 'present' ? '1px solid var(--success)' : log.status === 'leave' ? '1px solid var(--primary)' : '1px solid var(--danger)',
                  background: log.status === 'present' ? 'rgba(16,185,129,0.04)' : log.status === 'leave' ? 'rgba(59,130,246,0.04)' : 'rgba(239,68,68,0.04)'
                }}
              >
                <div style={styles.calDayName}>{dayName}</div>
                <div style={styles.calDayNum}>{dayNum}</div>
                <div style={styles.calMonth}>{monthName}</div>
                
                <span 
                  className="badge" 
                  style={{ 
                    marginTop: 12,
                    fontSize: 10,
                    background: log.status === 'present' ? 'rgba(16,185,129,0.15)' : log.status === 'leave' ? 'rgba(59,130,246,0.15)' : 'rgba(239,68,68,0.15)',
                    color: log.status === 'present' ? '#34d399' : log.status === 'leave' ? '#60a5fa' : '#f87171'
                  }}
                >
                  {log.status.toUpperCase()}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: 32,
    position: 'relative',
    zIndex: 2,
  },
  headerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 20,
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    paddingBottom: 24,
  },
  header: {
    color: '#ffffff',
    fontFamily: 'var(--font-header)',
    fontSize: 26,
    fontWeight: 600,
    marginBottom: 6,
  },
  subheader: {
    color: '#9ca3af',
    fontSize: 14,
  },
  actionsRow: {
    display: 'flex',
    gap: 12,
    alignItems: 'center',
  },
  statsRow: {
    display: 'flex',
    gap: 24,
    flexWrap: 'wrap',
  },
  statCard: {
    flex: 1,
    minWidth: 200,
    textAlign: 'center',
    padding: 24,
    borderRadius: '18px',
  },
  statVal: {
    fontSize: 24,
    fontWeight: 600,
    color: '#ffffff',
    marginBottom: 4,
    fontFamily: 'var(--font-header)',
  },
  statLabel: {
    fontSize: 13,
    color: '#9ca3af',
  },
  infoBanner: {
    background: 'rgba(59, 130, 246, 0.08)',
    border: '1px solid rgba(59, 130, 246, 0.25)',
    borderRadius: 12,
    padding: '16px 20px',
    fontSize: 14,
    color: '#93c5fd',
    lineHeight: 1.6,
  },
  calendarGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))',
    gap: 16,
  },
  calCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px 14px',
    textAlign: 'center',
    borderRadius: '16px',
  },
  calDayName: {
    fontSize: 11,
    color: '#9ca3af',
    fontWeight: 600,
    letterSpacing: 1,
  },
  calDayNum: {
    fontSize: 28,
    fontFamily: 'var(--font-header)',
    fontWeight: 600,
    color: '#ffffff',
    margin: '6px 0',
  },
  calMonth: {
    fontSize: 11,
    color: '#9ca3af',
    fontWeight: 600,
  }
};
