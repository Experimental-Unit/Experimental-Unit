/**
 * Vault Generator Module
 * Builds the complete Obsidian vault and packages it as a ZIP
 */

import AdmZip from 'adm-zip';
import {
  generateArticleNote,
  generateConceptNote,
  generateEntityNote,
  generateIndexNote,
  generateHomeNote,
  sanitizeFilename
} from './templates.js';

// Default folder configuration
const DEFAULT_CONFIG = {
  folders: {
    articles: 'Articles',
    concepts: 'Concepts',
    entities: 'Entities',
    indices: 'Indices'
  }
};

/**
 * Aggregate concepts from all extractions
 */
function aggregateConcepts(extractions) {
  const conceptMap = new Map();

  for (const extraction of extractions) {
    if (!extraction.concepts) continue;

    for (const concept of extraction.concepts) {
      const key = concept.name.toLowerCase();
      if (!conceptMap.has(key)) {
        conceptMap.set(key, {
          name: concept.name,
          mentions: []
        });
      }

      conceptMap.get(key).mentions.push({
        articleTitle: extraction.title,
        relevance: concept.relevance
      });
    }
  }

  return conceptMap;
}

/**
 * Aggregate entities from all extractions
 */
function aggregateEntities(extractions) {
  const entityMap = new Map();

  for (const extraction of extractions) {
    if (!extraction.entities) continue;

    for (const entity of extraction.entities) {
      const key = entity.name.toLowerCase();
      if (!entityMap.has(key)) {
        entityMap.set(key, {
          name: entity.name,
          type: entity.type,
          mentions: []
        });
      }

      entityMap.get(key).mentions.push({
        articleTitle: extraction.title,
        type: entity.type,
        context: entity.context
      });
    }
  }

  return entityMap;
}

/**
 * Generate Obsidian configuration files
 */
function generateObsidianConfig() {
  const appConfig = {
    showLineNumber: true,
    strictLineBreaks: false,
    defaultViewMode: 'preview'
  };

  const graphConfig = {
    collapse: {
      search: true,
      localGraph: true,
      colorGroups: true,
      display: true,
      forces: true
    },
    search: '',
    showTags: true,
    showAttachments: false,
    hideUnresolved: false,
    showOrphans: true,
    localJumps: 1,
    localBacklinks: true,
    localForelinks: true,
    localInterlinks: false,
    linkStrength: 1,
    repelStrength: 10,
    centerStrength: 0.518713,
    textFadeMultiplier: 0,
    scale: 1.2
  };

  return {
    'app.json': JSON.stringify(appConfig, null, 2),
    'graph.json': JSON.stringify(graphConfig, null, 2)
  };
}

/**
 * Generate all notes and package as ZIP
 */
export async function generateVaultZip(extractions, outputPath) {
  const config = DEFAULT_CONFIG;
  const { folders } = config;

  const stats = {
    articles: 0,
    concepts: 0,
    entities: 0,
    totalWords: 0,
    topThemes: [],
    recentArticles: []
  };

  const zip = new AdmZip();

  // Aggregate concepts and entities
  const conceptMap = aggregateConcepts(extractions);
  const entityMap = aggregateEntities(extractions);

  // Track all themes
  const themeCount = new Map();

  // Generate Article notes
  for (const extraction of extractions) {
    const note = generateArticleNote(extraction, config);
    const filePath = `${note.folder}/${note.filename}`;
    zip.addFile(filePath, Buffer.from(note.content, 'utf-8'));
    stats.articles++;
    stats.totalWords += extraction.wordCount || 0;

    // Track themes
    for (const theme of extraction.themes || []) {
      themeCount.set(theme, (themeCount.get(theme) || 0) + 1);
    }

    // Track recent articles
    stats.recentArticles.push({
      title: extraction.title,
      date: extraction.date
    });
  }

  // Sort recent articles by date
  stats.recentArticles.sort((a, b) => {
    if (!a.date) return 1;
    if (!b.date) return -1;
    return b.date.localeCompare(a.date);
  });
  stats.recentArticles = stats.recentArticles.slice(0, 10);

  // Get top themes
  stats.topThemes = [...themeCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([theme]) => theme);

  // Generate Concept notes
  for (const [, data] of conceptMap) {
    const note = generateConceptNote(data.name, data.mentions, config);
    const filePath = `${note.folder}/${note.filename}`;
    zip.addFile(filePath, Buffer.from(note.content, 'utf-8'));
    stats.concepts++;
  }

  // Generate Entity notes
  for (const [, data] of entityMap) {
    const note = generateEntityNote(data.name, data, data.mentions, config);
    const filePath = `${note.folder}/${note.filename}`;
    zip.addFile(filePath, Buffer.from(note.content, 'utf-8'));
    stats.entities++;
  }

  // Generate Index notes
  const articleIndex = generateIndexNote(
    'Article Index',
    extractions.map(e => ({
      name: e.title,
      folder: folders.articles,
      count: e.wordCount
    })).sort((a, b) => a.name.localeCompare(b.name)),
    config,
    {
      grouped: true,
      countLabel: ' words',
      description: 'Complete index of all processed articles, organized alphabetically.'
    }
  );
  zip.addFile(
    `${folders.indices}/${articleIndex.filename}`,
    Buffer.from(articleIndex.content, 'utf-8')
  );

  const conceptIndex = generateIndexNote(
    'Concept Index',
    [...conceptMap.values()].map(c => ({
      name: c.name,
      folder: folders.concepts,
      count: c.mentions.length
    })).sort((a, b) => b.count - a.count),
    config,
    {
      countLabel: ' mentions',
      description: 'Index of theoretical concepts and frameworks, sorted by frequency.'
    }
  );
  zip.addFile(
    `${folders.indices}/${conceptIndex.filename}`,
    Buffer.from(conceptIndex.content, 'utf-8')
  );

  const entityIndex = generateIndexNote(
    'Entity Index',
    [...entityMap.values()].map(e => ({
      name: e.name,
      folder: folders.entities,
      count: e.mentions.length
    })).sort((a, b) => b.count - a.count),
    config,
    {
      grouped: true,
      countLabel: ' mentions',
      description: 'Index of people, organizations, works, and other entities.'
    }
  );
  zip.addFile(
    `${folders.indices}/${entityIndex.filename}`,
    Buffer.from(entityIndex.content, 'utf-8')
  );

  // Generate Home note
  const home = generateHomeNote(stats, config);
  zip.addFile(home.filename, Buffer.from(home.content, 'utf-8'));

  // Add Obsidian configuration
  const obsidianConfig = generateObsidianConfig();
  for (const [filename, content] of Object.entries(obsidianConfig)) {
    zip.addFile(`.obsidian/${filename}`, Buffer.from(content, 'utf-8'));
  }

  // Write ZIP to file
  zip.writeZip(outputPath);

  return stats;
}

export default { generateVaultZip };
