
import React, { useState, useEffect, useRef } from 'react';

// Dynamically load vis-network from CDN
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

export default function App() {
  // Session state
  const [sessionLabel, setSessionLabel] = useState('');
  const [sessionStarted, setSessionStarted] = useState(false);
  
  // Graph data
  const [triples, setTriples] = useState([]);
  const [nodesMap, setNodesMap] = useState({});
  const [counters, setCounters] = useState({ entity: 1, property: 1 });
  
  // Search state with debouncing
  const [e1Query, setE1Query] = useState('');
  const [e1Results, setE1Results] = useState([]);
  const [e1Selected, setE1Selected] = useState(null);
  
  const [pQuery, setPQuery] = useState('');
  const [pResults, setPResults] = useState([]);
  const [pSelected, setPSelected] = useState(null);
  
  const [e2Query, setE2Query] = useState('');
  const [e2Results, setE2Results] = useState([]);
  const [e2Selected, setE2Selected] = useState(null);
  
  // Graph visualization
  const [selectedNodeInGraph, setSelectedNodeInGraph] = useState(null);
  const graphRef = useRef(null);
  const networkRef = useRef(null);

  const isProperty = (id) => id.includes('-P') || id.startsWith('P');

  // Debounced Wikidata search
  const debounceSearch = (query, type, setter) => {
    if (!query.trim()) {
      setter([]);
      return;
    }
    
    const timer = setTimeout(async () => {
      try {
        const url = type === 'property'
          ? `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(query)}&language=en&type=property&format=json&origin=*`
          : `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(query)}&language=en&type=item&format=json&origin=*`;

        const response = await fetch(url);
        const data = await response.json();
        setter(data.search || []);
      } catch (err) {
        console.error('Search error:', err);
        setter([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  };

  // Debounce hooks
  useEffect(() => debounceSearch(e1Query, 'item', setE1Results), [e1Query]);
  useEffect(() => debounceSearch(e2Query, 'item', setE2Results), [e2Query]);
  useEffect(() => debounceSearch(pQuery, 'property', setPResults), [pQuery]);

  const startSession = () => {
    if (!sessionLabel.trim()) {
      alert('Please enter a session label.');
      return;
    }
    setSessionStarted(true);
  };

  const selectResult = (item, type) => {
    const label = `${item.label} (${item.id})`;
    if (type === 'e1') {
      setE1Selected({ id: item.id, label });
      setE1Query(item.label);
      setE1Results([]);
    } else if (type === 'e2') {
      setE2Selected({ id: item.id, label });
      setE2Query(item.label);
      setE2Results([]);
    } else if (type === 'p') {
      setPSelected({ id: item.id, label });
      setPQuery(item.label);
      setPResults([]);
    }
  };

  const createNewNode = (type) => {
    let id, nodeId;
    if (type === 'property') {
      id = `P${counters.property}`;
      setCounters({ ...counters, property: counters.property + 1 });
      nodeId = `${sessionLabel}-${id}`;
    } else {
      id = `Q${counters.entity}`;
      setCounters({ ...counters, entity: counters.entity + 1 });
      nodeId = `${sessionLabel}-${id}`;
    }

    const labelInput = prompt(`Enter label for new ${type}:`) || `${sessionLabel}-${id}`;
    const label = `${labelInput} (${nodeId})`;

    setNodesMap({ ...nodesMap, [nodeId]: labelInput });

    if (type === 'property') {
      setPSelected({ id: nodeId, label });
      setPQuery(labelInput);
    } else if (type === 'e1') {
      setE1Selected({ id: nodeId, label });
      setE1Query(labelInput);
    } else {
      setE2Selected({ id: nodeId, label });
      setE2Query(labelInput);
    }
  };

  const addTriple = () => {
    if (!e1Selected || !pSelected || !e2Selected) {
      alert('Select all three parts of the triple first.');
      return;
    }

    const triple = {
      e1Id: e1Selected.id,
      pId: pSelected.id,
      e2Id: e2Selected.id
    };

    setTriples([...triples, triple]);

    const newNodesMap = { ...nodesMap };
    newNodesMap[e1Selected.id] = e1Selected.label.split(' (')[0];
    newNodesMap[pSelected.id] = pSelected.label.split(' (')[0];
    newNodesMap[e2Selected.id] = e2Selected.label.split(' (')[0];
    setNodesMap(newNodesMap);

    setE1Selected(null);
    setPSelected(null);
    setE2Selected(null);
    setE1Query('');
    setPQuery('');
    setE2Query('');
  };

  const removeTriple = (idx) => {
    setTriples(triples.filter((_, i) => i !== idx));
  };

  const mergeGraphs = (graphData) => {
    const newNodesMap = { ...nodesMap };
    const newTriples = [...triples];

    // Merge nodes
    Object.assign(newNodesMap, graphData.nodesMap);

    // Merge triples (avoid duplicates)
    const tripleSet = new Set(triples.map(t => JSON.stringify(t)));
    graphData.triples.forEach(t => {
      if (!tripleSet.has(JSON.stringify(t))) {
        newTriples.push(t);
        tripleSet.add(JSON.stringify(t));
      }
    });

    setNodesMap(newNodesMap);
    setTriples(newTriples);
  };

  const importGraph = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.multiple = true;
    input.addEventListener('change', (e) => {
      Array.from(e.target.files).forEach(file => {
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const data = JSON.parse(event.target.result);
            if (!data.triples || !data.nodesMap) {
              alert(`Invalid file format: ${file.name}`);
              return;
            }
            
            if (!sessionStarted) {
              setSessionLabel(data.sessionLabel || 'imported-session');
              setSessionStarted(true);
            }
            mergeGraphs(data);
          } catch (err) {
            alert(`Error parsing ${file.name}: ${err.message}`);
          }
        };
        reader.readAsText(file);
      });
    });
    input.click();
  };

  const exportGraph = (format = 'json') => {
    let data, filename;

    if (format === 'jsonld') {
      // Convert to JSON-LD
      const context = {
        '@context': {
          'rdf': 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
          'rdfs': 'http://www.w3.org/2000/01/rdf-schema#',
          'wd': 'http://www.wikidata.org/entity/',
          'wdt': 'http://www.wikidata.org/prop/direct/'
        },
        '@graph': triples.map(t => ({
          '@id': t.e1Id.startsWith('Q') || t.e1Id.startsWith('P') ? `wd:${t.e1Id}` : t.e1Id,
          [t.pId.startsWith('P') ? `wdt:${t.pId}` : t.pId]: {
            '@id': t.e2Id.startsWith('Q') || t.e2Id.startsWith('P') ? `wd:${t.e2Id}` : t.e2Id
          }
        }))
      };
      data = JSON.stringify(context, null, 2);
      filename = `knowledge-graph-${sessionLabel}-${Date.now()}.jsonld`;
    } else {
      data = JSON.stringify({
        sessionLabel,
        timestamp: new Date().toISOString(),
        triples,
        nodesMap
      }, null, 2);
      filename = `knowledge-graph-${sessionLabel}-${Date.now()}.json`;
    }

    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const renderGraph = async () => {
    if (!graphRef.current || triples.length === 0) return;

    const nodes = [];
    const edges = [];
    const seen = new Set();

    triples.forEach(t => {
      if (!seen.has(t.e1Id)) {
        nodes.push({
          id: t.e1Id,
          label: nodesMap[t.e1Id] || t.e1Id,
          title: nodesMap[t.e1Id],
          color: '#FFE5B4',
          shape: 'ellipse'
        });
        seen.add(t.e1Id);
      }
      if (!seen.has(t.e2Id)) {
        nodes.push({
          id: t.e2Id,
          label: nodesMap[t.e2Id] || t.e2Id,
          title: nodesMap[t.e2Id],
          color: '#FFE5B4',
          shape: 'ellipse'
        });
        seen.add(t.e2Id);
      }
      if (!seen.has(t.pId)) {
        nodes.push({
          id: t.pId,
          label: nodesMap[t.pId] || t.pId,
          title: nodesMap[t.pId],
          color: '#B4D7FF',
          shape: 'diamond'
        });
        seen.add(t.pId);
      }

      edges.push({
        from: t.e1Id,
        to: t.pId,
        arrows: 'to',
        smooth: { type: 'cubicBezier' }
      });
      edges.push({
        from: t.pId,
        to: t.e2Id,
        arrows: 'to',
        smooth: { type: 'cubicBezier' }
      });
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
            stabilization: { iterations: 200 },
            barnesHut: {
              gravitationalConstant: -2000,
              springConstant: 0.04,
              springLength: 95
            }
          },
          interaction: {
            hover: true,
            tooltipDelay: 200
          }
        }
      );

      networkRef.current.on('click', (params) => {
        if (params.nodes.length > 0) {
          setSelectedNodeInGraph(params.nodes[0]);
        }
      });
    } catch (err) {
      console.error('Error loading vis-network:', err);
    }
  };

  const { entities, properties } = (() => {
    const e = [], p = [];
    Object.keys(nodesMap).forEach(id => {
      if (isProperty(id)) p.push({ id, label: nodesMap[id] });
      else e.push({ id, label: nodesMap[id] });
    });
    return {
      entities: e.sort((a, b) => a.label.localeCompare(b.label)),
      properties: p.sort((a, b) => a.label.localeCompare(b.label))
    };
  })();

  useEffect(() => {
    if (sessionStarted && triples.length > 0) {
      renderGraph();
    }
  }, [triples, nodesMap, sessionStarted]);

  return (
    <div style={{ padding: '20px', fontFamily: 'system-ui, -apple-system, sans-serif', backgroundColor: '#fafafa', minHeight: '100vh' }}>
      <h1 style={{ textAlign: 'center', marginBottom: '10px' }}>📊 Experimental Unit Triple Builder</h1>
      <p style={{ textAlign: 'center', color: '#666', marginBottom: '30px' }}>Build knowledge graphs with Wikidata integration</p>

      {!sessionStarted ? (
        <div style={{ maxWidth: '600px', margin: '0 auto', backgroundColor: 'white', padding: '30px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
          <p style={{ marginBottom: '15px', fontSize: '16px' }}>Welcome! Give a label to your session:</p>
          <input
            type="text"
            placeholder="e.g., my-research-notes"
            value={sessionLabel}
            onChange={(e) => setSessionLabel(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && startSession()}
            style={{ padding: '10px', marginRight: '10px', width: '250px', borderRadius: '4px', border: '1px solid #ddd', fontSize: '14px' }}
          />
          <button onClick={startSession} style={{ padding: '10px 20px', cursor: 'pointer', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px', fontSize: '14px', fontWeight: '500' }}>
            Start Session
          </button>
          <button onClick={importGraph} style={{ padding: '10px 20px', marginLeft: '10px', cursor: 'pointer', backgroundColor: '#2196F3', color: 'white', border: 'none', borderRadius: '4px', fontSize: '14px', fontWeight: '500' }}>
            Load Graph(s)
          </button>
          <p style={{ marginTop: '20px', fontSize: '14px', color: '#666' }}>
            Or load existing graph files to continue where you left off.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '20px', maxWidth: '1600px', margin: '0 auto' }}>
          {/* Main content */}
          <div>
            <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', marginBottom: '20px' }}>
              <h2 style={{ marginBottom: '15px', fontSize: '20px' }}>Build a Triple</h2>
              <p style={{ color: '#666', marginBottom: '20px', fontSize: '14px' }}>
                Session: <strong>{sessionLabel}</strong> | Triples: <strong>{triples.length}</strong>
              </p>

              {/* Entity 1 */}
              <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f9f9f9', borderRadius: '8px', border: '1px solid #e0e0e0' }}>
                <label style={{ fontWeight: '600', display: 'block', marginBottom: '8px' }}>Entity 1 (Subject):</label>
                <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                  <input
                    type="text"
                    placeholder="Search Wikidata entities..."
                    value={e1Query}
                    onChange={(e) => setE1Query(e.target.value)}
                    style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid #ddd', fontSize: '14px' }}
                  />
                  <button onClick={() => createNewNode('e1')} style={{ padding: '8px 16px', cursor: 'pointer', backgroundColor: '#FF9800', color: 'white', border: 'none', borderRadius: '4px', fontSize: '14px', whiteSpace: 'nowrap' }}>
                    + New Entity
                  </button>
                </div>
                {e1Selected && <p style={{ marginTop: '8px', color: '#4CAF50', fontWeight: '600', fontSize: '14px' }}>✓ {e1Selected.label}</p>}
                {e1Results.length > 0 && (
                  <ul style={{ listStyle: 'none', padding: '0', backgroundColor: 'white', borderRadius: '4px', maxHeight: '150px', overflow: 'auto', marginTop: '8px', border: '1px solid #ddd' }}>
                    {e1Results.map((item) => (
                      <li
                        key={item.id}
                        onClick={() => selectResult(item, 'e1')}
                        style={{ cursor: 'pointer', padding: '8px', borderBottom: '1px solid #f0f0f0', fontSize: '14px' }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                      >
                        <strong>{item.label}</strong> <span style={{ fontSize: '12px', color: '#999' }}>({item.id})</span>
                        {item.description && <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>{item.description}</div>}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Property */}
              <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f9f9f9', borderRadius: '8px', border: '1px solid #e0e0e0' }}>
                <label style={{ fontWeight: '600', display: 'block', marginBottom: '8px' }}>Property (Relationship):</label>
                <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                  <input
                    type="text"
                    placeholder="Search Wikidata properties..."
                    value={pQuery}
                    onChange={(e) => setPQuery(e.target.value)}
                    style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid #ddd', fontSize: '14px' }}
                  />
                  <button onClick={() => createNewNode('property')} style={{ padding: '8px 16px', cursor: 'pointer', backgroundColor: '#FF9800', color: 'white', border: 'none', borderRadius: '4px', fontSize: '14px', whiteSpace: 'nowrap' }}>
                    + New Property
                  </button>
                </div>
                {pSelected && <p style={{ marginTop: '8px', color: '#4CAF50', fontWeight: '600', fontSize: '14px' }}>✓ {pSelected.label}</p>}
                {pResults.length > 0 && (
                  <ul style={{ listStyle: 'none', padding: '0', backgroundColor: 'white', borderRadius: '4px', maxHeight: '150px', overflow: 'auto', marginTop: '8px', border: '1px solid #ddd' }}>
                    {pResults.map((item) => (
                      <li
                        key={item.id}
                        onClick={() => selectResult(item, 'p')}
                        style={{ cursor: 'pointer', padding: '8px', borderBottom: '1px solid #f0f0f0', fontSize: '14px' }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                      >
                        <strong>{item.label}</strong> <span style={{ fontSize: '12px', color: '#999' }}>({item.id})</span>
                        {item.description && <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>{item.description}</div>}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Entity 2 */}
              <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f9f9f9', borderRadius: '8px', border: '1px solid #e0e0e0' }}>
                <label style={{ fontWeight: '600', display: 'block', marginBottom: '8px' }}>Entity 2 (Object):</label>
                <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                  <input
                    type="text"
                    placeholder="Search Wikidata entities..."
                    value={e2Query}
                    onChange={(e) => setE2Query(e.target.value)}
                    style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid #ddd', fontSize: '14px' }}
                  />
                  <button onClick={() => createNewNode('entity')} style={{ padding: '8px 16px', cursor: 'pointer', backgroundColor: '#FF9800', color: 'white', border: 'none', borderRadius: '4px', fontSize: '14px', whiteSpace: 'nowrap' }}>
                    + New Entity
                  </button>
                </div>
                {e2Selected && <p style={{ marginTop: '8px', color: '#4CAF50', fontWeight: '600', fontSize: '14px' }}>✓ {e2Selected.label}</p>}
                {e2Results.length > 0 && (
                  <ul style={{ listStyle: 'none', padding: '0', backgroundColor: 'white', borderRadius: '4px', maxHeight: '150px', overflow: 'auto', marginTop: '8px', border: '1px solid #ddd' }}>
                    {e2Results.map((item) => (
                      <li
                        key={item.id}
                        onClick={() => selectResult(item, 'e2')}
                        style={{ cursor: 'pointer', padding: '8px', borderBottom: '1px solid #f0f0f0', fontSize: '14px' }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                      >
                        <strong>{item.label}</strong> <span style={{ fontSize: '12px', color: '#999' }}>({item.id})</span>
                        {item.description && <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>{item.description}</div>}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <button onClick={addTriple} style={{ padding: '12px 32px', cursor: 'pointer', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px', fontSize: '16px', fontWeight: '600', width: '100%' }}>
                ➕ Add Triple to Graph
              </button>
            </div>

            <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', marginBottom: '20px' }}>
              <h2 style={{ marginBottom: '15px', fontSize: '20px' }}>All Triples ({triples.length})</h2>
              {triples.length === 0 ? (
                <p style={{ color: '#999', textAlign: 'center', padding: '20px' }}>No triples yet. Start building your knowledge graph above!</p>
              ) : (
                <ul style={{ listStyle: 'none', padding: '0' }}>
                  {triples.map((t, idx) => (
                    <li key={idx} style={{ padding: '12px', backgroundColor: '#f9f9f9', borderRadius: '4px', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderLeft: '4px solid #2196F3' }}>
                      <span style={{ fontSize: '14px' }}>
                        <strong>{nodesMap[t.e1Id]}</strong> → <em style={{ color: '#2196F3' }}>{nodesMap[t.pId]}</em> → <strong>{nodesMap[t.e2Id]}</strong>
                      </span>
                      <button onClick={() => removeTriple(idx)} style={{ padding: '4px 12px', cursor: 'pointer', backgroundColor: '#f44336', color: 'white', border: 'none', borderRadius: '3px', fontSize: '12px' }}>
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <h2 style={{ fontSize: '20px', margin: 0 }}>Graph Visualization</h2>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={() => exportGraph('json')} style={{ padding: '8px 16px', cursor: 'pointer', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px', fontSize: '14px' }}>
                    📥 Export JSON
                  </button>
                  <button onClick={() => exportGraph('jsonld')} style={{ padding: '8px 16px', cursor: 'pointer', backgroundColor: '#2196F3', color: 'white', border: 'none', borderRadius: '4px', fontSize: '14px' }}>
                    📥 Export JSON-LD
                  </button>
                </div>
              </div>
              <div ref={graphRef} style={{ width: '100%', height: '500px', backgroundColor: '#fafafa', borderRadius: '8px', border: '2px solid #e0e0e0' }} />
              {triples.length === 0 && (
                <p style={{ textAlign: 'center', color: '#999', marginTop: '20px' }}>Add triples to see the graph visualization</p>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div style={{ backgroundColor: 'white', borderRadius: '8px', padding: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', position: 'sticky', top: '20px' }}>
              <h3 style={{ margin: '0 0 15px 0', fontSize: '16px', fontWeight: '600', color: '#333' }}>📍 Entities ({entities.length})</h3>
              {entities.length === 0 ? (
                <p style={{ fontSize: '14px', color: '#999' }}>No entities yet</p>
              ) : (
                <ul style={{ listStyle: 'none', padding: '0', margin: '0', maxHeight: '250px', overflowY: 'auto', fontSize: '14px' }}>
                  {entities.map((item, idx) => (
                    <li key={idx} style={{ marginBottom: '6px', padding: '8px', backgroundColor: '#f9f9f9', borderRadius: '4px', border: '1px solid #e0e0e0' }}>
                      {item.label}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div style={{ backgroundColor: 'white', borderRadius: '8px', padding: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
              <h3 style={{ margin: '0 0 15px 0', fontSize: '16px', fontWeight: '600', color: '#333' }}>🔗 Properties ({properties.length})</h3>
              {properties.length === 0 ? (
                <p style={{ fontSize: '14px', color: '#999' }}>No properties yet</p>
              ) : (
                <ul style={{ listStyle: 'none', padding: '0', margin: '0', maxHeight: '250px', overflowY: 'auto', fontSize: '14px' }}>
                  {properties.map((item, idx) => (
                    <li key={idx} style={{ marginBottom: '6px', padding: '8px', backgroundColor: '#f9f9f9', borderRadius: '4px', border: '1px solid #e0e0e0' }}>
                      {item.label}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
