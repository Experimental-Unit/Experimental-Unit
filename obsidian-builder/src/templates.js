/**
 * Obsidian Note Template Generators
 * Creates properly formatted Markdown notes with YAML frontmatter
 */

import { stringify as yamlStringify } from 'yaml';

/**
 * Sanitize a string for use as a filename
 */
export function sanitizeFilename(name) {
  return name
    .replace(/[<>:"/\\|?*]/g, '')  // Remove illegal chars
    .replace(/\s+/g, ' ')          // Normalize spaces
    .trim()
    .slice(0, 100);                // Limit length
}

/**
 * Create a WikiLink
 */
export function wikiLink(name, folder = null) {
  const sanitized = sanitizeFilename(name);
  if (folder) {
    return `[[${folder}/${sanitized}|${name}]]`;
  }
  return `[[${sanitized}]]`;
}

/**
 * Generate YAML frontmatter
 */
function generateFrontmatter(data) {
  const yaml = yamlStringify(data, { lineWidth: 0 });
  return `---\n${yaml}---\n`;
}

/**
 * Generate an Article note
 */
export function generateArticleNote(extraction, config) {
  const { folders } = config;

  // Build frontmatter
  const frontmatter = {
    title: extraction.title,
    date: extraction.date || 'unknown',
    type: 'article',
    source: extraction.sourceFile,
    wordCount: extraction.wordCount,
    tags: extraction.themes?.map(t => t.toLowerCase().replace(/\s+/g, '-')) || [],
    created: new Date().toISOString().split('T')[0]
  };

  // Build concept links
  const conceptLinks = extraction.concepts?.map(c =>
    `- ${wikiLink(c.name, folders.concepts)}: ${c.relevance || ''}`
  ).join('\n') || '_No concepts identified_';

  // Build entity links
  const entityLinks = extraction.entities?.map(e =>
    `- ${wikiLink(e.name, folders.entities)} (${e.type || 'Unknown'}): ${e.context || ''}`
  ).join('\n') || '_No entities identified_';

  // Build quotes section
  const quotesSection = extraction.quotes?.map(q =>
    `> "${q.text}"\n> — _${q.significance || 'Key passage'}_`
  ).join('\n\n') || '_No key quotes extracted_';

  // Build connections section
  const connectionsSection = extraction.connections?.map(c =>
    `- ${c}`
  ).join('\n') || '_No connections identified_';

  const content = `${generateFrontmatter(frontmatter)}
# ${extraction.title}

## Summary

${extraction.summary}

## Key Concepts

${conceptLinks}

## Key Entities

${entityLinks}

## Key Quotes

${quotesSection}

## Connections

${connectionsSection}

---

**Source:** \`${extraction.sourceFile}\`
**Words:** ${extraction.wordCount}
${extraction.date ? `**Date:** ${extraction.date}` : ''}
`;

  return {
    filename: sanitizeFilename(extraction.title) + '.md',
    content,
    folder: folders.articles
  };
}

/**
 * Generate a Concept note
 */
export function generateConceptNote(conceptName, mentions, config) {
  const { folders } = config;

  // Aggregate information about this concept
  const allRelevances = mentions
    .filter(m => m.relevance)
    .map(m => m.relevance);

  const uniqueRelevances = [...new Set(allRelevances)];

  const frontmatter = {
    title: conceptName,
    type: 'concept',
    aliases: [],
    mentions: mentions.length,
    created: new Date().toISOString().split('T')[0]
  };

  // List of articles where this concept appears
  const articleLinks = mentions.map(m =>
    `- ${wikiLink(m.articleTitle, folders.articles)}`
  ).join('\n');

  const content = `${generateFrontmatter(frontmatter)}
# ${conceptName}

## Definition

_A theoretical framework or concept appearing in the Experimental Unit corpus._

## Relevance to Experimental Unit

${uniqueRelevances.length > 0
  ? uniqueRelevances.map(r => `- ${r}`).join('\n')
  : '_Relevance not yet documented_'}

## Appears In

${articleLinks || '_No articles linked yet_'}

## Related Concepts

_To be populated through analysis_

## Notes

_Add notes about this concept here_
`;

  return {
    filename: sanitizeFilename(conceptName) + '.md',
    content,
    folder: folders.concepts
  };
}

/**
 * Generate an Entity note
 */
export function generateEntityNote(entityName, entityData, mentions, config) {
  const { folders } = config;

  // Determine entity type from mentions
  const types = mentions
    .map(m => m.type)
    .filter(Boolean);
  const primaryType = types[0] || 'Unknown';

  // Aggregate contexts
  const contexts = mentions
    .filter(m => m.context)
    .map(m => m.context);

  const frontmatter = {
    title: entityName,
    type: 'entity',
    entityType: primaryType,
    mentions: mentions.length,
    created: new Date().toISOString().split('T')[0]
  };

  // List of articles where this entity appears
  const articleLinks = mentions.map(m =>
    `- ${wikiLink(m.articleTitle, folders.articles)}: ${m.context || ''}`
  ).join('\n');

  const content = `${generateFrontmatter(frontmatter)}
# ${entityName}

**Type:** ${primaryType}

## Description

_${primaryType === 'Person' ? 'A person' :
   primaryType === 'Organization' ? 'An organization' :
   primaryType === 'Work' ? 'A work or text' :
   primaryType === 'Place' ? 'A location' :
   primaryType === 'Event' ? 'An event' :
   'An entity'} referenced in the Experimental Unit corpus._

## Appearances

${articleLinks || '_No articles linked yet_'}

## Interactions

_Document interactions, communications, or engagements here_

## Notes

_Add notes about this entity here_
`;

  return {
    filename: sanitizeFilename(entityName) + '.md',
    content,
    folder: folders.entities
  };
}

/**
 * Generate an Index note
 */
export function generateIndexNote(title, items, config, options = {}) {
  const { folders } = config;

  const frontmatter = {
    title,
    type: 'index',
    created: new Date().toISOString().split('T')[0]
  };

  let itemsContent = '';

  if (options.grouped) {
    // Group items by first letter
    const grouped = {};
    for (const item of items) {
      const letter = item.name[0].toUpperCase();
      if (!grouped[letter]) grouped[letter] = [];
      grouped[letter].push(item);
    }

    for (const letter of Object.keys(grouped).sort()) {
      itemsContent += `\n### ${letter}\n\n`;
      for (const item of grouped[letter]) {
        const link = wikiLink(item.name, item.folder);
        itemsContent += `- ${link}${item.count ? ` (${item.count} mentions)` : ''}\n`;
      }
    }
  } else {
    for (const item of items) {
      const link = wikiLink(item.name, item.folder);
      itemsContent += `- ${link}${item.count ? ` (${item.count} mentions)` : ''}\n`;
    }
  }

  const content = `${generateFrontmatter(frontmatter)}
# ${title}

${options.description || ''}

## Contents

${itemsContent}
`;

  return {
    filename: sanitizeFilename(title) + '.md',
    content,
    folder: folders.indices
  };
}

/**
 * Generate the main vault index (Home note)
 */
export function generateHomeNote(stats, config) {
  const { folders } = config;

  const frontmatter = {
    title: 'Home',
    type: 'home',
    created: new Date().toISOString().split('T')[0]
  };

  const content = `${generateFrontmatter(frontmatter)}
# Experimental Unit Knowledge Vault

Welcome to the Experimental Unit knowledge graph. This vault contains structured extractions from the corpus of writings, organized for exploration and connection.

## Quick Stats

- **Articles:** ${stats.articles}
- **Concepts:** ${stats.concepts}
- **Entities:** ${stats.entities}
- **Total Words:** ${stats.totalWords.toLocaleString()}

## Navigation

### By Type
- ${wikiLink('Article Index', folders.indices)} - All processed articles
- ${wikiLink('Concept Index', folders.indices)} - Theoretical frameworks and ideas
- ${wikiLink('Entity Index', folders.indices)} - People, organizations, and works

### By Theme
${stats.topThemes?.map(t => `- ${t}`).join('\n') || '_Themes not yet indexed_'}

## Recent Additions

${stats.recentArticles?.map(a =>
  `- ${wikiLink(a.title, folders.articles)} (${a.date || 'undated'})`
).join('\n') || '_No recent articles_'}

## Graph View

Open the Graph View (Ctrl/Cmd + G) to explore connections between concepts, entities, and articles.

---

_Generated by Obsidian Knowledge Graph Builder_
_Last updated: ${new Date().toISOString().split('T')[0]}_
`;

  return {
    filename: 'Home.md',
    content,
    folder: null // Root of vault
  };
}

export default {
  sanitizeFilename,
  wikiLink,
  generateArticleNote,
  generateConceptNote,
  generateEntityNote,
  generateIndexNote,
  generateHomeNote
};
