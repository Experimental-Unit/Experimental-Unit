import React, { useState, useEffect, useRef } from 'react';
import preExtractedPropositions from './propositions.json';

// Color palette
const colors = {
  orange: '#FF6B35',
  purple: '#7B2D8E',
  forest: '#2D5A27',
  grey: '#4A4A4A',
  black: '#1A1A1A',
  neonYellow: '#DFFF00',
  oceanBlue: '#0077B6',
  pink: '#FF69B4',
  white: '#FAFAFA',
  red: '#DC143C',
  affirmed: '#4CAF50',
  rejected: '#F44336',
  nuanced: '#FF9800',
  pending: '#9E9E9E',
};

// Load vis-network for graph visualization
const loadVisNetwork = () => {
  return new Promise((resolve) => {
    if (window.vis) {
      resolve(window.vis);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/vis-network@9.1.2/dist/vis-network.min.js';
    script.onload = () => resolve(window.vis);
    document.head.appendChild(script);
  });
};

// Generate unique IDs
const generateId = () => `prop_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export default function App() {
  // App state
  const [view, setView] = useState('home');

  // Worldview data - initialize with pre-extracted propositions if first time
  const [worldview, setWorldview] = useState(() => {
    const saved = localStorage.getItem('xu_worldview_v2');
    if (saved) {
      return JSON.parse(saved);
    }
    // First time - load pre-extracted propositions
    return {
      id: generateId(),
      label: 'Experimental Unit Worldview',
      propositions: preExtractedPropositions,
      connections: [],
      metadata: { createdAt: Date.now(), source: 'Experimental Unit Substack' }
    };
  });

  // Review state
  const [currentPropIndex, setCurrentPropIndex] = useState(0);
  const [filterStatus, setFilterStatus] = useState('pending');
  const [nuanceInput, setNuanceInput] = useState('');
  const [showNuanceInput, setShowNuanceInput] = useState(false);

  // Graph state
  const graphRef = useRef(null);
  const networkRef = useRef(null);

  // Save worldview to localStorage
  useEffect(() => {
    localStorage.setItem('xu_worldview_v2', JSON.stringify(worldview));
  }, [worldview]);

  // Filter propositions by status
  const filteredProps = worldview.propositions.filter(p =>
    filterStatus === 'all' ? true : p.status === filterStatus
  );

  // Sort: foundational first, then by category
  const sortedProps = [...filteredProps].sort((a, b) => {
    if (a.foundational && !b.foundational) return -1;
    if (!a.foundational && b.foundational) return 1;
    return (a.category || '').localeCompare(b.category || '');
  });

  const currentProp = sortedProps[currentPropIndex];

  // Update proposition status
  const updateProp = (id, updates) => {
    setWorldview(prev => ({
      ...prev,
      propositions: prev.propositions.map(p =>
        p.id === id ? { ...p, ...updates, modifiedAt: Date.now() } : p
      )
    }));
  };

  // Affirm/Reject/Nuance handlers
  const handleAffirm = () => {
    if (currentProp) {
      updateProp(currentProp.id, { status: 'affirmed' });
      goToNext();
    }
  };

  const handleReject = () => {
    if (currentProp) {
      updateProp(currentProp.id, { status: 'rejected' });
      goToNext();
    }
  };

  const handleNuance = () => {
    if (currentProp && nuanceInput.trim()) {
      updateProp(currentProp.id, { status: 'nuanced', nuance: nuanceInput.trim() });
      setNuanceInput('');
      setShowNuanceInput(false);
      goToNext();
    }
  };

  const goToNext = () => {
    if (currentPropIndex < sortedProps.length - 1) {
      setCurrentPropIndex(currentPropIndex + 1);
    }
  };

  // Render graph visualization
  const renderGraph = async () => {
    if (!graphRef.current) return;

    const reviewed = worldview.propositions.filter(p => p.status !== 'pending');
    if (reviewed.length === 0) return;

    const nodes = reviewed.map(p => ({
      id: p.id,
      label: p.text.substring(0, 40) + '...',
      title: p.text + (p.nuance ? `\n\nYour nuance: ${p.nuance}` : ''),
      color: p.status === 'affirmed' ? colors.affirmed
           : p.status === 'rejected' ? colors.rejected
           : colors.nuanced,
      shape: p.foundational ? 'diamond' : 'ellipse',
      size: p.foundational ? 30 : 20,
      font: { color: colors.white, size: 10 },
    }));

    // Create edges based on category connections
    const edges = [];
    const byCategory = {};
    reviewed.forEach(p => {
      if (!byCategory[p.category]) byCategory[p.category] = [];
      byCategory[p.category].push(p.id);
    });

    Object.values(byCategory).forEach(ids => {
      for (let i = 0; i < ids.length - 1; i++) {
        edges.push({
          from: ids[i],
          to: ids[i + 1],
          color: { color: colors.grey, opacity: 0.3 },
          smooth: { type: 'continuous' },
        });
      }
    });

    if (networkRef.current) {
      networkRef.current.destroy();
    }

    try {
      const vis = await loadVisNetwork();
      networkRef.current = new vis.Network(
        graphRef.current,
        { nodes, edges },
        {
          physics: {
            enabled: true,
            stabilization: { iterations: 100 },
            barnesHut: {
              gravitationalConstant: -3000,
              springConstant: 0.02,
              springLength: 150,
            },
          },
          interaction: {
            hover: true,
            tooltipDelay: 100,
          },
        }
      );
    } catch (err) {
      console.error('Graph render error:', err);
    }
  };

  useEffect(() => {
    if (view === 'graph') {
      renderGraph();
    }
  }, [view, worldview]);

  // Stats
  const stats = {
    total: worldview.propositions.length,
    pending: worldview.propositions.filter(p => p.status === 'pending').length,
    affirmed: worldview.propositions.filter(p => p.status === 'affirmed').length,
    rejected: worldview.propositions.filter(p => p.status === 'rejected').length,
    nuanced: worldview.propositions.filter(p => p.status === 'nuanced').length,
    foundational: worldview.propositions.filter(p => p.foundational).length,
  };

  // Export worldview
  const exportWorldview = () => {
    const data = JSON.stringify(worldview, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `xu-worldview-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Reset to original propositions
  const resetWorldview = () => {
    if (confirm('Reset all propositions to their original state? Your responses will be lost.')) {
      setWorldview({
        id: generateId(),
        label: 'Experimental Unit Worldview',
        propositions: preExtractedPropositions,
        connections: [],
        metadata: { createdAt: Date.now(), source: 'Experimental Unit Substack' }
      });
      setCurrentPropIndex(0);
    }
  };

  // Styles
  const styles = {
    container: {
      minHeight: '100vh',
      backgroundColor: colors.black,
      color: colors.white,
      fontFamily: 'system-ui, -apple-system, sans-serif',
    },
    header: {
      padding: '20px',
      borderBottom: `2px solid ${colors.purple}`,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: '10px',
    },
    title: {
      fontSize: '22px',
      fontWeight: 'bold',
      color: colors.orange,
      margin: 0,
    },
    nav: {
      display: 'flex',
      gap: '8px',
      flexWrap: 'wrap',
    },
    navButton: (active) => ({
      padding: '8px 16px',
      backgroundColor: active ? colors.purple : 'transparent',
      color: colors.white,
      border: `1px solid ${colors.purple}`,
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: '14px',
    }),
    main: {
      padding: '20px',
      maxWidth: '900px',
      margin: '0 auto',
    },
    card: {
      backgroundColor: colors.grey + '33',
      borderRadius: '8px',
      padding: '25px',
      marginBottom: '20px',
      border: `1px solid ${colors.grey}`,
    },
    button: (color = colors.purple) => ({
      padding: '12px 24px',
      backgroundColor: color,
      color: colors.white,
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: '16px',
      fontWeight: '500',
    }),
    propCard: {
      backgroundColor: colors.black,
      borderRadius: '8px',
      padding: '25px',
      marginBottom: '20px',
      border: `2px solid ${colors.orange}`,
    },
    propText: {
      fontSize: '20px',
      lineHeight: 1.6,
      marginBottom: '15px',
    },
    propMeta: {
      fontSize: '13px',
      color: colors.grey,
      marginBottom: '20px',
    },
    actionButtons: {
      display: 'flex',
      gap: '12px',
      flexWrap: 'wrap',
    },
    graphContainer: {
      width: '100%',
      height: '500px',
      backgroundColor: colors.black,
      borderRadius: '8px',
      border: `2px solid ${colors.purple}`,
    },
    statBox: {
      display: 'inline-block',
      padding: '12px 20px',
      backgroundColor: colors.grey + '33',
      borderRadius: '8px',
      marginRight: '10px',
      marginBottom: '10px',
      textAlign: 'center',
    },
    textarea: {
      width: '100%',
      padding: '12px',
      backgroundColor: colors.black,
      color: colors.white,
      border: `1px solid ${colors.grey}`,
      borderRadius: '4px',
      fontSize: '14px',
      minHeight: '80px',
      marginBottom: '10px',
      resize: 'vertical',
    },
    tag: (color) => ({
      display: 'inline-block',
      padding: '3px 8px',
      backgroundColor: color + '44',
      color: color,
      borderRadius: '3px',
      fontSize: '12px',
      marginRight: '8px',
      textTransform: 'uppercase',
    }),
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>XU Worldview Mapper</h1>
        <nav style={styles.nav}>
          <button style={styles.navButton(view === 'home')} onClick={() => setView('home')}>Home</button>
          <button style={styles.navButton(view === 'review')} onClick={() => { setView('review'); setCurrentPropIndex(0); setFilterStatus('pending'); }}>Review</button>
          <button style={styles.navButton(view === 'graph')} onClick={() => setView('graph')}>Graph</button>
        </nav>
      </header>

      <main style={styles.main}>
        {/* HOME VIEW */}
        {view === 'home' && (
          <>
            <div style={styles.card}>
              <h2 style={{ marginTop: 0, color: colors.orange }}>Your Worldview Map</h2>
              <p style={{ fontSize: '16px', lineHeight: 1.6 }}>
                50 propositions have been extracted from the Experimental Unit Substack.
                Review each one - affirm what resonates, reject what doesn't, or add your nuance.
                Your responses build a map of your beliefs.
              </p>

              <div style={{ marginTop: '25px' }}>
                <div style={styles.statBox}>
                  <div style={{ fontSize: '28px', fontWeight: 'bold', color: colors.pending }}>{stats.pending}</div>
                  <div style={{ fontSize: '13px' }}>Pending</div>
                </div>
                <div style={styles.statBox}>
                  <div style={{ fontSize: '28px', fontWeight: 'bold', color: colors.affirmed }}>{stats.affirmed}</div>
                  <div style={{ fontSize: '13px' }}>Affirmed</div>
                </div>
                <div style={styles.statBox}>
                  <div style={{ fontSize: '28px', fontWeight: 'bold', color: colors.rejected }}>{stats.rejected}</div>
                  <div style={{ fontSize: '13px' }}>Rejected</div>
                </div>
                <div style={styles.statBox}>
                  <div style={{ fontSize: '28px', fontWeight: 'bold', color: colors.nuanced }}>{stats.nuanced}</div>
                  <div style={{ fontSize: '13px' }}>Nuanced</div>
                </div>
              </div>

              <div style={{ marginTop: '25px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                {stats.pending > 0 && (
                  <button style={styles.button(colors.orange)} onClick={() => { setView('review'); setFilterStatus('pending'); setCurrentPropIndex(0); }}>
                    Start Reviewing ({stats.pending} left)
                  </button>
                )}
                {stats.total - stats.pending > 0 && (
                  <button style={styles.button(colors.forest)} onClick={() => setView('graph')}>
                    View Your Graph
                  </button>
                )}
              </div>

              <div style={{ marginTop: '30px', paddingTop: '20px', borderTop: `1px solid ${colors.grey}` }}>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <button style={styles.button(colors.grey)} onClick={exportWorldview}>
                    Export
                  </button>
                  <button style={styles.button(colors.grey)} onClick={resetWorldview}>
                    Reset
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* REVIEW VIEW */}
        {view === 'review' && (
          <>
            <div style={{ marginBottom: '15px', display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '14px' }}>Show:</span>
              {['pending', 'affirmed', 'rejected', 'nuanced', 'all'].map(status => (
                <button
                  key={status}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: filterStatus === status
                      ? (status === 'affirmed' ? colors.affirmed
                        : status === 'rejected' ? colors.rejected
                        : status === 'nuanced' ? colors.nuanced
                        : status === 'pending' ? colors.pending
                        : colors.purple)
                      : 'transparent',
                    color: colors.white,
                    border: `1px solid ${colors.grey}`,
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '13px',
                  }}
                  onClick={() => { setFilterStatus(status); setCurrentPropIndex(0); }}
                >
                  {status} {status !== 'all' && `(${stats[status]})`}
                </button>
              ))}
            </div>

            {sortedProps.length === 0 ? (
              <div style={styles.card}>
                <p>No propositions in this category.</p>
                <button style={styles.button(colors.purple)} onClick={() => setFilterStatus('all')}>
                  Show All
                </button>
              </div>
            ) : (
              <>
                <div style={{ marginBottom: '15px', fontSize: '14px', color: colors.grey }}>
                  {currentPropIndex + 1} of {sortedProps.length}
                </div>

                <div style={styles.propCard}>
                  <div style={{ marginBottom: '12px' }}>
                    {currentProp?.foundational && <span style={styles.tag(colors.neonYellow)}>Foundational</span>}
                    {currentProp?.category && <span style={styles.tag(colors.oceanBlue)}>{currentProp.category}</span>}
                  </div>

                  <div style={styles.propText}>
                    "{currentProp?.text}"
                  </div>

                  {currentProp?.sourceExcerpt && (
                    <div style={styles.propMeta}>
                      <div style={{ marginBottom: '5px' }}><strong>Source:</strong> {currentProp.sourceTitle}</div>
                      <div><em>"{currentProp.sourceExcerpt}"</em></div>
                    </div>
                  )}

                  {currentProp?.status === 'nuanced' && currentProp?.nuance && (
                    <div style={{ padding: '12px', backgroundColor: colors.nuanced + '22', borderRadius: '4px', marginBottom: '15px' }}>
                      <strong>Your nuance:</strong> {currentProp.nuance}
                    </div>
                  )}

                  {filterStatus === 'pending' && (
                    <>
                      {showNuanceInput ? (
                        <div style={{ marginBottom: '15px' }}>
                          <textarea
                            style={styles.textarea}
                            value={nuanceInput}
                            onChange={(e) => setNuanceInput(e.target.value)}
                            placeholder="How would you nuance or modify this belief?"
                            autoFocus
                          />
                          <div style={{ display: 'flex', gap: '10px' }}>
                            <button style={styles.button(colors.nuanced)} onClick={handleNuance}>
                              Save Nuance
                            </button>
                            <button style={styles.button(colors.grey)} onClick={() => { setShowNuanceInput(false); setNuanceInput(''); }}>
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div style={styles.actionButtons}>
                          <button style={styles.button(colors.affirmed)} onClick={handleAffirm}>
                            Affirm
                          </button>
                          <button style={styles.button(colors.rejected)} onClick={handleReject}>
                            Reject
                          </button>
                          <button style={styles.button(colors.nuanced)} onClick={() => setShowNuanceInput(true)}>
                            Nuance
                          </button>
                          <button style={styles.button(colors.grey)} onClick={goToNext}>
                            Skip
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    style={styles.button(colors.grey)}
                    onClick={() => setCurrentPropIndex(Math.max(0, currentPropIndex - 1))}
                    disabled={currentPropIndex === 0}
                  >
                    ← Prev
                  </button>
                  <button
                    style={styles.button(colors.grey)}
                    onClick={() => setCurrentPropIndex(Math.min(sortedProps.length - 1, currentPropIndex + 1))}
                    disabled={currentPropIndex >= sortedProps.length - 1}
                  >
                    Next →
                  </button>
                </div>
              </>
            )}
          </>
        )}

        {/* GRAPH VIEW */}
        {view === 'graph' && (
          <>
            <div style={{ marginBottom: '15px' }}>
              <h2 style={{ marginTop: 0, color: colors.orange }}>Your Worldview</h2>
              <p style={{ fontSize: '14px', color: colors.grey }}>
                Diamonds = foundational beliefs. Green = affirmed, Red = rejected, Orange = nuanced.
                Hover for full text.
              </p>
            </div>

            {worldview.propositions.filter(p => p.status !== 'pending').length === 0 ? (
              <div style={styles.card}>
                <p>Review some propositions first to build your graph.</p>
                <button style={styles.button(colors.orange)} onClick={() => { setView('review'); setFilterStatus('pending'); }}>
                  Start Reviewing
                </button>
              </div>
            ) : (
              <div ref={graphRef} style={styles.graphContainer} />
            )}
          </>
        )}
      </main>
    </div>
  );
}
