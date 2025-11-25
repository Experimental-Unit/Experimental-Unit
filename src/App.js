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

export default function TripleBuilder() {
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
        console.error(err);
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
      setE1Results([]);
    } else if (type === 'e2') {
      setE2Selected({ id: item.id, label });
      setE2Results([]);
    } else if (type === 'p') {
      setPSelected({ id: item.id, label });
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
    } else {
      setE1Selected({ id: nodeId, label });
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
              setSessionLabel(data.sessionLabel);
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
    let data, blob, filename;

    if (format === 'jsonld') {
      // Convert to JSON-LD
      const context = {
        '@context': {
          'rdf': 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
          'rdfs': 'http://www.w3.org/2000/01/rdf-schema#'
        },
        '@graph': triples.map(t => ({
          '@id': t.e1Id,
          [t.pId]: { '@id': t.e2Id }
        }))
      };
      data = JSON.stringify(data, null, 2);
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

    const blobData = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blobData);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const renderGraph = async () => {
    if (!graphRef.current) return;

    const nodes = [];
    const edges = [];
    const seen = new Set();

    triples.forEach(t => {
      if (!seen.has(t.e1Id)) {
        nodes.push({
          id: t.e1Id,
          label: nodesMap[t.e1Id] || t.e1Id,
          title: nodesMap[t.e1Id],
          color: '#FFE5B4'
        });
        seen.add(t.e1Id);
      }
      if (!seen.has(t.e2Id)) {
        nodes.push({
          id: t.e2Id,
          label: nodesMap[t.e2Id] || t.e2Id,
          title: nodesMap[t.e2Id],
          color: '#FFE5B4'
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
        { physics: { enabled: true, stabilization: { iterations: 200 } } }
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
      if (isProperty(id)) p.push(nodesMap[id]);
      else e.push(nodesMap[id]);
    });
    return { entities: e.sort(), properties: p.sort() };
  })();

  useEffect(() => {
    if (sessionStarted && triples.length > 0) {
      renderGraph();
    }
  }, [triples, nodesMap, sessionStarted]);

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', backgroundColor: '#fafafa', minHeight: '100vh' }}>
      <h1>📊 Experimental Unit Triple Builder</h1>

      {!sessionStarted ? (
        <div style={{ maxWidth: '600px', backgroundColor: 'white', padding: '30px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <p>Welcome! Give a label to your session:</p>
          <input
            type="text"
            placeholder="e.g., my-research-notes"
            value={sessionLabel}
            onChange={(e) => setSessionLabel(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && startSession()}
            style={{ padding: '10px', marginRight: '10px', width: '250px', borderRadius: '4px', border: '1px solid #ddd' }}
          />
          <button onClick={startSession} style={{ padding: '10px 20px', cursor: 'pointer', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px' }}>
            Start Session
          </button>
          <button onClick={importGraph} style={{ padding: '10px 20px', marginLeft: '10px', cursor: 'pointer', backgroundColor: '#2196F3', color: 'white', border: 'none', borderRadius: '4px' }}>
            Load Graph(s)
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '20px' }}>
          {/* Main content */}
          <div>
            <h2>Build a Triple</h2>

            {/* Entity 1 */}
            <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <label style={{ fontWeight: 'bold' }}>Entity 1:</label>
              <input
                type="text"
                placeholder="Search or type..."
                value={e1Query}
                onChange={(e) => setE1Query(e.target.value)}
                style={{ padding: '8px', marginRight: '10px', width: '200px', borderRadius: '4px', border: '1px solid #ddd' }}
              />
              <button onClick={() => createNewNode('entity')} style={{ padding: '8px 12px', cursor: 'pointer', backgroundColor: '#FF9800', color: 'white', border: 'none', borderRadius: '4px' }}>
                New Entity
              </button>
              {e1Selected && <p style={{ marginTop: '8px', color: '#4CAF50', fontWeight: 'bold' }}>✓ {e1Selected.label}</p>}
              <ul style={{ listStyle: 'none', padding: '8px', backgroundColor: '#f9f9f9', borderRadius: '4px', maxHeight: '120px', overflow: 'auto', marginTop: '8px' }}>
                {e1Results.map((item) => (
                  <li
                    key={item.id}
                    onClick={() => selectResult(item, 'e1')}
                    style={{ cursor: 'pointer', padding: '6px', marginBottom: '4px', backgroundColor: 'white', borderRadius: '3px', border: '1px solid #eee' }}
                  >
                    {item.label} <span style={{ fontSize: '12px', color: '#666' }}>({item.id})</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Property */}
            <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <label style={{ fontWeight: 'bold' }}>Property:</label>
              <input
                type="text"
                placeholder="Search or type..."
                value={pQuery}
                onChange={(e) => setPQuery(e.target.value)}
                style={{ padding: '8px', marginRight: '10px', width: '200px', borderRadius: '4px', border: '1px solid #ddd' }}
              />
              <button onClick={() => createNewNode('property')} style={{ padding: '8px 12px', cursor: 'pointer', backgroundColor: '#FF9800', color: 'white', border: 'none', borderRadius: '4px' }}>
                New Property
              </button>
              {pSelected && <p style={{ marginTop: '8px', color: '#4CAF50', fontWeight: 'bold' }}>✓ {pSelected.label}</p>}
              <ul style={{ listStyle: 'none', padding: '8px', backgroundColor: '#f9f9f9', borderRadius: '4px', maxHeight: '120px', overflow: 'auto', marginTop: '8px' }}>
                {pResults.map((item) => (
                  <li
                    key={item.id}
                    onClick={() => selectResult(item, 'p')}
                    style={{ cursor: 'pointer', padding: '6px', marginBottom: '4px', backgroundColor: 'white', borderRadius: '3px', border: '1px solid #eee' }}
                  >
                    {item.label} <span style={{ fontSize: '12px', color: '#666' }}>({item.id})</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Entity 2 */}
            <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <label style={{ fontWeight: 'bold' }}>Entity 2:</label>
              <input
                type="text"
                placeholder="Search or type..."
                value={e2Query}
                onChange={(e) => setE2Query(e.target.value)}
                style={{ padding: '8px', marginRight: '10px', width: '200px', borderRadius: '4px', border: '1px solid #ddd' }}
              />
              <button onClick={() => createNewNode('entity')} style={{ padding: '8px 12px', cursor: 'pointer', backgroundColor: '#FF9800', color: 'white', border: 'none', borderRadius: '4px' }}>
                New Entity
              </button>
              {e2Selected && <p style={{ marginTop: '8px', color: '#4CAF50', fontWeight: 'bold' }}>✓ {e2Selected.label}</p>}
              <ul style={{ listStyle: 'none', padding: '8px', backgroundColor: '#f9f9f9', borderRadius: '4px', maxHeight: '120px', overflow: 'auto', marginTop: '8px' }}>
                {e2Results.map((item) => (
                  <li
                    key={item.id}
                    onClick={() => selectResult(item, 'e2')}
                    style={{ cursor: 'pointer', padding: '6px', marginBottom: '4px', backgroundColor: 'white', borderRadius: '3px', border: '1px solid #eee' }}
                  >
                    {item.label} <span style={{ fontSize: '12px', color: '#666' }}>({item.id})</span>
                  </li>
                ))}
              </ul>
            </div>

            <button onClick={addTriple} style={{ padding: '12px 24px', cursor: 'pointer', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px', fontSize: '16px', fontWeight: 'bold' }}>
              ➕ Add Triple
            </button>

            <h2 style={{ marginTop: '30px' }}>All Triples ({triples.length})</h2>
            <ul style={{ listStyle: 'none', padding: '10px', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              {triples.map((t, idx) => (
                <li key={idx} style={{ padding: '12px', backgroundColor: '#f9f9f9', borderRadius: '4px', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderLeft: '4px solid #2196F3' }}>
                  <span>{nodesMap[t.e1Id]} <strong>→</strong> {nodesMap[t.pId]} <strong>→</strong> {nodesMap[t.e2Id]}</span>
                  <button onClick={() => removeTriple(idx)} style={{ padding: '4px 8px', cursor: 'pointer', backgroundColor: '#f44336', color: 'white', border: 'none', borderRadius: '3px' }}>
                    Remove
                  </button>
                </li>
              ))}
            </ul>

            <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
              <button onClick={() => exportGraph('json')} style={{ padding: '10px 15px', cursor: 'pointer', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px' }}>
                📥 Download as JSON
              </button>
              <button onClick={() => exportGraph('jsonld')} style={{ padding: '10px 15px', cursor: 'pointer', backgroundColor: '#2196F3', color: 'white', border: 'none', borderRadius: '4px' }}>
                📥 Download as JSON-LD
              </button>
            </div>

            <h2 style={{ marginTop: '30px' }}>Graph Visualization</h2>
            <div ref={graphRef} style={{ width: '100%', height: '400px', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }} />
          </div>

          {/* Sidebar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', height: 'fit-content' }}>
            <div style={{ backgroundColor: 'white', borderRadius: '8px', padding: '15px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <h3 style={{ margin: '0 0 10px 0', fontSize: '14px', fontWeight: 'bold', color: '#333' }}>📍 Entities ({entities.length})</h3>
              <ul style={{ listStyle: 'none', padding: '0', margin: '0', maxHeight: '250px', overflowY: 'auto', fontSize: '12px' }}>
                {entities.map((label, idx) => (
                  <li key={idx} style={{ marginBottom: '4px', padding: '6px', backgroundColor: '#f9f9f9', borderRadius: '3px' }}>
                    {label}
                  </li>
                ))}
              </ul>
            </div>

            <div style={{ backgroundColor: 'white', borderRadius: '8px', padding: '15px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <h3 style={{ margin: '0 0 10px 0', fontSize: '14px', fontWeight: 'bold', color: '#333' }}>🔗 Properties ({properties.length})</h3>
              <ul style={{ listStyle: 'none', padding: '0', margin: '0', maxHeight: '250px', overflowY: 'auto', fontSize: '12px' }}>
                {properties.map((label, idx) => (
                  <li key={idx} style={{ marginBottom: '4px', padding: '6px', backgroundColor: '#f9f9f9', borderRadius: '3px' }}>
                    {label}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}