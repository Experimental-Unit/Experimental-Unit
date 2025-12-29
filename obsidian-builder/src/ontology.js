/**
 * Seed Ontology Module
 * Handles loading and managing the seed list of concepts and entities
 */

import { readFileSync, existsSync, readdirSync } from 'fs';
import { join, extname } from 'path';

/**
 * Default seed ontology for Experimental Unit project
 */
const DEFAULT_ONTOLOGY = {
  concepts: [
    // Baudrillard concepts
    'Symbolic Exchange',
    'Hyperreality',
    'Simulation',
    'Simulacra',
    'Seduction',
    'The Secret',
    'Transpolitics',
    'Fatal Strategies',

    // XU/SOD concepts
    'Experimental Unit',
    'Systemic Operational Design',
    'SOD',
    'Applied Baudrillard',
    'Symbolic Death',
    'Total Social Fact',
    'Semio-Subitocracy',
    'Transcommunism',
    'Metonymy Economy',
    'Sacrificial Transparency',
    'Dark Forest Protocol',
    'Experimental Council',
    'Phantasmal Emergency',
    'MUU (Mixed Unclear Unstable)',

    // Buddhist/Spiritual concepts
    'Pratityasamutpada',
    'Dependent Origination',
    'Lila',
    'Avidya',
    'Greater Jihad',
    'Wakan Tanka',
    'Mitakuye Oyasin',

    // Critical Theory
    'Afropessimism',
    'Anti-Blackness',
    'Necropolitics',
    'Biopolitics',
    'Sovereignty',
    'State of Exception',

    // Design/Military Theory
    'Wicked Problems',
    'Design Thinking',
    'Operational Art',
    'Strategic Design',
    'Cognitive Rigidity'
  ],

  entities: [
    // Key thinkers
    'Jean Baudrillard',
    'Ben Zweibelson',
    'Kenneth Stanley',
    'Grimes',
    'Claire Boucher',
    'Ofra Graicer',
    'Heinrich Wadley',
    'Giorgio Agamben',
    'Byung-Chul Han',
    'Frank Wilderson',
    'Achille Mbembe',
    'Timothy Morton',
    'Nick Land',

    // Organizations
    'TRADOC',
    'Army Design Methodology',
    'Space Command',
    'Transformation and Training Command',
    'CIA',
    'APD',
    'Joint Special Operations University',

    // Works
    'Symbolic Exchange and Death',
    'The Gulf War Did Not Take Place',
    'Seduction',
    'Fatal Strategies',
    'Afropessimism',
    'Red, White & Black'
  ],

  entityTypes: {
    'Person': [
      'Jean Baudrillard',
      'Ben Zweibelson',
      'Kenneth Stanley',
      'Grimes',
      'Claire Boucher',
      'Ofra Graicer',
      'Heinrich Wadley',
      'Giorgio Agamben',
      'Byung-Chul Han',
      'Frank Wilderson',
      'Achille Mbembe',
      'Timothy Morton',
      'Nick Land'
    ],
    'Organization': [
      'TRADOC',
      'Space Command',
      'Transformation and Training Command',
      'CIA',
      'APD',
      'Joint Special Operations University'
    ],
    'Work': [
      'Symbolic Exchange and Death',
      'The Gulf War Did Not Take Place',
      'Seduction',
      'Fatal Strategies',
      'Afropessimism',
      'Red, White & Black'
    ]
  }
};

/**
 * Load seed ontology from directory
 */
export function loadSeedOntology(seedDir) {
  const ontology = {
    concepts: [...DEFAULT_ONTOLOGY.concepts],
    entities: [...DEFAULT_ONTOLOGY.entities],
    entityTypes: { ...DEFAULT_ONTOLOGY.entityTypes }
  };

  if (!seedDir || !existsSync(seedDir)) {
    return ontology;
  }

  try {
    const files = readdirSync(seedDir);

    for (const file of files) {
      const filePath = join(seedDir, file);
      const ext = extname(file).toLowerCase();

      if (ext === '.json') {
        const data = JSON.parse(readFileSync(filePath, 'utf-8'));
        mergeOntology(ontology, data);
      } else if (ext === '.md' || ext === '.txt') {
        const content = readFileSync(filePath, 'utf-8');
        const items = parseListFile(content);

        if (file.toLowerCase().includes('concept')) {
          ontology.concepts.push(...items);
        } else if (file.toLowerCase().includes('entit')) {
          ontology.entities.push(...items);
        }
      }
    }
  } catch (e) {
    console.warn(`Warning: Could not load seed ontology from ${seedDir}: ${e.message}`);
  }

  // Deduplicate
  ontology.concepts = [...new Set(ontology.concepts)];
  ontology.entities = [...new Set(ontology.entities)];

  return ontology;
}

/**
 * Merge additional ontology data
 */
function mergeOntology(target, source) {
  if (source.concepts) {
    target.concepts.push(...source.concepts);
  }
  if (source.entities) {
    target.entities.push(...source.entities);
  }
  if (source.entityTypes) {
    for (const [type, items] of Object.entries(source.entityTypes)) {
      if (!target.entityTypes[type]) {
        target.entityTypes[type] = [];
      }
      target.entityTypes[type].push(...items);
    }
  }
}

/**
 * Parse a simple list file (one item per line, # for comments)
 */
function parseListFile(content) {
  return content
    .split('\n')
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#') && !line.startsWith('//'))
    .map(line => line.replace(/^[-*]\s*/, '')); // Remove list markers
}

/**
 * Get entity type from ontology
 */
export function getEntityType(entityName, ontology) {
  for (const [type, entities] of Object.entries(ontology.entityTypes || {})) {
    if (entities.includes(entityName)) {
      return type;
    }
  }
  return 'Unknown';
}

/**
 * Export ontology to file
 */
export function exportOntology(ontology, filePath) {
  const content = JSON.stringify(ontology, null, 2);
  require('fs').writeFileSync(filePath, content);
}

export default {
  DEFAULT_ONTOLOGY,
  loadSeedOntology,
  getEntityType,
  exportOntology
};
