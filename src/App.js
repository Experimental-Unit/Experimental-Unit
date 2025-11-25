import React, { useState } from 'react';

export default function TripleBuilder() {
  const [sessionLabel, setSessionLabel] = useState('');
  const [sessionStarted, setSessionStarted] = useState(false);
  const [triples, setTriples] = useState([]);
  const [nodesMap, setNodesMap] = useState({});
  const [newEntityCounter, setNewEntityCounter] = useState(1);
  const [newPropertyCounter, setNewPropertyCounter] = useState(1);
  
  const [entity1Input, setEntity1Input] = useState('');
  const [entity1Results, setEntity1Results] = useState([]);
  const [entity1Selected, setEntity1Selected] = useState(null);
  
  const [propertyInput, setPropertyInput] = useState('');
  const [propertyResults, setPropertyResults] = useState([]);
  const [propertySelected, setPropertySelected] = useState(null);
  
  const [entity2Input, setEntity2Input] = useState('');
  const [entity2Results, setEntity2Results] = useState([]);
  const [entity2Selected, setEntity2Selected] = useState(null);

  const isProperty = (id) => id.includes('-P') || id.startsWith('P');

  const startSession = () => {
    if (!sessionLabel.trim()) {
      alert('Please enter a session label.');
      return;
    }
    setSessionStarted(true);
  };

  const searchWikidata = async (query, type, setter) => {
    if (!query.trim()) return;
    try {
      const url = type === 'property'
        ? `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(query)}&language=en&type=property&format=json&origin=*`
        : `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(query)}&language=en&type=item&format=json&origin=*`;

      const response = await fetch(url);
      const data = await response.json();
      
      if (data.search && data.search.length > 0) {
        setter(data.search);
      } else {
        setter([]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const createNewNode = (type, resultSetter, selectedSetter) => {
    let id;
    if (type === 'property') {
      id = `P${newPropertyCounter}`;
      setNewPropertyCounter(newPropertyCounter + 1);
    } else {
      id = `Q${newEntityCounter}`;
      setNewEntityCounter(newEntityCounter + 1);
    }

    const labelInput = prompt(`Enter label for new ${type}:`) || `${sessionLabel}-${id}`;
    const nodeId = `${sessionLabel}-${id}`;
    const fullLabel = `${labelInput} (${nodeId})`;

    setNodesMap({ ...nodesMap, [nodeId]: labelInput });
    
    resultSetter([{ id: nodeId, label: labelInput, description: 'new ' + type }]);
    selectedSetter({ id: nodeId, label: fullLabel });
  };

  const addTriple = () => {
    if (!entity1Selected || !propertySelected || !entity2Selected) {
      alert('Select all three parts of the triple first.');
      return;
    }

    const newTriple = {
      e1Id: entity1Selected.id,
      pId: propertySelected.id,
      e2Id: entity2Selected.id
    };

    setTriples([...triples, newTriple]);
    
    const newNodesMap = { ...nodesMap };
    newNodesMap[entity1Selected.id] = entity1Selected.label.split(' (')[0];
    newNodesMap[propertySelected.id] = propertySelected.label.split(' (')[0];
    newNodesMap[entity2Selected.id] = entity2Selected.label.split(' (')[0];
    setNodesMap(newNodesMap);
  };

  const removeTriple = (idx) => {
    setTriples(triples.filter((_, i) => i !== idx));
  };

  const exportGraph = () => {
    const data = {
      sessionLabel,
      timestamp: new Date().toISOString(),
      triples,
      nodesMap
    };

    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `knowledge-graph-${sessionLabel}-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const importGraph = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target.result);
          if (!data.triples || !data.nodesMap) {
            alert('Invalid file format.');
            return;
          }
          setSessionLabel(data.sessionLabel);
          setSessionStarted(true);
          setTriples(data.triples);
          setNodesMap(data.nodesMap);
        } catch (err) {
          alert('Error parsing file: ' + err.message);
        }
      };
      reader.readAsText(file);
    });
    input.click();
  };

  const getEntitiesAndProperties = () => {
    const entities = [];
    const properties = [];

    Object.keys(nodesMap).forEach(id => {
      const label = nodesMap[id];
      if (isProperty(id)) {
        properties.push(label);
      } else {
        entities.push(label);
      }
    });

    return {
      entities: entities.sort(),
      properties: properties.sort()
    };
  };

  const { entities, properties } = getEntitiesAndProperties();

  const selectedTripleText = entity1Selected && propertySelected && entity2Selected
    ? `${entity1Selected.label} – ${propertySelected.label} – ${entity2Selected.label}`
    : '... – ... – ...';

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h1>Experimental Unit Triple Builder</h1>

      {!sessionStarted ? (
        <div style={{ marginBottom: '20px' }}>
          <p>Welcome! Please give a label to use on any custom conceptualizations:</p>
          <input
            type="text"
            placeholder="Session label"
            value={sessionLabel}
            onChange={(e) => setSessionLabel(e.target.value)}
            style={{ padding: '8px', marginRight: '10px', width: '300px' }}
          />
          <button onClick={startSession} style={{ padding: '8px 12px', cursor: 'pointer' }}>
            Start Session
          </button>
          <button onClick={importGraph} style={{ padding: '8px 12px', marginLeft: '10px', cursor: 'pointer', backgroundColor: '#2196F3', color: 'white' }}>
            Load Graph from JSON
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '20px' }}>
          <div>
            <h2>Build a Triple</h2>

            <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
              <label>Entity 1:</label>
              <input
                type="text"
                placeholder="Search for Entity 1"
                value={entity1Input}
                onChange={(e) => setEntity1Input(e.target.value)}
                style={{ padding: '8px', marginRight: '10px', width: '200px' }}
              />
              <button onClick={() => searchWikidata(entity1Input, 'item', setEntity1Results)} style={{ padding: '8px 12px', marginRight: '5px', cursor: 'pointer' }}>
                Search
              </button>
              <button onClick={() => createNewNode('entity', setEntity1Results, setEntity1Selected)} style={{ padding: '8px 12px', cursor: 'pointer' }}>
                New Entity
              </button>
              <ul style={{ listStyle: 'none', padding: '10px', backgroundColor: 'white', borderRadius: '4px', maxHeight: '150px', overflow: 'auto' }}>
                {entity1Results.map((item) => (
                  <li
                    key={item.id}
                    onClick={() => {
                      setEntity1Selected({ id: item.id, label: `${item.label} (${item.id})` });
                      setEntity1Results([]);
                    }}
                    style={{ cursor: 'pointer', padding: '5px', marginBottom: '3px', backgroundColor: '#f0f0f0', borderRadius: '3px' }}
                  >
                    {item.label} – {item.description || 'no description'} – {item.id}
                  </li>
                ))}
              </ul>
            </div>

            <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
              <label>Property:</label>
              <input
                type="text"
                placeholder="Search for Property"
                value={propertyInput}
                onChange={(e) => setPropertyInput(e.target.value)}
                style={{ padding: '8px', marginRight: '10px', width: '200px' }}
              />
              <button onClick={() => searchWikidata(propertyInput, 'property', setPropertyResults)} style={{ padding: '8px 12px', marginRight: '5px', cursor: 'pointer' }}>
                Search
              </button>
              <button onClick={() => createNewNode('property', setPropertyResults, setPropertySelected)} style={{ padding: '8px 12px', cursor: 'pointer' }}>
                New Property
              </button>
              <ul style={{ listStyle: 'none', padding: '10px', backgroundColor: 'white', borderRadius: '4px', maxHeight: '150px', overflow: 'auto' }}>
                {propertyResults.map((item) => (
                  <li
                    key={item.id}
                    onClick={() => {
                      setPropertySelected({ id: item.id, label: `${item.label} (${item.id})` });
                      setPropertyResults([]);
                    }}
                    style={{ cursor: 'pointer', padding: '5px', marginBottom: '3px', backgroundColor: '#f0f0f0', borderRadius: '3px' }}
                  >
                    {item.label} – {item.description || 'no description'} – {item.id}
                  </li>
                ))}
              </ul>
            </div>

            <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
              <label>Entity 2:</label>
              <input
                type="text"
                placeholder="Search for Entity 2"
                value={entity2Input}
                onChange={(e) => setEntity2Input(e.target.value)}
                style={{ padding: '8px', marginRight: '10px', width: '200px' }}
              />
              <button onClick={() => searchWikidata(entity2Input, 'item', setEntity2Results)} style={{ padding: '8px 12px', marginRight: '5px', cursor: 'pointer' }}>
                Search
              </button>
              <button onClick={() => createNewNode('entity', setEntity2Results, setEntity2Selected)} style={{ padding: '8px 12px', cursor: 'pointer' }}>
                New Entity
              </button>
              <ul style={{ listStyle: 'none', padding: '10px', backgroundColor: 'white', borderRadius: '4px', maxHeight: '150px', overflow: 'auto' }}>
                {entity2Results.map((item) => (
                  <li
                    key={item.id}
                    onClick={() => {
                      setEntity2Selected({ id: item.id, label: `${item.label} (${item.id})` });
                      setEntity2Results([]);
                    }}
                    style={{ cursor: 'pointer', padding: '5px', marginBottom: '3px', backgroundColor: '#f0f0f0', borderRadius: '3px' }}
                  >
                    {item.label} – {item.description || 'no description'} – {item.id}
                  </li>
                ))}
              </ul>
            </div>

            <h3>Selected Triple:</h3>
            <p style={{ padding: '10px', backgroundColor: '#e8f4f8', borderLeft: '4px solid #2196F3', borderRadius: '4px', fontWeight: 'bold' }}>
              {selectedTripleText}
            </p>

            <button onClick={addTriple} style={{ padding: '10px 15px', marginTop: '20px', marginBottom: '20px', cursor: 'pointer', backgroundColor: '#4CAF50', color: 'white' }}>
              Add Triple
            </button>

            <h2>All Triples</h2>
            <ul style={{ listStyle: 'none', padding: '10px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
              {triples.map((t, idx) => (
                <li key={idx} style={{ padding: '8px', backgroundColor: 'white', borderRadius: '3px', marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
                  <span>{nodesMap[t.e1Id]} – {nodesMap[t.pId]} – {nodesMap[t.e2Id]}</span>
                  <button onClick={() => removeTriple(idx)} style={{ padding: '4px 8px', cursor: 'pointer' }}>
                    Remove
                  </button>
                </li>
              ))}
            </ul>

            <div style={{ marginTop: '20px', marginBottom: '20px' }}>
              <button onClick={exportGraph} style={{ padding: '10px 15px', marginRight: '10px', cursor: 'pointer', backgroundColor: '#4CAF50', color: 'white' }}>
                Download Graph as JSON
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ border: '1px solid #ddd', borderRadius: '4px', padding: '15px', backgroundColor: '#f9f9f9' }}>
              <h3 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#333', borderBottom: '2px solid #2196F3', paddingBottom: '8px' }}>
                Entities
              </h3>
              <ul style={{ listStyle: 'none', padding: '0', margin: '0', maxHeight: '300px', overflowY: 'auto', fontSize: '12px' }}>
                {entities.map((label, idx) => (
                  <li key={idx} style={{ marginBottom: '4px', padding: '4px 6px', backgroundColor: 'white', borderRadius: '3px' }}>
                    {label}
                  </li>
                ))}
              </ul>
            </div>

            <div style={{ border: '1px solid #ddd', borderRadius: '4px', padding: '15px', backgroundColor: '#f9f9f9' }}>
              <h3 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#333', borderBottom: '2px solid #2196F3', paddingBottom: '8px' }}>
                Properties
              </h3>
              <ul style={{ listStyle: 'none', padding: '0', margin: '0', maxHeight: '300px', overflowY: 'auto', fontSize: '12px' }}>
                {properties.map((label, idx) => (
                  <li key={idx} style={{ marginBottom: '4px', padding: '4px 6px', backgroundColor: 'white', borderRadius: '3px' }}>
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