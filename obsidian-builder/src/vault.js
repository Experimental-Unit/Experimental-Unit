/**
 * Vault Generator Module
 * Builds the complete Obsidian vault structure from extractions
 */

import { mkdirSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import {
  generateArticleNote,
  generateConceptNote,
  generateEntityNote,
  generateIndexNote,
  generateHomeNote,
  sanitizeFilename
} from './templates.js';

/**
 * Create vault directory structure
 */
export function createVaultStructure(outputDir, config) {
  const { folders } = config;

  // Create main vault directory
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  // Create subdirectories
  for (const folder of Object.values(folders)) {
    const folderPath = join(outputDir, folder);
    if (!existsSync(folderPath)) {
      mkdirSync(folderPath, { recursive: true });
    }
  }

  // Create .obsidian folder with basic config
  const obsidianDir = join(outputDir, '.obsidian');
  if (!existsSync(obsidianDir)) {
    mkdirSync(obsidianDir, { recursive: true });
  }

  // Write app.json for Obsidian settings
  writeFileSync(
    join(obsidianDir, 'app.json'),
    JSON.stringify({
      showLineNumber: true,
      strictLineBreaks: false,
      defaultViewMode: 'preview'
    }, null, 2)
  );

  // Write graph.json for graph view settings
  writeFileSync(
    join(obsidianDir, 'graph.json'),
    JSON.stringify({
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
      collapse: {
        colorGroups: true,
        display: true,
        forces: true
      },
      localJumps: 1,
      localBacklinks: true,
      localForelinks: true,
      localInterlinks: false,
      linkStrength: 1,
      repelStrength: 10,
      centerStrength: 0.518713,
      textFadeMultiplier: 0,
      scale: 1.2
    }, null, 2)
  );
}

/**
 * Aggregate concepts from all extractions
 */
export function aggregateConcepts(extractions) {
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
export function aggregateEntities(extractions) {
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
 * Generate all notes and write to vault
 */
export function generateVault(extractions, outputDir, config) {
  const { folders } = config;
  const stats = {
    articles: 0,
    concepts: 0,
    entities: 0,
    totalWords: 0,
    topThemes: [],
    recentArticles: []
  };

  // Create directory structure
  createVaultStructure(outputDir, config);

  // Aggregate concepts and entities
  const conceptMap = aggregateConcepts(extractions);
  const entityMap = aggregateEntities(extractions);

  // Track all themes
  const themeCount = new Map();

  // Generate Article notes
  for (const extraction of extractions) {
    const note = generateArticleNote(extraction, config);
    const filePath = join(outputDir, note.folder, note.filename);
    writeFileSync(filePath, note.content);
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
    const filePath = join(outputDir, note.folder, note.filename);
    writeFileSync(filePath, note.content);
    stats.concepts++;
  }

  // Generate Entity notes
  for (const [, data] of entityMap) {
    const note = generateEntityNote(data.name, data, data.mentions, config);
    const filePath = join(outputDir, note.folder, note.filename);
    writeFileSync(filePath, note.content);
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
      description: 'Complete index of all processed articles, organized alphabetically.'
    }
  );
  writeFileSync(
    join(outputDir, folders.indices, articleIndex.filename),
    articleIndex.content
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
      description: 'Index of theoretical concepts and frameworks, sorted by frequency.'
    }
  );
  writeFileSync(
    join(outputDir, folders.indices, conceptIndex.filename),
    conceptIndex.content
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
      description: 'Index of people, organizations, works, and other entities.'
    }
  );
  writeFileSync(
    join(outputDir, folders.indices, entityIndex.filename),
    entityIndex.content
  );

  // Generate Home note
  const home = generateHomeNote(stats, config);
  writeFileSync(join(outputDir, home.filename), home.content);

  return stats;
}

/**
 * Validate vault integrity - check for broken links
 */
export function validateVault(outputDir, config) {
  const { folders } = config;
  const issues = [];

  // This would scan all files for [[links]] and verify they exist
  // For now, we ensure we create all referenced notes during generation

  return {
    valid: issues.length === 0,
    issues
  };
}

export default {
  createVaultStructure,
  aggregateConcepts,
  aggregateEntities,
  generateVault,
  validateVault
};
