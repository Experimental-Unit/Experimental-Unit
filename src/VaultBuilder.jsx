import React, { useState, useCallback } from 'react';
import JSZip from 'jszip';

// Colors matching the project theme
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
};

// Seed ontology - concepts and entities to recognize
const SEED_ONTOLOGY = {
  concepts: [
    'Symbolic Exchange', 'Hyperreality', 'Simulation', 'Simulacra', 'Seduction',
    'The Secret', 'Transpolitics', 'Fatal Strategies', 'Symbolic Death',
    'Experimental Unit', 'MUU', 'Mixed Unclear Unstable', 'Applied Baudrillard',
    'Transcommunism', 'Semio-Subitocracy', 'Metonymy Economy', 'Sacrificial Transparency',
    'Dark Forest Protocol', 'Experimental Council', 'Phantasmal Emergency', 'Total Social Fact',
    'Systemic Operational Design', 'SOD', 'Wicked Problems', 'Design Thinking',
    'Pratityasamutpada', 'Dependent Origination', 'Lila', 'Avidya', 'Greater Jihad',
    'Wakan Tanka', 'Mitakuye Oyasin', 'Afropessimism', 'Anti-Blackness', 'Necropolitics',
    'Biopolitics', 'Sovereignty', 'State of Exception', 'Autofiction', 'Performance Art',
    'Confession', 'Intervention', 'ARG', 'Tactical Media', 'Conceptual Churning'
  ],
  entities: [
    'Jean Baudrillard', 'Ben Zweibelson', 'Kenneth Stanley', 'Grimes', 'Claire Boucher',
    'Ofra Graicer', 'Heinrich Wadley', 'Adam Wadley', 'Giorgio Agamben', 'Byung-Chul Han',
    'Frank Wilderson', 'Achille Mbembe', 'Timothy Morton', 'Nick Land', 'Gilles Deleuze',
    'Karl Ove Knausgaard', 'TRADOC', 'Space Command', 'Transformation and Training Command',
    'CIA', 'Substack', 'Symbolic Exchange and Death', 'The Gulf War Did Not Take Place',
    'Simulacra and Simulation', 'Afropessimism', 'My Struggle', 'Homo Sacer'
  ],
  entityTypes: {
    'Jean Baudrillard': 'Person', 'Ben Zweibelson': 'Person', 'Kenneth Stanley': 'Person',
    'Grimes': 'Person', 'Claire Boucher': 'Person', 'Ofra Graicer': 'Person',
    'Heinrich Wadley': 'Person', 'Adam Wadley': 'Person', 'Giorgio Agamben': 'Person',
    'Byung-Chul Han': 'Person', 'Frank Wilderson': 'Person', 'Achille Mbembe': 'Person',
    'Timothy Morton': 'Person', 'Nick Land': 'Person', 'Gilles Deleuze': 'Person',
    'Karl Ove Knausgaard': 'Person', 'TRADOC': 'Organization', 'Space Command': 'Organization',
    'Transformation and Training Command': 'Organization', 'CIA': 'Organization',
    'Substack': 'Organization', 'Symbolic Exchange and Death': 'Work',
    'The Gulf War Did Not Take Place': 'Work', 'Simulacra and Simulation': 'Work',
    'Afropessimism': 'Work', 'My Struggle': 'Work', 'Homo Sacer': 'Work'
  }
};

// Utility functions
function sanitizeFilename(name) {
  return name.replace(/[<>:"/\\|?*]/g, '').replace(/\s+/g, ' ').trim().slice(0, 100);
}

function stripHtml(html) {
  let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  text = text.replace(/<[^>]+>/g, ' ');
  text = text.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<');
  text = text.replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
  text = text.replace(/\s+/g, ' ');
  return text.trim();
}

function extractDateFromText(text, filename) {
  // Try to find date in filename
  const filenameMatch = filename.match(/(\d{4}-\d{2}-\d{2})/);
  if (filenameMatch) return filenameMatch[1];

  // Try common date formats in text
  const textMatch = text.match(/(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}/i);
  if (textMatch) return textMatch[0];

  return null;
}

function extractTitle(text, filename) {
  // Try to get title from first heading
  const headingMatch = text.match(/^#\s+(.+)$/m);
  if (headingMatch) return headingMatch[1].trim();

  // Fall back to filename
  return filename
    .replace(/^adam-wadley-/i, '')
    .replace(/[-_]/g, ' ')
    .replace(/\.(md|txt|html)$/i, '')
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function findConcepts(text) {
  const found = [];
  const lowerText = text.toLowerCase();

  for (const concept of SEED_ONTOLOGY.concepts) {
    if (lowerText.includes(concept.toLowerCase())) {
      found.push({ name: concept, relevance: 'Mentioned in text' });
    }
  }
  return found;
}

function findEntities(text) {
  const found = [];

  for (const entity of SEED_ONTOLOGY.entities) {
    if (text.includes(entity)) {
      found.push({
        name: entity,
        type: SEED_ONTOLOGY.entityTypes[entity] || 'Unknown',
        context: 'Mentioned in text'
      });
    }
  }
  return found;
}

function extractSummary(text) {
  // Get first substantial paragraph
  const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 100);
  if (paragraphs.length > 0) {
    return paragraphs[0].slice(0, 500).trim() + (paragraphs[0].length > 500 ? '...' : '');
  }
  return 'Content summary not available.';
}

// Generate YAML frontmatter
function generateFrontmatter(data) {
  const lines = ['---'];
  for (const [key, value] of Object.entries(data)) {
    if (Array.isArray(value)) {
      if (value.length === 0) {
        lines.push(`${key}: []`);
      } else {
        lines.push(`${key}:`);
        value.forEach(v => lines.push(`  - ${v}`));
      }
    } else {
      lines.push(`${key}: ${value}`);
    }
  }
  lines.push('---', '');
  return lines.join('\n');
}

// Generate Article note
function generateArticleNote(extraction) {
  const frontmatter = generateFrontmatter({
    title: extraction.title,
    date: extraction.date || 'unknown',
    type: 'article',
    source: extraction.sourceFile,
    wordCount: extraction.wordCount,
    tags: [],
    created: new Date().toISOString().split('T')[0]
  });

  const conceptLinks = extraction.concepts.length > 0
    ? extraction.concepts.map(c => `- [[Concepts/${sanitizeFilename(c.name)}|${c.name}]]: ${c.relevance}`).join('\n')
    : '_No concepts identified_';

  const entityLinks = extraction.entities.length > 0
    ? extraction.entities.map(e => `- [[Entities/${sanitizeFilename(e.name)}|${e.name}]] (${e.type}): ${e.context}`).join('\n')
    : '_No entities identified_';

  return `${frontmatter}
# ${extraction.title}

## Summary

${extraction.summary}

## Key Concepts

${conceptLinks}

## Key Entities

${entityLinks}

---

**Source:** \`${extraction.sourceFile}\`
**Words:** ${extraction.wordCount}
${extraction.date ? `**Date:** ${extraction.date}` : ''}
`;
}

// Generate Concept note
function generateConceptNote(conceptName, mentions) {
  const frontmatter = generateFrontmatter({
    title: conceptName,
    type: 'concept',
    aliases: [],
    mentions: mentions.length,
    created: new Date().toISOString().split('T')[0]
  });

  const articleLinks = mentions.map(m =>
    `- [[Articles/${sanitizeFilename(m.articleTitle)}|${m.articleTitle}]]`
  ).join('\n');

  return `${frontmatter}
# ${conceptName}

## Definition

_A theoretical framework or concept appearing in the Experimental Unit corpus._

## Appears In

${articleLinks || '_No articles linked yet_'}

## Notes

_Add notes about this concept here_
`;
}

// Generate Entity note
function generateEntityNote(entityName, entityType, mentions) {
  const frontmatter = generateFrontmatter({
    title: entityName,
    type: 'entity',
    entityType: entityType,
    mentions: mentions.length,
    created: new Date().toISOString().split('T')[0]
  });

  const articleLinks = mentions.map(m =>
    `- [[Articles/${sanitizeFilename(m.articleTitle)}|${m.articleTitle}]]`
  ).join('\n');

  return `${frontmatter}
# ${entityName}

**Type:** ${entityType}

## Appearances

${articleLinks || '_No articles linked yet_'}

## Notes

_Add notes about this entity here_
`;
}

// Generate Home note
function generateHomeNote(stats) {
  const frontmatter = generateFrontmatter({
    title: 'Home',
    type: 'home',
    created: new Date().toISOString().split('T')[0]
  });

  return `${frontmatter}
# Experimental Unit Knowledge Vault

Welcome to the Experimental Unit knowledge graph.

## Quick Stats

- **Articles:** ${stats.articles}
- **Concepts:** ${stats.concepts}
- **Entities:** ${stats.entities}
- **Total Words:** ${stats.totalWords.toLocaleString()}

## Navigation

- [[Indices/Article Index|Article Index]] - All processed articles
- [[Indices/Concept Index|Concept Index]] - Theoretical frameworks and ideas
- [[Indices/Entity Index|Entity Index]] - People, organizations, and works

## Graph View

Open the Graph View (Ctrl/Cmd + G) to explore connections.

---

_Generated by Experimental Unit Vault Builder_
_${new Date().toISOString().split('T')[0]}_
`;
}

// Generate Index note
function generateIndexNote(title, items, description) {
  const frontmatter = generateFrontmatter({
    title: title,
    type: 'index',
    created: new Date().toISOString().split('T')[0]
  });

  const itemsList = items.map(item =>
    `- [[${item.folder}/${sanitizeFilename(item.name)}|${item.name}]]${item.count ? ` (${item.count})` : ''}`
  ).join('\n');

  return `${frontmatter}
# ${title}

${description}

## Contents

${itemsList}
`;
}

export default function VaultBuilder({ onBack }) {
  const [status, setStatus] = useState('idle'); // idle, processing, done, error
  const [progress, setProgress] = useState({ current: 0, total: 0, file: '' });
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);
  const [outputZip, setOutputZip] = useState(null);

  const processFiles = useCallback(async (file) => {
    setStatus('processing');
    setError(null);
    setProgress({ current: 0, total: 0, file: 'Reading zip file...' });

    try {
      const zip = new JSZip();
      const contents = await zip.loadAsync(file);

      // Find all text files
      const textFiles = [];
      contents.forEach((relativePath, zipEntry) => {
        if (!zipEntry.dir && /\.(txt|md|markdown|html)$/i.test(relativePath)) {
          textFiles.push({ path: relativePath, entry: zipEntry });
        }
      });

      if (textFiles.length === 0) {
        throw new Error('No text files found in the zip. Please include .txt, .md, or .html files.');
      }

      setProgress({ current: 0, total: textFiles.length, file: 'Starting extraction...' });

      // Process each file
      const extractions = [];
      const conceptMap = new Map();
      const entityMap = new Map();

      for (let i = 0; i < textFiles.length; i++) {
        const { path, entry } = textFiles[i];
        const filename = path.split('/').pop();

        setProgress({ current: i + 1, total: textFiles.length, file: filename });

        let content = await entry.async('string');

        // Strip HTML if needed
        if (/\.html$/i.test(filename)) {
          content = stripHtml(content);
        }

        // Skip very short files
        const wordCount = content.split(/\s+/).length;
        if (wordCount < 50) continue;

        // Extract metadata
        const title = extractTitle(content, filename);
        const date = extractDateFromText(content, filename);
        const summary = extractSummary(content);
        const concepts = findConcepts(content);
        const entities = findEntities(content);

        const extraction = {
          title,
          date,
          summary,
          concepts,
          entities,
          sourceFile: filename,
          wordCount
        };

        extractions.push(extraction);

        // Aggregate concepts
        for (const concept of concepts) {
          const key = concept.name.toLowerCase();
          if (!conceptMap.has(key)) {
            conceptMap.set(key, { name: concept.name, mentions: [] });
          }
          conceptMap.get(key).mentions.push({ articleTitle: title });
        }

        // Aggregate entities
        for (const entity of entities) {
          const key = entity.name.toLowerCase();
          if (!entityMap.has(key)) {
            entityMap.set(key, { name: entity.name, type: entity.type, mentions: [] });
          }
          entityMap.get(key).mentions.push({ articleTitle: title });
        }
      }

      // Build output zip
      setProgress({ current: textFiles.length, total: textFiles.length, file: 'Building vault...' });

      const outputZip = new JSZip();

      // Create folder structure
      const articlesFolder = outputZip.folder('Articles');
      const conceptsFolder = outputZip.folder('Concepts');
      const entitiesFolder = outputZip.folder('Entities');
      const indicesFolder = outputZip.folder('Indices');
      const obsidianFolder = outputZip.folder('.obsidian');

      // Add Obsidian config
      obsidianFolder.file('app.json', JSON.stringify({ showLineNumber: true }, null, 2));

      // Add Article notes
      for (const extraction of extractions) {
        const note = generateArticleNote(extraction);
        articlesFolder.file(sanitizeFilename(extraction.title) + '.md', note);
      }

      // Add Concept notes
      for (const [, data] of conceptMap) {
        const note = generateConceptNote(data.name, data.mentions);
        conceptsFolder.file(sanitizeFilename(data.name) + '.md', note);
      }

      // Add Entity notes
      for (const [, data] of entityMap) {
        const note = generateEntityNote(data.name, data.type, data.mentions);
        entitiesFolder.file(sanitizeFilename(data.name) + '.md', note);
      }

      // Add Index notes
      const articleIndex = generateIndexNote(
        'Article Index',
        extractions.map(e => ({ name: e.title, folder: 'Articles', count: e.wordCount + ' words' })),
        'All processed articles.'
      );
      indicesFolder.file('Article Index.md', articleIndex);

      const conceptIndex = generateIndexNote(
        'Concept Index',
        [...conceptMap.values()].map(c => ({ name: c.name, folder: 'Concepts', count: c.mentions.length + ' mentions' })),
        'Theoretical concepts and frameworks.'
      );
      indicesFolder.file('Concept Index.md', conceptIndex);

      const entityIndex = generateIndexNote(
        'Entity Index',
        [...entityMap.values()].map(e => ({ name: e.name, folder: 'Entities', count: e.mentions.length + ' mentions' })),
        'People, organizations, and works.'
      );
      indicesFolder.file('Entity Index.md', entityIndex);

      // Add Home note
      const totalWords = extractions.reduce((sum, e) => sum + e.wordCount, 0);
      const homeNote = generateHomeNote({
        articles: extractions.length,
        concepts: conceptMap.size,
        entities: entityMap.size,
        totalWords
      });
      outputZip.file('Home.md', homeNote);

      // Generate zip blob
      const blob = await outputZip.generateAsync({ type: 'blob' });

      setOutputZip(blob);
      setStats({
        articles: extractions.length,
        concepts: conceptMap.size,
        entities: entityMap.size,
        totalWords
      });
      setStatus('done');

    } catch (err) {
      setError(err.message);
      setStatus('error');
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith('.zip')) {
      processFiles(file);
    } else {
      setError('Please drop a .zip file');
    }
  }, [processFiles]);

  const handleFileSelect = useCallback((e) => {
    const file = e.target.files[0];
    if (file) {
      processFiles(file);
    }
  }, [processFiles]);

  const handleDownload = useCallback(() => {
    if (outputZip) {
      const url = URL.createObjectURL(outputZip);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'experimental-unit-vault.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  }, [outputZip]);

  const reset = () => {
    setStatus('idle');
    setProgress({ current: 0, total: 0, file: '' });
    setStats(null);
    setError(null);
    setOutputZip(null);
  };

  const styles = {
    container: {
      minHeight: '100vh',
      backgroundColor: colors.black,
      color: colors.white,
      fontFamily: 'Georgia, serif',
      display: 'flex',
      flexDirection: 'column',
    },
    header: {
      padding: '15px 20px',
      borderBottom: `1px solid ${colors.grey}44`,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    title: {
      fontSize: '14px',
      fontWeight: 'normal',
      color: colors.grey,
      margin: 0,
      letterSpacing: '2px',
      textTransform: 'uppercase',
    },
    backButton: {
      background: 'none',
      border: `1px solid ${colors.grey}`,
      color: colors.grey,
      padding: '8px 16px',
      cursor: 'pointer',
      fontSize: '12px',
      letterSpacing: '1px',
    },
    main: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '40px 20px',
      maxWidth: '700px',
      margin: '0 auto',
      width: '100%',
    },
    dropZone: {
      width: '100%',
      padding: '80px 40px',
      border: `2px dashed ${colors.purple}`,
      borderRadius: '4px',
      textAlign: 'center',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
    },
    dropZoneHover: {
      borderColor: colors.orange,
      backgroundColor: `${colors.orange}11`,
    },
    dropTitle: {
      fontSize: '24px',
      color: colors.orange,
      marginBottom: '20px',
    },
    dropText: {
      fontSize: '16px',
      color: colors.grey,
      marginBottom: '30px',
    },
    browseButton: {
      padding: '15px 40px',
      backgroundColor: colors.purple,
      color: colors.white,
      border: 'none',
      cursor: 'pointer',
      fontSize: '14px',
      letterSpacing: '2px',
      textTransform: 'uppercase',
    },
    hiddenInput: {
      display: 'none',
    },
    processing: {
      textAlign: 'center',
      width: '100%',
    },
    progressBar: {
      width: '100%',
      height: '4px',
      backgroundColor: colors.grey + '44',
      borderRadius: '2px',
      marginTop: '30px',
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      backgroundColor: colors.orange,
      transition: 'width 0.3s ease',
    },
    progressText: {
      marginTop: '15px',
      fontSize: '14px',
      color: colors.grey,
    },
    done: {
      textAlign: 'center',
      width: '100%',
    },
    statsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(2, 1fr)',
      gap: '20px',
      marginTop: '40px',
      marginBottom: '40px',
    },
    statBox: {
      padding: '25px',
      border: `1px solid ${colors.grey}44`,
      textAlign: 'center',
    },
    statNumber: {
      fontSize: '36px',
      color: colors.orange,
      marginBottom: '5px',
    },
    statLabel: {
      fontSize: '12px',
      color: colors.grey,
      textTransform: 'uppercase',
      letterSpacing: '1px',
    },
    downloadButton: {
      padding: '20px 60px',
      backgroundColor: colors.forest,
      color: colors.white,
      border: 'none',
      cursor: 'pointer',
      fontSize: '16px',
      letterSpacing: '2px',
      textTransform: 'uppercase',
      marginBottom: '20px',
    },
    resetButton: {
      background: 'none',
      border: 'none',
      color: colors.grey,
      cursor: 'pointer',
      fontSize: '14px',
      textDecoration: 'underline',
    },
    error: {
      textAlign: 'center',
      color: colors.red,
    },
    errorTitle: {
      fontSize: '24px',
      marginBottom: '20px',
    },
    errorText: {
      fontSize: '16px',
      marginBottom: '30px',
    },
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>Obsidian Vault Builder</h1>
        <button style={styles.backButton} onClick={onBack}>
          Back to Game
        </button>
      </header>

      <main style={styles.main}>
        {status === 'idle' && (
          <div
            style={styles.dropZone}
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
          >
            <div style={styles.dropTitle}>Drop Your Zip File Here</div>
            <div style={styles.dropText}>
              Upload a .zip containing your text files (.txt, .md, .html)
              <br />
              and get back a complete Obsidian vault
            </div>
            <label>
              <input
                type="file"
                accept=".zip"
                onChange={handleFileSelect}
                style={styles.hiddenInput}
              />
              <span style={styles.browseButton}>Browse Files</span>
            </label>
          </div>
        )}

        {status === 'processing' && (
          <div style={styles.processing}>
            <div style={styles.dropTitle}>Building Your Vault...</div>
            <div style={styles.dropText}>{progress.file}</div>
            <div style={styles.progressBar}>
              <div
                style={{
                  ...styles.progressFill,
                  width: progress.total > 0
                    ? `${(progress.current / progress.total) * 100}%`
                    : '10%'
                }}
              />
            </div>
            <div style={styles.progressText}>
              {progress.total > 0
                ? `${progress.current} of ${progress.total} files`
                : 'Preparing...'}
            </div>
          </div>
        )}

        {status === 'done' && stats && (
          <div style={styles.done}>
            <div style={styles.dropTitle}>Vault Ready!</div>
            <div style={styles.statsGrid}>
              <div style={styles.statBox}>
                <div style={styles.statNumber}>{stats.articles}</div>
                <div style={styles.statLabel}>Articles</div>
              </div>
              <div style={styles.statBox}>
                <div style={styles.statNumber}>{stats.concepts}</div>
                <div style={styles.statLabel}>Concepts</div>
              </div>
              <div style={styles.statBox}>
                <div style={styles.statNumber}>{stats.entities}</div>
                <div style={styles.statLabel}>Entities</div>
              </div>
              <div style={styles.statBox}>
                <div style={styles.statNumber}>{stats.totalWords.toLocaleString()}</div>
                <div style={styles.statLabel}>Words</div>
              </div>
            </div>
            <button style={styles.downloadButton} onClick={handleDownload}>
              Download Vault
            </button>
            <br />
            <button style={styles.resetButton} onClick={reset}>
              Process Another File
            </button>
          </div>
        )}

        {status === 'error' && (
          <div style={styles.error}>
            <div style={styles.errorTitle}>Something went wrong</div>
            <div style={styles.errorText}>{error}</div>
            <button style={styles.browseButton} onClick={reset}>
              Try Again
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
