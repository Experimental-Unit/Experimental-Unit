import React, { useState, useEffect, useRef } from 'react';
import substackPosts from './substack-posts.json';

// Color palette from TECHNICAL.md
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

// Chunk text for processing
const chunkText = (text, maxChars = 6000) => {
  const chunks = [];
  const paragraphs = text.split(/\n\n+/);
  let currentChunk = '';

  for (const para of paragraphs) {
    if (currentChunk.length + para.length > maxChars && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      currentChunk = para;
    } else {
      currentChunk += '\n\n' + para;
    }
  }
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }
  return chunks;
};

// Extract propositions using LLM
const extractPropositions = async (text, apiKey, provider = 'anthropic') => {
  const prompt = `Analyze this text and extract the key propositions, beliefs, and claims being made. For each proposition:
1. State it clearly and concisely
2. Identify if it's FOUNDATIONAL (a core belief about reality, ethics, existence, or first principles) or DERIVATIVE (a claim that builds on or follows from other beliefs)
3. Suggest a category: metaphysics, epistemology, ethics, politics, aesthetics, psychology, or other

Return as JSON array:
[
  {
    "text": "The proposition stated clearly",
    "foundational": true/false,
    "category": "category name",
    "sourceExcerpt": "brief quote from original text"
  }
]

Extract 5-15 propositions from this text. Focus on substantive claims, not descriptions or observations.

TEXT:
${text}

Return ONLY valid JSON, no other text.`;

  if (provider === 'anthropic') {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API error: ${error}`);
    }

    const data = await response.json();
    const content = data.content[0].text;

    // Parse JSON from response
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error('Could not parse propositions from response');
  } else if (provider === 'openai') {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 4096,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API error: ${error}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;

    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error('Could not parse propositions from response');
  }
};

// Parse HTML to plain text
const htmlToText = (html) => {
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent || div.innerText || '';
};

export default function App() {
  // App state
  const [view, setView] = useState('home'); // home, import, review, graph, settings

  // API settings
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('xu_api_key') || '');
  const [apiProvider, setApiProvider] = useState(() => localStorage.getItem('xu_api_provider') || 'anthropic');

  // Worldview data
  const [worldview, setWorldview] = useState(() => {
    const saved = localStorage.getItem('xu_worldview');
    return saved ? JSON.parse(saved) : {
      id: generateId(),
      label: 'My Worldview',
      propositions: [],
      connections: [],
      metadata: { createdAt: Date.now(), postCount: 0 }
    };
  });

  // Import state
  const [importText, setImportText] = useState('');
  const [importProgress, setImportProgress] = useState(null);
  const [importError, setImportError] = useState(null);

  // Review state
  const [currentPropIndex, setCurrentPropIndex] = useState(0);
  const [filterStatus, setFilterStatus] = useState('pending');

  // Graph state
  const graphRef = useRef(null);
  const networkRef = useRef(null);

  // Save worldview to localStorage
  useEffect(() => {
    localStorage.setItem('xu_worldview', JSON.stringify(worldview));
  }, [worldview]);

  // Save API settings
  useEffect(() => {
    localStorage.setItem('xu_api_key', apiKey);
    localStorage.setItem('xu_api_provider', apiProvider);
  }, [apiKey, apiProvider]);

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

  // Import text and extract propositions
  const handleImport = async () => {
    if (!apiKey) {
      setImportError('Please set your API key in Settings first');
      return;
    }
    if (!importText.trim()) {
      setImportError('Please paste some text to import');
      return;
    }

    setImportError(null);
    setImportProgress({ current: 0, total: 0, status: 'Preparing text...' });

    try {
      const chunks = chunkText(importText);
      setImportProgress({ current: 0, total: chunks.length, status: 'Extracting propositions...' });

      const allPropositions = [];

      for (let i = 0; i < chunks.length; i++) {
        setImportProgress({
          current: i + 1,
          total: chunks.length,
          status: `Processing chunk ${i + 1} of ${chunks.length}...`
        });

        try {
          const props = await extractPropositions(chunks[i], apiKey, apiProvider);

          for (const prop of props) {
            allPropositions.push({
              id: generateId(),
              text: prop.text,
              foundational: prop.foundational,
              category: prop.category,
              sourceExcerpt: prop.sourceExcerpt,
              status: 'pending',
              nuance: '',
              confidence: 0.5,
              createdAt: Date.now(),
            });
          }
        } catch (err) {
          console.error(`Error processing chunk ${i}:`, err);
        }

        // Small delay to avoid rate limiting
        await new Promise(r => setTimeout(r, 500));
      }

      setWorldview(prev => ({
        ...prev,
        propositions: [...prev.propositions, ...allPropositions],
        metadata: {
          ...prev.metadata,
          postCount: prev.metadata.postCount + 1,
          totalPropositions: prev.propositions.length + allPropositions.length,
        }
      }));

      setImportProgress({ current: chunks.length, total: chunks.length, status: 'Done!' });
      setImportText('');

      setTimeout(() => {
        setImportProgress(null);
        setView('review');
      }, 1500);

    } catch (err) {
      setImportError(`Import failed: ${err.message}`);
      setImportProgress(null);
    }
  };

  // Handle file upload
  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    let allText = '';

    for (const file of files) {
      const text = await file.text();
      if (file.name.endsWith('.html')) {
        allText += '\n\n---\n\n' + htmlToText(text);
      } else {
        allText += '\n\n---\n\n' + text;
      }
    }

    setImportText(allText.trim());
  };

  // Process bundled Substack posts
  const [substackProgress, setSubstackProgress] = useState(null);
  const [substackProcessing, setSubstackProcessing] = useState(false);

  const handleProcessSubstack = async () => {
    if (!apiKey) {
      alert('Please set your API key in Settings first');
      setView('settings');
      return;
    }

    setSubstackProcessing(true);
    setSubstackProgress({ current: 0, total: substackPosts.length, status: 'Starting...' });

    const allPropositions = [];
    const processedPostIds = new Set(
      worldview.propositions.map(p => p.sourceId).filter(Boolean)
    );

    // Filter out already processed posts
    const postsToProcess = substackPosts.filter(p => !processedPostIds.has(p.id));

    for (let i = 0; i < postsToProcess.length; i++) {
      const post = postsToProcess[i];
      setSubstackProgress({
        current: i + 1,
        total: postsToProcess.length,
        status: `Processing: ${post.title.substring(0, 40)}...`
      });

      try {
        // Take first 6000 chars of each post
        const textChunk = post.text.substring(0, 6000);
        const props = await extractPropositions(textChunk, apiKey, apiProvider);

        for (const prop of props) {
          allPropositions.push({
            id: generateId(),
            text: prop.text,
            foundational: prop.foundational,
            category: prop.category,
            sourceExcerpt: prop.sourceExcerpt,
            sourceId: post.id,
            sourceTitle: post.title,
            status: 'pending',
            nuance: '',
            confidence: 0.5,
            createdAt: Date.now(),
          });
        }

        // Save progress every 10 posts
        if (allPropositions.length > 0 && i % 10 === 9) {
          setWorldview(prev => ({
            ...prev,
            propositions: [...prev.propositions, ...allPropositions.splice(0)],
            metadata: {
              ...prev.metadata,
              postCount: i + 1,
            }
          }));
        }
      } catch (err) {
        console.error(`Error processing post ${post.id}:`, err);
      }

      // Delay to avoid rate limiting
      await new Promise(r => setTimeout(r, 1000));
    }

    // Save any remaining propositions
    if (allPropositions.length > 0) {
      setWorldview(prev => ({
        ...prev,
        propositions: [...prev.propositions, ...allPropositions],
        metadata: {
          ...prev.metadata,
          postCount: postsToProcess.length,
        }
      }));
    }

    setSubstackProgress({ current: postsToProcess.length, total: postsToProcess.length, status: 'Done!' });
    setSubstackProcessing(false);

    setTimeout(() => {
      setSubstackProgress(null);
      setView('review');
    }, 2000);
  };

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
      if (currentPropIndex < sortedProps.length - 1) {
        setCurrentPropIndex(currentPropIndex + 1);
      }
    }
  };

  const handleReject = () => {
    if (currentProp) {
      updateProp(currentProp.id, { status: 'rejected' });
      if (currentPropIndex < sortedProps.length - 1) {
        setCurrentPropIndex(currentPropIndex + 1);
      }
    }
  };

  const handleNuance = (nuanceText) => {
    if (currentProp) {
      updateProp(currentProp.id, { status: 'nuanced', nuance: nuanceText });
      if (currentPropIndex < sortedProps.length - 1) {
        setCurrentPropIndex(currentPropIndex + 1);
      }
    }
  };

  // Render graph visualization
  const renderGraph = async () => {
    if (!graphRef.current) return;

    const reviewed = worldview.propositions.filter(p => p.status !== 'pending');
    if (reviewed.length === 0) return;

    const nodes = reviewed.map(p => ({
      id: p.id,
      label: p.text.substring(0, 50) + (p.text.length > 50 ? '...' : ''),
      title: p.text + (p.nuance ? `\n\nNuance: ${p.nuance}` : ''),
      color: p.status === 'affirmed' ? colors.affirmed
           : p.status === 'rejected' ? colors.rejected
           : colors.nuanced,
      shape: p.foundational ? 'diamond' : 'ellipse',
      size: p.foundational ? 30 : 20,
      font: { color: colors.white },
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
    a.download = `worldview-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Import worldview
  const importWorldview = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        setWorldview(data);
      } catch (err) {
        alert('Could not read worldview file');
      }
    };
    reader.readAsText(file);
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
    },
    title: {
      fontSize: '24px',
      fontWeight: 'bold',
      color: colors.orange,
      margin: 0,
    },
    nav: {
      display: 'flex',
      gap: '10px',
    },
    navButton: (active) => ({
      padding: '10px 20px',
      backgroundColor: active ? colors.purple : 'transparent',
      color: colors.white,
      border: `1px solid ${colors.purple}`,
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: '14px',
    }),
    main: {
      padding: '30px',
      maxWidth: '1200px',
      margin: '0 auto',
    },
    card: {
      backgroundColor: colors.grey + '33',
      borderRadius: '8px',
      padding: '25px',
      marginBottom: '20px',
      border: `1px solid ${colors.grey}`,
    },
    textarea: {
      width: '100%',
      minHeight: '300px',
      padding: '15px',
      backgroundColor: colors.black,
      color: colors.white,
      border: `1px solid ${colors.grey}`,
      borderRadius: '4px',
      fontSize: '14px',
      resize: 'vertical',
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
    input: {
      padding: '10px',
      backgroundColor: colors.black,
      color: colors.white,
      border: `1px solid ${colors.grey}`,
      borderRadius: '4px',
      fontSize: '14px',
      width: '100%',
    },
    propCard: {
      backgroundColor: colors.black,
      borderRadius: '8px',
      padding: '30px',
      marginBottom: '20px',
      border: `2px solid ${colors.orange}`,
    },
    propText: {
      fontSize: '20px',
      lineHeight: 1.6,
      marginBottom: '20px',
    },
    propMeta: {
      fontSize: '14px',
      color: colors.grey,
      marginBottom: '20px',
    },
    actionButtons: {
      display: 'flex',
      gap: '15px',
      flexWrap: 'wrap',
    },
    graphContainer: {
      width: '100%',
      height: '600px',
      backgroundColor: colors.black,
      borderRadius: '8px',
      border: `2px solid ${colors.purple}`,
    },
    statBox: {
      display: 'inline-block',
      padding: '15px 25px',
      backgroundColor: colors.grey + '33',
      borderRadius: '8px',
      marginRight: '15px',
      marginBottom: '15px',
      textAlign: 'center',
    },
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>Experimental Unit Worldview Mapper</h1>
        <nav style={styles.nav}>
          <button style={styles.navButton(view === 'home')} onClick={() => setView('home')}>Home</button>
          <button style={styles.navButton(view === 'import')} onClick={() => setView('import')}>Import</button>
          <button style={styles.navButton(view === 'review')} onClick={() => { setView('review'); setCurrentPropIndex(0); }}>Review</button>
          <button style={styles.navButton(view === 'graph')} onClick={() => setView('graph')}>Graph</button>
          <button style={styles.navButton(view === 'settings')} onClick={() => setView('settings')}>Settings</button>
        </nav>
      </header>

      <main style={styles.main}>
        {/* HOME VIEW */}
        {view === 'home' && (
          <>
            <div style={styles.card}>
              <h2 style={{ marginTop: 0, color: colors.orange }}>Welcome to the Worldview Mapper</h2>
              <p style={{ fontSize: '16px', lineHeight: 1.6, color: colors.white }}>
                This tool helps you discover and map your beliefs by extracting propositions from your writing.
                Paste in text, and the system will identify the claims and beliefs embedded in your words.
                Then you can affirm, reject, or nuance each one to build your personal worldview graph.
              </p>

              <div style={{ marginTop: '30px' }}>
                <div style={styles.statBox}>
                  <div style={{ fontSize: '32px', fontWeight: 'bold', color: colors.orange }}>{stats.total}</div>
                  <div>Total Propositions</div>
                </div>
                <div style={styles.statBox}>
                  <div style={{ fontSize: '32px', fontWeight: 'bold', color: colors.pending }}>{stats.pending}</div>
                  <div>Pending Review</div>
                </div>
                <div style={styles.statBox}>
                  <div style={{ fontSize: '32px', fontWeight: 'bold', color: colors.affirmed }}>{stats.affirmed}</div>
                  <div>Affirmed</div>
                </div>
                <div style={styles.statBox}>
                  <div style={{ fontSize: '32px', fontWeight: 'bold', color: colors.rejected }}>{stats.rejected}</div>
                  <div>Rejected</div>
                </div>
                <div style={styles.statBox}>
                  <div style={{ fontSize: '32px', fontWeight: 'bold', color: colors.nuanced }}>{stats.nuanced}</div>
                  <div>Nuanced</div>
                </div>
              </div>

              {/* Substack Processing Section */}
              <div style={{ marginTop: '30px', padding: '20px', backgroundColor: colors.purple + '22', borderRadius: '8px', border: `2px solid ${colors.purple}` }}>
                <h3 style={{ marginTop: 0, color: colors.purple }}>Your Substack: {substackPosts.length} posts bundled</h3>

                {substackProgress ? (
                  <div>
                    <div style={{ marginBottom: '10px' }}>{substackProgress.status}</div>
                    <div style={{ height: '8px', backgroundColor: colors.grey, borderRadius: '4px' }}>
                      <div style={{
                        height: '100%',
                        width: `${(substackProgress.current / substackProgress.total) * 100}%`,
                        backgroundColor: colors.orange,
                        borderRadius: '4px',
                        transition: 'width 0.3s ease',
                      }} />
                    </div>
                    <div style={{ marginTop: '10px', fontSize: '14px', color: colors.grey }}>
                      {substackProgress.current} / {substackProgress.total} posts
                    </div>
                  </div>
                ) : (
                  <div>
                    <p style={{ marginBottom: '15px' }}>
                      Click below to extract propositions from your Experimental Unit Substack posts.
                      This will take a while (about 1 second per post) and use your API credits.
                    </p>
                    <button
                      style={styles.button(colors.orange)}
                      onClick={handleProcessSubstack}
                      disabled={substackProcessing}
                    >
                      Process My Substack ({substackPosts.length} posts)
                    </button>
                  </div>
                )}
              </div>

              <div style={{ marginTop: '30px', display: 'flex', gap: '15px' }}>
                {stats.pending > 0 && (
                  <button style={styles.button(colors.orange)} onClick={() => { setView('review'); setFilterStatus('pending'); }}>
                    Review {stats.pending} Pending
                  </button>
                )}
                <button style={styles.button(colors.grey)} onClick={() => setView('import')}>
                  Import Other Text
                </button>
                {stats.total > 0 && (
                  <button style={styles.button(colors.forest)} onClick={() => setView('graph')}>
                    View Graph
                  </button>
                )}
              </div>
            </div>
          </>
        )}

        {/* IMPORT VIEW */}
        {view === 'import' && (
          <>
            <div style={styles.card}>
              <h2 style={{ marginTop: 0, color: colors.orange }}>Import Text</h2>
              <p>Paste in your writing - blog posts, essays, journals, manifestos - and the system will extract the propositions and beliefs embedded within.</p>

              {!apiKey && (
                <div style={{ padding: '15px', backgroundColor: colors.red + '33', borderRadius: '4px', marginBottom: '20px' }}>
                  You need to set an API key in Settings before importing.
                  <button style={{ ...styles.button(colors.purple), marginLeft: '15px', padding: '8px 16px' }} onClick={() => setView('settings')}>
                    Go to Settings
                  </button>
                </div>
              )}

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '10px' }}>
                  <strong>Upload files:</strong>
                </label>
                <input
                  type="file"
                  multiple
                  accept=".txt,.html,.md"
                  onChange={handleFileUpload}
                  style={{ color: colors.white }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '10px' }}>
                  <strong>Or paste text directly:</strong>
                </label>
                <textarea
                  style={styles.textarea}
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  placeholder="Paste your text here... The more you paste, the more propositions will be extracted. Works best with essays, blog posts, and substantive writing."
                />
              </div>

              {importError && (
                <div style={{ padding: '15px', backgroundColor: colors.red + '33', borderRadius: '4px', marginBottom: '20px' }}>
                  {importError}
                </div>
              )}

              {importProgress && (
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ marginBottom: '10px' }}>{importProgress.status}</div>
                  {importProgress.total > 0 && (
                    <div style={{ height: '8px', backgroundColor: colors.grey, borderRadius: '4px' }}>
                      <div style={{
                        height: '100%',
                        width: `${(importProgress.current / importProgress.total) * 100}%`,
                        backgroundColor: colors.orange,
                        borderRadius: '4px',
                        transition: 'width 0.3s ease',
                      }} />
                    </div>
                  )}
                </div>
              )}

              <button
                style={styles.button(colors.orange)}
                onClick={handleImport}
                disabled={!importText.trim() || !apiKey || importProgress}
              >
                {importProgress ? 'Processing...' : 'Extract Propositions'}
              </button>
            </div>
          </>
        )}

        {/* REVIEW VIEW */}
        {view === 'review' && (
          <>
            <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', alignItems: 'center' }}>
              <span>Filter:</span>
              {['pending', 'affirmed', 'rejected', 'nuanced', 'all'].map(status => (
                <button
                  key={status}
                  style={{
                    ...styles.navButton(filterStatus === status),
                    backgroundColor: filterStatus === status
                      ? (status === 'affirmed' ? colors.affirmed
                        : status === 'rejected' ? colors.rejected
                        : status === 'nuanced' ? colors.nuanced
                        : status === 'pending' ? colors.pending
                        : colors.purple)
                      : 'transparent',
                  }}
                  onClick={() => { setFilterStatus(status); setCurrentPropIndex(0); }}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                  {status !== 'all' && ` (${stats[status]})`}
                </button>
              ))}
            </div>

            {sortedProps.length === 0 ? (
              <div style={styles.card}>
                <p>No propositions to review. <button style={{ color: colors.orange, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }} onClick={() => setView('import')}>Import some text</button> to get started.</p>
              </div>
            ) : (
              <>
                <div style={{ marginBottom: '20px', color: colors.grey }}>
                  Proposition {currentPropIndex + 1} of {sortedProps.length}
                  {currentProp?.foundational && <span style={{ marginLeft: '10px', color: colors.neonYellow }}>FOUNDATIONAL</span>}
                  {currentProp?.category && <span style={{ marginLeft: '10px', color: colors.oceanBlue }}>{currentProp.category}</span>}
                </div>

                <div style={styles.propCard}>
                  <div style={styles.propText}>
                    "{currentProp?.text}"
                  </div>

                  {currentProp?.sourceExcerpt && (
                    <div style={styles.propMeta}>
                      <em>From: "{currentProp.sourceExcerpt}"</em>
                    </div>
                  )}

                  {filterStatus === 'pending' && (
                    <div style={styles.actionButtons}>
                      <button style={styles.button(colors.affirmed)} onClick={handleAffirm}>
                        Affirm - I believe this
                      </button>
                      <button style={styles.button(colors.rejected)} onClick={handleReject}>
                        Reject - I don't believe this
                      </button>
                      <button
                        style={styles.button(colors.nuanced)}
                        onClick={() => {
                          const nuance = prompt('How would you nuance or modify this belief?');
                          if (nuance) handleNuance(nuance);
                        }}
                      >
                        Nuance - It's complicated
                      </button>
                      <button
                        style={styles.button(colors.grey)}
                        onClick={() => setCurrentPropIndex(Math.min(currentPropIndex + 1, sortedProps.length - 1))}
                      >
                        Skip for now
                      </button>
                    </div>
                  )}

                  {currentProp?.status === 'nuanced' && currentProp?.nuance && (
                    <div style={{ marginTop: '20px', padding: '15px', backgroundColor: colors.nuanced + '22', borderRadius: '4px' }}>
                      <strong>Your nuance:</strong> {currentProp.nuance}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    style={styles.button(colors.grey)}
                    onClick={() => setCurrentPropIndex(Math.max(0, currentPropIndex - 1))}
                    disabled={currentPropIndex === 0}
                  >
                    Previous
                  </button>
                  <button
                    style={styles.button(colors.grey)}
                    onClick={() => setCurrentPropIndex(Math.min(sortedProps.length - 1, currentPropIndex + 1))}
                    disabled={currentPropIndex >= sortedProps.length - 1}
                  >
                    Next
                  </button>
                </div>
              </>
            )}
          </>
        )}

        {/* GRAPH VIEW */}
        {view === 'graph' && (
          <>
            <div style={{ marginBottom: '20px' }}>
              <h2 style={{ marginTop: 0, color: colors.orange }}>Worldview Graph</h2>
              <p>Your beliefs visualized. Diamonds are foundational beliefs. Colors show your response: green = affirmed, red = rejected, orange = nuanced.</p>
            </div>

            {worldview.propositions.filter(p => p.status !== 'pending').length === 0 ? (
              <div style={styles.card}>
                <p>Review some propositions first to see your worldview graph.</p>
                <button style={styles.button(colors.orange)} onClick={() => setView('review')}>
                  Go to Review
                </button>
              </div>
            ) : (
              <div ref={graphRef} style={styles.graphContainer} />
            )}
          </>
        )}

        {/* SETTINGS VIEW */}
        {view === 'settings' && (
          <>
            <div style={styles.card}>
              <h2 style={{ marginTop: 0, color: colors.orange }}>Settings</h2>

              <div style={{ marginBottom: '30px' }}>
                <h3>API Configuration</h3>
                <p style={{ color: colors.grey }}>
                  Your API key is stored only in your browser - it's never sent to any server except the AI provider you choose.
                </p>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '10px' }}>Provider:</label>
                  <select
                    value={apiProvider}
                    onChange={(e) => setApiProvider(e.target.value)}
                    style={{ ...styles.input, width: 'auto', minWidth: '200px' }}
                  >
                    <option value="anthropic">Anthropic (Claude)</option>
                    <option value="openai">OpenAI (GPT-4)</option>
                  </select>
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '10px' }}>API Key:</label>
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder={apiProvider === 'anthropic' ? 'sk-ant-...' : 'sk-...'}
                    style={styles.input}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '30px' }}>
                <h3>Data Management</h3>

                <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                  <button style={styles.button(colors.forest)} onClick={exportWorldview}>
                    Export Worldview
                  </button>

                  <label style={styles.button(colors.oceanBlue)}>
                    Import Worldview
                    <input
                      type="file"
                      accept=".json"
                      onChange={importWorldview}
                      style={{ display: 'none' }}
                    />
                  </label>

                  <button
                    style={styles.button(colors.red)}
                    onClick={() => {
                      if (confirm('Are you sure you want to clear all propositions? This cannot be undone.')) {
                        setWorldview({
                          id: generateId(),
                          label: 'My Worldview',
                          propositions: [],
                          connections: [],
                          metadata: { createdAt: Date.now(), postCount: 0 }
                        });
                      }
                    }}
                  >
                    Clear All Data
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
