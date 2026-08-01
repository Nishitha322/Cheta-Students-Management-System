import React, { useState, useEffect } from 'react';
import { Briefcase, ArrowRight, ExternalLink, Download, X, HelpCircle, FileText } from 'lucide-react';

export default function PlacementPrep({ API_URL, token }) {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [activeRoundIndex, setActiveRoundIndex] = useState(0);

  useEffect(() => {
    const fetchPlacementData = async () => {
      try {
        const res = await fetch(`${API_URL}/student/placement-prep/?_cb=${Date.now()}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        setCompanies(data);
      } catch (err) {
        console.error("Error loading placement guides:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchPlacementData();
  }, []);

  const handleOpenCompany = (comp) => {
    setSelectedCompany(comp);
    setActiveRoundIndex(0); // Default to first round
  };

  const handleClose = () => {
    setSelectedCompany(null);
  };

  if (loading) return <div style={{ color: '#fff' }}>Loading placement guides...</div>;

  return (
    <div style={styles.container}>
      <div style={styles.headerRow}>
        <div>
          <h2 style={styles.header}>
            <Briefcase size={28} style={{ color: 'var(--primary)', verticalAlign: 'middle', marginRight: 8 }} /> Company Placement Prep
          </h2>
          <p style={styles.subheader}>
            Access selection rounds structures, guidelines, and previous year mock question papers for top IT recruitment drives.
          </p>
        </div>
      </div>

      {/* Grid of Companies */}
      <div style={styles.grid}>
        {companies.map(comp => (
          <div 
            key={comp.id} 
            className="glass-card interactive" 
            style={styles.card}
            onClick={() => handleOpenCompany(comp)}
          >
            <div style={styles.cardHeader}>
              <div style={styles.logoBadge}>
                <img 
                  src={comp.logo_url} 
                  alt={comp.name} 
                  style={{ width: 44, height: 44, borderRadius: 8 }} 
                />
              </div>
              <div>
                <h3 style={styles.companyName}>{comp.name}</h3>
                <span style={styles.roundsCount}>{comp.rounds ? comp.rounds.length : 0} Selection Rounds</span>
              </div>
            </div>
            <p style={styles.companyDesc}>{comp.description}</p>
            <div style={styles.cardFooter}>
              <span>Explore Guides</span>
              <ArrowRight size={16} />
            </div>
          </div>
        ))}
      </div>

      {/* Detail Modal Overlay */}
      {selectedCompany && (
        <div style={styles.modalOverlay} onClick={handleClose}>
          <div style={styles.modalCard} onClick={e => e.stopPropagation()}>
            {/* Modal Header */}
            <div style={styles.modalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <img 
                  src={selectedCompany.logo_url} 
                  alt={selectedCompany.name} 
                  style={{ width: 56, height: 56, borderRadius: 12 }} 
                />
                <div>
                  <h2 style={styles.modalTitle}>{selectedCompany.name} Placement Syllabus</h2>
                  <p style={{ color: '#9ca3af', fontSize: 13, marginTop: 2 }}>{selectedCompany.name} Recruitment Drive Preparation</p>
                </div>
              </div>
              <button style={styles.closeBtn} onClick={handleClose}>
                <X size={20} />
              </button>
            </div>

            {/* Modal Content layout */}
            <div style={styles.modalBody}>
              {/* Left sidebar: Timeline stepper */}
              <div style={styles.timelineCol}>
                <h4 style={styles.colHeader}>Selection Pipeline</h4>
                <div style={styles.timelineList}>
                  {selectedCompany.rounds.map((rnd, idx) => (
                    <button 
                      key={rnd.id}
                      style={idx === activeRoundIndex ? styles.timelineItemActive : styles.timelineItem}
                      onClick={() => setActiveRoundIndex(idx)}
                    >
                      <div style={{ 
                        ...styles.timelineDot,
                        backgroundColor: idx === activeRoundIndex ? 'var(--primary)' : 'rgba(255,255,255,0.1)'
                      }}>
                        {rnd.round_num}
                      </div>
                      <div style={styles.timelineInfo}>
                        <span style={styles.timelineTitle}>{rnd.title}</span>
                        <span style={styles.timelineSubtitle}>Round {rnd.round_num}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Right content: Round Details & Sample Questions */}
              <div style={styles.detailsCol}>
                {selectedCompany.rounds[activeRoundIndex] ? (
                  <>
                    <div style={styles.roundBanner}>
                      <h3 style={styles.roundTitle}>
                        Round {selectedCompany.rounds[activeRoundIndex].round_num}: {selectedCompany.rounds[activeRoundIndex].title}
                      </h3>
                      <p style={styles.roundDescText}>
                        {selectedCompany.rounds[activeRoundIndex].description}
                      </p>
                    </div>

                    {/* Resources & Question papers list */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                      <h4 style={styles.sectionHeader}>
                        <FileText size={18} style={{ color: 'var(--primary)' }} /> Question Papers & Study Material
                      </h4>
                      {selectedCompany.rounds[activeRoundIndex].resources && selectedCompany.rounds[activeRoundIndex].resources.map(res => (
                        <div key={res.id} style={styles.resourceCard}>
                          <div style={styles.resInfo}>
                            <h4 style={styles.resTitle}>{res.title}</h4>
                            {res.file_url && (
                              <a 
                                href={res.file_url} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                style={styles.downloadBtn}
                              >
                                <Download size={14} /> Download PDF previous papers
                              </a>
                            )}
                          </div>
                          
                          {/* Sample questions rendering */}
                          {res.sample_questions && (
                            <div style={styles.questionsContainer}>
                              <div style={styles.questionsHeader}>
                                <HelpCircle size={16} style={{ color: '#10b981' }} /> Previous Year Sample Questions
                              </div>
                              <div style={styles.questionsText}>
                                {res.sample_questions.split('\n').map((line, lIdx) => (
                                  <div key={lIdx} style={{ marginBottom: 6, whiteSpace: 'pre-wrap' }}>{line}</div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div style={{ color: '#9ca3af', textAlign: 'center', padding: 48 }}>
                    No rounds guidelines uploaded for this stage.
                  </div>
                )}
              </div>
            </div>
          </div>
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
    width: '100%',
    position: 'relative',
    zIndex: 2,
  },
  headerRow: {
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
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: 24,
  },
  card: {
    display: 'flex',
    flexDirection: 'column',
    cursor: 'pointer',
    borderRadius: '20px',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    marginBottom: 16,
  },
  logoBadge: {
    background: 'rgba(59, 130, 246, 0.08)',
    padding: 8,
    borderRadius: 12,
    border: '1px solid rgba(59, 130, 246, 0.2)',
    color: 'var(--primary)',
  },
  companyName: {
    fontSize: 18,
    fontFamily: 'var(--font-header)',
    fontWeight: 700,
    color: '#ffffff',
  },
  roundsCount: {
    fontSize: 12,
    color: '#60a5fa',
    fontWeight: '700',
    marginTop: 2,
    display: 'block',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  companyDesc: {
    fontSize: 13,
    color: '#9ca3af',
    lineHeight: 1.6,
    flex: 1,
    marginBottom: 20,
  },
  cardFooter: {
    borderTop: '1px solid rgba(255,255,255,0.06)',
    paddingTop: 16,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    color: '#60a5fa',
    fontWeight: '700',
    fontSize: 13,
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(3, 7, 18, 0.8)',
    backdropFilter: 'blur(8px)',
    zIndex: 1000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 960,
    height: '80vh',
    background: '#090d16',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '24px',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    boxShadow: 'var(--shadow-lg)',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '24px 28px',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'var(--font-header)',
    fontWeight: 700,
    color: '#ffffff',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: '#9ca3af',
    cursor: 'pointer',
    padding: 6,
    transition: 'color 0.2s',
  },
  modalBody: {
    flex: 1,
    display: 'flex',
    overflow: 'hidden',
  },
  timelineCol: {
    width: 260,
    borderRight: '1px solid rgba(255,255,255,0.06)',
    padding: 20,
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
    overflowY: 'auto',
    background: 'rgba(3, 7, 18, 0.2)',
  },
  colHeader: {
    fontSize: 11,
    fontWeight: 600,
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: '1px',
  },
  timelineList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  timelineItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    background: 'none',
    border: 'none',
    textAlign: 'left',
    padding: '10px 14px',
    borderRadius: 10,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  timelineItemActive: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    background: 'rgba(59, 130, 246, 0.08)',
    border: 'none',
    textAlign: 'left',
    padding: '10px 14px',
    borderRadius: 10,
    cursor: 'pointer',
    borderLeft: '3px solid var(--primary)',
  },
  timelineDot: {
    width: 24,
    height: 24,
    borderRadius: '50%',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 12,
    fontWeight: 600,
  },
  timelineInfo: {
    display: 'flex',
    flexDirection: 'column',
  },
  timelineTitle: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  timelineSubtitle: {
    color: '#6b7280',
    fontSize: 11,
    marginTop: 2,
  },
  detailsCol: {
    flex: 1,
    padding: 28,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: 28,
  },
  roundBanner: {
    background: 'rgba(3, 7, 18, 0.35)',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    borderRadius: 14,
    padding: 24,
  },
  roundTitle: {
    fontSize: 18,
    fontFamily: 'var(--font-header)',
    fontWeight: 700,
    color: '#ffffff',
    marginBottom: 10,
  },
  roundDescText: {
    fontSize: 14,
    color: '#d1d5db',
    lineHeight: 1.6,
  },
  sectionHeader: {
    fontSize: 16,
    fontFamily: 'var(--font-header)',
    fontWeight: 700,
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  resourceCard: {
    background: 'rgba(3, 7, 18, 0.25)',
    border: '1px solid rgba(255, 255, 255, 0.04)',
    borderRadius: 14,
    padding: 24,
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
  },
  resInfo: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
  },
  resTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
  },
  downloadBtn: {
    background: 'rgba(16, 185, 129, 0.08)',
    border: '1px solid rgba(16, 185, 129, 0.2)',
    borderRadius: 8,
    color: '#34d399',
    padding: '8px 14px',
    fontSize: 12,
    textDecoration: 'none',
    fontWeight: '700',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    transition: 'all 0.2s',
  },
  questionsContainer: {
    background: 'rgba(3, 7, 18, 0.5)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 10,
    padding: 16,
  },
  questionsHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 13,
    color: '#10b981',
    fontWeight: '700',
    marginBottom: 12,
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    paddingBottom: 8,
  },
  questionsText: {
    fontFamily: 'var(--font-primary)',
    fontSize: 13,
    color: '#cbd5e1',
    lineHeight: 1.6,
  }
};
