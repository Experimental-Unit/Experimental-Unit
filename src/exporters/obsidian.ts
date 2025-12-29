// Obsidian Vault Export Generator

import JSZip from 'jszip';
import { KnowledgeGraph, Entity, Concept } from '../types';
import { sanitizeFilename, getGraphStats } from '../graphManager';

/**
 * Generate an Obsidian vault as a ZIP file
 */
export async function generateObsidianVault(graph: KnowledgeGraph): Promise<Blob> {
  const zip = new JSZip();

  // Generate entity files by type
  const entityTypes = new Map<string, Entity[]>();
  for (const entity of graph.entities.values()) {
    const typeFolder = capitalizeFirst(entity.type) + 's';
    if (!entityTypes.has(typeFolder)) {
      entityTypes.set(typeFolder, []);
    }
    entityTypes.get(typeFolder)!.push(entity);
  }

  for (const [folder, entities] of entityTypes) {
    for (const entity of entities) {
      const filename = sanitizeFilename(entity.name);
      const content = generateEntityNote(entity, graph);
      zip.file(`Entities/${folder}/${filename}.md`, content);
    }
  }

  // Generate concept files
  for (const concept of graph.concepts.values()) {
    const filename = sanitizeFilename(concept.name);
    const content = generateConceptNote(concept, graph);
    zip.file(`Concepts/${filename}.md`, content);
  }

  // Generate index and statistics files
  zip.file('_Index.md', generateIndexNote(graph));
  zip.file('_Graph Statistics.md', generateStatsNote(graph));
  zip.file('_Reading Order.md', generateReadingOrderNote(graph));

  // Generate Obsidian config
  zip.file('.obsidian/app.json', JSON.stringify({
    showLineNumber: true,
    defaultViewMode: 'preview',
  }));

  zip.file('.obsidian/graph.json', JSON.stringify({
    collapse: { search: false, tags: true },
    colorGroups: [
      { query: 'path:Entities/People', color: { r: 124, g: 58, b: 237, a: 1 } },
      { query: 'path:Concepts', color: { r: 249, g: 115, b: 22, a: 1 } },
    ],
  }));

  return await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
}

/**
 * Generate markdown content for an entity
 */
function generateEntityNote(entity: Entity, graph: KnowledgeGraph): string {
  const aliases = entity.aliases.length > 0 ? entity.aliases.map(a => `  - ${a}`).join('\n') : '';
  const relatedEntities = entity.relatedEntities
    .map(id => graph.entities.get(id))
    .filter(Boolean)
    .map(e => `- [[${e!.name}]]`)
    .join('\n');
  const relatedConcepts = entity.relatedConcepts
    .map(id => graph.concepts.get(id))
    .filter(Boolean)
    .map(c => `- [[${c!.name}]]`)
    .join('\n');

  const occurrencesList = entity.occurrences
    .sort((a, b) => a.postDate.localeCompare(b.postDate))
    .map(o => `### [[${o.postTitle}]] (${o.postDate})\n${o.context}\n\n*${o.significance}*`)
    .join('\n\n');

  return `---
type: entity
entityType: ${entity.type}
aliases:
${aliases || '  - (none)'}
significance: ${entity.significance}
firstSeen: "${entity.firstSeen}"
domains: []
---

# ${entity.name}

## Overview

${entity.description || '_No description available._'}

## Occurrences in Posts

${occurrencesList || '_No occurrences recorded._'}

## Related Entities

${relatedEntities || '_None identified._'}

## Related Concepts

${relatedConcepts || '_None identified._'}

---
*Entity extracted by Substack Knowledge Graph Generator*
`;
}

/**
 * Generate markdown content for a concept
 */
function generateConceptNote(concept: Concept, graph: KnowledgeGraph): string {
  const domains = concept.domains.map(d => `  - ${d}`).join('\n');
  const alternateTerms = concept.alternateTerms.length > 0
    ? concept.alternateTerms.map(t => `  - ${t}`).join('\n')
    : '';
  const relatedConcepts = concept.relatedConcepts
    .map(id => graph.concepts.get(id))
    .filter(Boolean)
    .map(c => `- [[${c!.name}]]`)
    .join('\n');
  const relatedEntities = concept.relatedEntities
    .map(id => graph.entities.get(id))
    .filter(Boolean)
    .map(e => `- [[${e!.name}]]`)
    .join('\n');

  const evolutionList = concept.evolution.length > 0
    ? concept.evolution
        .sort((a, b) => a.postDate.localeCompare(b.postDate))
        .map(e => `### ${e.postTitle} (${e.postDate})\n${e.note}`)
        .join('\n\n')
    : '';

  const occurrencesList = concept.occurrences
    .sort((a, b) => a.postDate.localeCompare(b.postDate))
    .slice(0, 20) // Limit to 20 to avoid huge notes
    .map(o => `- **[[${o.postTitle}]]** (${o.postDate}): ${o.context}`)
    .join('\n');

  return `---
type: concept
domains:
${domains || '  - (unclassified)'}
aliases:
${alternateTerms || '  - (none)'}
significance: ${concept.significance}
firstSeen: "${concept.firstSeen}"
---

# ${concept.name}

## Overview

${concept.description || '_No description available._'}

## Evolution Across Posts

${evolutionList || '_Evolution not tracked for this concept._'}

## Key Occurrences

${occurrencesList || '_No occurrences recorded._'}

${concept.occurrences.length > 20 ? `\n*...and ${concept.occurrences.length - 20} more occurrences.*\n` : ''}

## Related Concepts

${relatedConcepts || '_None identified._'}

## Related Entities

${relatedEntities || '_None identified._'}

---
*Concept extracted by Substack Knowledge Graph Generator*
`;
}

/**
 * Generate the main index note
 */
function generateIndexNote(graph: KnowledgeGraph): string {
  const stats = getGraphStats(graph);

  const majorEntities = Array.from(graph.entities.values())
    .filter(e => e.significance === 'major')
    .sort((a, b) => b.occurrences.length - a.occurrences.length)
    .slice(0, 15)
    .map(e => `1. [[${e.name}]] - ${e.occurrences.length} posts`)
    .join('\n');

  const majorConcepts = Array.from(graph.concepts.values())
    .filter(c => c.significance === 'major')
    .sort((a, b) => b.occurrences.length - a.occurrences.length)
    .slice(0, 15)
    .map(c => `1. [[${c.name}]] - ${c.occurrences.length} posts`)
    .join('\n');

  const domainsList = Object.entries(stats.domains)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([domain, count]) => `- ${domain}: ${count} concepts`)
    .join('\n');

  return `---
title: Knowledge Graph Index
type: home
generated: ${new Date().toISOString()}
---

# Knowledge Graph Index

Generated from **${graph.metadata.totalPostsProcessed}** posts spanning **${graph.metadata.dateRange.earliest}** to **${graph.metadata.dateRange.latest}**.

## Statistics

| Metric | Count |
|--------|-------|
| Total Entities | ${stats.totalEntities} |
| Total Concepts | ${stats.totalConcepts} |
| Total Relationships | ${stats.totalRelationships} |
| Major Entities | ${stats.majorEntities} |
| Major Concepts | ${stats.majorConcepts} |

## Major Entities (by frequency)

${majorEntities || '_None identified yet._'}

## Major Concepts (by frequency)

${majorConcepts || '_None identified yet._'}

## Domains Covered

${domainsList || '_No domains classified yet._'}

## Quick Navigation

- [[_Graph Statistics]] - Detailed statistics
- [[_Reading Order]] - Chronological reading order

### Entity Types
${Object.entries(stats.entityTypes)
  .map(([type, count]) => `- **Entities/${capitalizeFirst(type)}s** (${count})`)
  .join('\n')}

### Concepts
- **Concepts** (${stats.totalConcepts})

---
*Generated by Substack Knowledge Graph Generator*
`;
}

/**
 * Generate statistics note
 */
function generateStatsNote(graph: KnowledgeGraph): string {
  const stats = getGraphStats(graph);

  const entityTypeBreakdown = Object.entries(stats.entityTypes)
    .sort((a, b) => b[1] - a[1])
    .map(([type, count]) => `| ${capitalizeFirst(type)} | ${count} |`)
    .join('\n');

  const domainBreakdown = Object.entries(stats.domains)
    .sort((a, b) => b[1] - a[1])
    .map(([domain, count]) => `| ${domain} | ${count} |`)
    .join('\n');

  const relationshipTypes: Record<string, number> = {};
  for (const rel of graph.relationships) {
    relationshipTypes[rel.type] = (relationshipTypes[rel.type] || 0) + 1;
  }
  const relTypeBreakdown = Object.entries(relationshipTypes)
    .sort((a, b) => b[1] - a[1])
    .map(([type, count]) => `| ${type} | ${count} |`)
    .join('\n');

  return `---
title: Graph Statistics
type: statistics
generated: ${new Date().toISOString()}
---

# Graph Statistics

## Overview

- **Total Posts Processed**: ${graph.metadata.totalPostsProcessed}
- **Date Range**: ${graph.metadata.dateRange.earliest} to ${graph.metadata.dateRange.latest}
- **Last Updated**: ${graph.metadata.lastUpdated}

## Entity Breakdown

| Type | Count |
|------|-------|
${entityTypeBreakdown}
| **Total** | **${stats.totalEntities}** |

## Concept Domains

| Domain | Concepts |
|--------|----------|
${domainBreakdown}

## Relationship Types

| Type | Count |
|------|-------|
${relTypeBreakdown}
| **Total** | **${stats.totalRelationships}** |

## Significance Distribution

### Entities
- Major: ${stats.majorEntities}
- Moderate/Minor: ${stats.totalEntities - stats.majorEntities}

### Concepts
- Major: ${stats.majorConcepts}
- Moderate/Minor: ${stats.totalConcepts - stats.majorConcepts}

---
*Generated by Substack Knowledge Graph Generator*
`;
}

/**
 * Generate reading order note based on post dates
 */
function generateReadingOrderNote(graph: KnowledgeGraph): string {
  // Collect all unique posts from occurrences
  const postsMap = new Map<string, { title: string; date: string }>();

  for (const entity of graph.entities.values()) {
    for (const occ of entity.occurrences) {
      if (!postsMap.has(occ.postTitle)) {
        postsMap.set(occ.postTitle, { title: occ.postTitle, date: occ.postDate });
      }
    }
  }

  for (const concept of graph.concepts.values()) {
    for (const occ of concept.occurrences) {
      if (!postsMap.has(occ.postTitle)) {
        postsMap.set(occ.postTitle, { title: occ.postTitle, date: occ.postDate });
      }
    }
  }

  const sortedPosts = Array.from(postsMap.values())
    .sort((a, b) => a.date.localeCompare(b.date));

  const postList = sortedPosts
    .map((p, i) => `${i + 1}. **${p.date}** - ${p.title}`)
    .join('\n');

  return `---
title: Reading Order
type: navigation
generated: ${new Date().toISOString()}
---

# Chronological Reading Order

Posts in the order they were published, for understanding the evolution of ideas.

## All Posts (${sortedPosts.length} total)

${postList || '_No posts processed yet._'}

---
*Generated by Substack Knowledge Graph Generator*
`;
}

/**
 * Helper to capitalize first letter
 */
function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Re-export sanitizeFilename from the module scope
export { sanitizeFilename };
