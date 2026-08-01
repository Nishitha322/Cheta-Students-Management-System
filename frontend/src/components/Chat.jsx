import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, Hash, Users, Sparkles, CheckCircle2, Search, Trash2, Check } from 'lucide-react';

export default function Chat({ API_URL, token, batchName }) {
  const [batches, setBatches] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [messages, setMessages] = useState([]);
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [toast, setToast] = useState('');
  
  const chatBottomRef = useRef(null);

  // Get current logged-in user from localStorage to check permissions
  let currentUser = null;
  try {
    currentUser = JSON.parse(localStorage.getItem('csms_user'));
  } catch (e) {}

  // Fetch all batches on mount
  useEffect(() => {
    const fetchBatches = async () => {
      try {
        const res = await fetch(`${API_URL}/batches/`);
        if (res.ok) {
          const data = await res.json();
          setBatches(data);
          // Default select the matching batchName or the first batch
          if (data && data.length > 0) {
            const matched = data.find(b => b.name === batchName) || data[0];
            setSelectedBatch(matched);
          }
        }
      } catch (err) {
        console.error('Failed to fetch batches:', err);
      }
    };
    fetchBatches();
  }, [API_URL, batchName]);

  // Fetch messages for selectedBatch
  const fetchMessages = async () => {
    if (!selectedBatch) return;
    try {
      const res = await fetch(`${API_URL}/student/chat/?batch_id=${selectedBatch.id}&_cb=${Date.now()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }
    } catch (err) {
      console.error('Error fetching chat messages:', err);
    }
  };

  // Poll messages every 3 seconds for the active selected batch
  useEffect(() => {
    if (!selectedBatch) return;
    fetchMessages();
    const interval = setInterval(fetchMessages, 3000);
    return () => clearInterval(interval);
  }, [selectedBatch, token]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!content.trim() || !selectedBatch) return;

    setSending(true);
    try {
      const res = await fetch(`${API_URL}/student/chat/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          content: content.trim(),
          batch_id: selectedBatch.id 
        })
      });

      const text = await res.text();
      let data = {};
      try {
        data = JSON.parse(text);
      } catch (err) {
        throw new Error(`Server HTTP ${res.status}. Please check connection.`);
      }

      if (!res.ok) throw new Error(data.error || 'Failed to send message');

      setContent('');
      setToast('Message sent successfully ✓');
      setTimeout(() => setToast(''), 2500);
      fetchMessages();
    } catch (err) {
      alert(err.message);
    } finally {
      setSending(false);
    }
  };

  const handleDeleteMessage = async (msgId) => {
    if (!window.confirm('Are you sure you want to delete this message?')) return;
    try {
      const res = await fetch(`${API_URL}/student/chat/?message_id=${msgId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const text = await res.text();
      let data = {};
      try {
        data = JSON.parse(text);
      } catch (e) {}

      if (!res.ok) throw new Error(data.error || 'Failed to delete message');

      setToast('Message deleted ✓');
      setTimeout(() => setToast(''), 2500);
      fetchMessages();
    } catch (err) {
      alert(err.message);
    }
  };

  const filteredBatches = batches.filter(b => 
    b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (b.description && b.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div style={styles.container}>
      {/* Batches & Groups Channel Sidebar */}
      <div className="glass-card chat-sidebar" style={styles.sidebar}>
        <div style={styles.sidebarHeader}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Users size={18} style={{ color: '#60a5fa' }} />
            <span style={{ fontWeight: 700, fontSize: 15, color: '#ffffff' }}>Batch Channels</span>
          </div>
          <span style={styles.batchCountBadge}>{batches.length} Channels</span>
        </div>

        {/* Search Channel Input */}
        <div style={styles.searchWrapper}>
          <Search size={14} style={{ color: '#9ca3af' }} />
          <input 
            type="text" 
            placeholder="Search channels..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={styles.searchInput}
          />
        </div>

        {/* Channel List */}
        <div style={styles.channelList}>
          {filteredBatches.map((batch) => {
            const isActive = selectedBatch && selectedBatch.id === batch.id;
            return (
              <div 
                key={batch.id} 
                onClick={() => setSelectedBatch(batch)}
                style={isActive ? styles.groupItemActive : styles.groupItem}
              >
                <div style={{
                  width: 32,
                  height: 32,
                  borderRadius: 10,
                  background: isActive ? 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)' : 'rgba(255,255,255,0.06)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: isActive ? '#ffffff' : '#9ca3af'
                }}>
                  <Hash size={16} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontWeight: isActive ? 700 : 500,
                    fontSize: 13,
                    color: isActive ? '#ffffff' : '#cbd5e1',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {batch.name}
                  </div>
                  <div style={{ fontSize: 10, color: isActive ? '#93c5fd' : '#6b7280' }}>
                    {batch.enrolled_count || 0} Members
                  </div>
                </div>
                {isActive && <CheckCircle2 size={14} style={{ color: '#60a5fa' }} />}
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="glass-card" style={styles.chatPane}>
        {/* Active Channel Header */}
        <div style={styles.chatHeader}>
          <div style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            background: 'linear-gradient(135deg, rgba(59,130,246,0.2) 0%, rgba(139,92,246,0.2) 100%)',
            border: '1px solid rgba(59,130,246,0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#60a5fa'
          }}>
            <Hash size={22} />
          </div>
          <div style={{ flex: 1 }}>
            <h3 style={{ fontSize: 16, color: '#ffffff', fontWeight: 700, margin: 0 }}>
              {selectedBatch ? selectedBatch.name : 'Select Channel'}
            </h3>
            <span style={{ fontSize: 12, color: '#9ca3af' }}>
              {selectedBatch?.description || 'Active Group Chat for Batch Members & System Admins'}
            </span>
          </div>

          {/* Toast Notification Banner */}
          {toast && (
            <div style={styles.toastBanner}>
              <Check size={14} />
              {toast}
            </div>
          )}

          <div style={styles.liveIndicator}>
            <span style={styles.liveDot} />
            LIVE CHAT
          </div>
        </div>

        {/* Message Stream */}
        <div style={styles.messageStream}>
          {messages.length === 0 ? (
            <div style={styles.emptyState}>
              <MessageSquare size={36} style={{ color: '#475569', marginBottom: 12 }} />
              <div style={{ fontSize: 14, color: '#94a3b8', fontWeight: 600 }}>
                No messages yet in #{selectedBatch?.name}
              </div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                Be the first to post a message to this group!
              </div>
            </div>
          ) : (
            messages.map((msg, index) => {
              const canDelete = currentUser && (currentUser.role === 'admin' || currentUser.id === msg.sender_id);
              return (
                <div key={index} style={styles.messageItem}>
                  <div 
                    className="avatar-container"
                    style={{ 
                      width: 36, 
                      height: 36,
                      border: msg.sender_role === 'admin' ? '2px solid #ef4444' : '1px solid rgba(255,255,255,0.1)'
                    }}
                  >
                    <img 
                      src={`https://api.dicebear.com/7.x/bottts/svg?seed=${msg.sender_name}`} 
                      alt="avatar" 
                      className="avatar-image" 
                    />
                  </div>
                  <div style={styles.messageContent}>
                    <div style={styles.senderHeader}>
                      <span style={{ fontWeight: 700, color: msg.sender_namecolor || '#ffffff', fontSize: 13 }}>
                        {msg.sender_name}
                      </span>
                      {msg.sender_title && (
                        <span style={{
                          ...styles.senderTitle,
                          background: msg.sender_role === 'admin' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                          borderColor: msg.sender_role === 'admin' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(59, 130, 246, 0.3)',
                          color: msg.sender_role === 'admin' ? '#f87171' : '#60a5fa'
                        }}>
                          {msg.sender_title}
                        </span>
                      )}
                      <span style={styles.timestamp}>
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>

                      {/* Delete Message Button for Admins & Authors */}
                      {canDelete && (
                        <button
                          onClick={() => handleDeleteMessage(msg.id)}
                          title="Delete Message"
                          style={styles.deleteBtn}
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                    <div style={styles.textBody}>
                      {msg.content}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={chatBottomRef} />
        </div>

        {/* Send Message Input */}
        <form onSubmit={handleSendMessage} style={styles.inputArea}>
          <input 
            type="text" 
            className="custom-input" 
            placeholder={`Message #${selectedBatch?.name || 'group'}...`}
            value={content}
            onChange={e => setContent(e.target.value)}
            disabled={sending || !selectedBatch}
            style={{ borderRadius: '24px 0 0 24px', background: 'rgba(15, 23, 42, 0.6)' }}
          />
          <button 
            type="submit" 
            className="btn-primary" 
            disabled={sending || !content.trim() || !selectedBatch} 
            style={styles.sendBtn}
          >
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    gap: 20,
    height: 'calc(100vh - 120px)',
    width: '100%',
    position: 'relative',
    zIndex: 2,
  },
  sidebar: {
    width: 280,
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    padding: 16,
    borderRadius: '20px',
  },
  sidebarHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 10,
    borderBottom: '1px solid rgba(255,255,255,0.06)',
  },
  batchCountBadge: {
    fontSize: 10,
    fontWeight: 700,
    color: '#60a5fa',
    background: 'rgba(59,130,246,0.12)',
    border: '1px solid rgba(59,130,246,0.25)',
    padding: '3px 8px',
    borderRadius: 99,
  },
  searchWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    background: 'rgba(3, 7, 18, 0.4)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    padding: '6px 12px',
  },
  searchInput: {
    background: 'transparent',
    border: 'none',
    outline: 'none',
    color: '#ffffff',
    fontSize: 12,
    width: '100%',
  },
  channelList: {
    flex: 1,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  groupItem: {
    background: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: '10px 12px',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  groupItemActive: {
    background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.16) 0%, rgba(139, 92, 246, 0.16) 100%)',
    border: '1px solid rgba(59, 130, 246, 0.35)',
    borderRadius: 12,
    padding: '10px 12px',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    cursor: 'pointer',
    boxShadow: '0 0 15px rgba(59, 130, 246, 0.15)',
  },
  chatPane: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    padding: 0,
    overflow: 'hidden',
    borderRadius: '20px',
    position: 'relative',
  },
  chatHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    padding: '16px 20px',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
    background: 'rgba(3, 7, 18, 0.25)',
    position: 'relative',
  },
  toastBanner: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    background: 'rgba(16, 185, 129, 0.2)',
    border: '1px solid rgba(16, 185, 129, 0.4)',
    color: '#34d399',
    fontSize: 11,
    fontWeight: 700,
    padding: '4px 12px',
    borderRadius: 99,
  },
  liveIndicator: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '4px 10px',
    borderRadius: 99,
    background: 'rgba(16, 185, 129, 0.12)',
    border: '1px solid rgba(16, 185, 129, 0.25)',
    color: '#10b981',
    fontSize: 10,
    fontWeight: 800,
    letterSpacing: '0.05em',
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: '50%',
    backgroundColor: '#10b981',
    boxShadow: '0 0 8px #10b981',
  },
  messageStream: {
    flex: 1,
    padding: 20,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    minHeight: 250,
  },
  messageItem: {
    display: 'flex',
    gap: 12,
    alignItems: 'flex-start',
  },
  messageContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    background: 'rgba(15, 23, 42, 0.55)',
    padding: '12px 16px',
    borderRadius: '0 16px 16px 16px',
    border: '1px solid rgba(255,255,255,0.06)',
    maxWidth: '82%',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
  },
  senderHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  senderTitle: {
    fontSize: 9,
    fontWeight: 700,
    textTransform: 'uppercase',
    padding: '2px 6px',
    borderRadius: 4,
    border: '1px solid',
  },
  timestamp: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '500',
  },
  deleteBtn: {
    background: 'transparent',
    border: 'none',
    color: '#ef4444',
    cursor: 'pointer',
    opacity: 0.6,
    padding: '2px 4px',
    marginLeft: 'auto',
    borderRadius: 4,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s',
  },
  textBody: {
    fontSize: 13.5,
    color: '#e2e8f0',
    lineHeight: 1.5,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    overflowWrap: 'break-word',
  },
  inputArea: {
    display: 'flex',
    padding: 16,
    borderTop: '1px solid rgba(255,255,255,0.08)',
    background: 'rgba(3, 7, 18, 0.45)',
  },
  sendBtn: {
    borderRadius: '0 24px 24px 0',
    padding: '0 22px',
  }
};
