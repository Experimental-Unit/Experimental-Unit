// LLM Context File Export Generator
// Creates a single markdown file optimized for upload to LLMs

import { KnowledgeGraph, Entity, Relationship } from '../types';
import { getGraphStats } from '../graphManager';

/**
 * Generate LLM context file as a downloadable blob
 */
export function generateLLMContextFile(graph: KnowledgeGraph, authorName?: string): Blob {
  const content = generateLLMContext(graph, authorName);
  return new Blob([content], { type: 'text/markdown' });
}

/**
 * Generate the full LLM context markdown
 */
function generateLLMContext(graph: KnowledgeGraph, authorName?: string): string {
  const author = authorName || 'the author';

  const sections = [
    generateHeader(graph, author),
    generateUsageInstructions(),
    generateEntityDirectory(graph),
    generateConceptDirectory(graph),
    generateRelationshipMap(graph),
    generateChronologicalDevelopment(graph),
    generateKeyFrameworks(graph),
    generateSampleQuestions(graph, author),
  ];

  return sections.join('\n\n---\n\n');
}

/**
 * Generate header section
 */
function generateHeader(graph: KnowledgeGraph, author: string): string {
  const stats = getGraphStats(graph);

  return `# Knowledge Graph: ${author}'s Substack

This document contains a structured knowledge graph extracted from **${graph.metadata.totalPostsProcessed}** blog posts published between **${graph.metadata.dateRange.earliest}** and **${graph.metadata.dateRange.latest}**.

Use this to answer questions about ${author}'s intellectual framework, influences, and ideas.

## Quick Stats

- **${stats.totalEntities}** Entities (people, organizations, works, etc.)
- **${stats.totalConcepts}** Concepts (theories, frameworks, ideas)
- **${stats.totalRelationships}** Relationships between entities and concepts
- **${stats.majorEntities}** Major figures frequently referenced
- **${stats.majorConcepts}** Core concepts developed across multiple posts`;
}

/**
 * Generate usage instructions
 */
function generateUsageInstructions(): string {
  return `## How to Use This Document

When answering questions about this author's work:

1. **Reference specific posts by title** when citing evidence
2. **Note how concepts evolved** across posts when relevant
3. **Identify relationships** between entities and concepts
4. **Distinguish** between the author's original ideas and their engagement with others' work
5. **Track evolution** - pay attention to how ideas develop chronologically

### Notation

- **[MAJOR]** - Central to multiple posts, frequently referenced
- **[MODERATE]** - Notable but not central
- Entity types: person, organization, place, work, event
- Relationship types: influences, critiques, extends, opposes, applies, cites, develops, synthesizes`;
}

/**
 * Generate entity directory
 */
function generateEntityDirectory(graph: KnowledgeGraph): string {
  // Group entities by type
  const byType = new Map<string, Entity[]>();

  for (const entity of graph.entities.values()) {
    if (!byType.has(entity.type)) {
      byType.set(entity.type, []);
    }
    byType.get(entity.type)!.push(entity);
  }

  // Sort each group by significance and occurrence count
  for (const entities of byType.values()) {
    entities.sort((a, b) => {
      if (a.significance !== b.significance) {
        const sigOrder = { major: 0, moderate: 1, minor: 2 };
        return sigOrder[a.significance] - sigOrder[b.significance];
      }
      return b.occurrences.length - a.occurrences.length;
    });
  }

  const typeOrder = ['person', 'organization', 'work', 'place', 'event', 'other'];
  const sections: string[] = ['## Entity Directory'];

  for (const type of typeOrder) {
    const entities = byType.get(type);
    if (!entities || entities.length === 0) continue;

    const typeName = type.charAt(0).toUpperCase() + type.slice(1) + 's';
    sections.push(`\n### ${typeName}\n`);

    for (const entity of entities.slice(0, 30)) { // Limit to top 30 per type
      const sig = entity.significance === 'major' ? '[MAJOR]' : entity.significance === 'moderate' ? '[MODERATE]' : '';
      const aliases = entity.aliases.length > 0 ? `\n**Also Known As**: ${entity.aliases.join(', ')}` : '';
      const keyPosts = entity.occurrences
        .slice(0, 5)
        .map(o => `"${o.postTitle}"`)
        .join(', ');

      const relatedEntities = entity.relatedEntities
        .slice(0, 5)
        .map(id => graph.entities.get(id)?.name)
        .filter(Boolean)
        .join(', ');

      const relatedConcepts = entity.relatedConcepts
        .slice(0, 5)
        .map(id => graph.concepts.get(id)?.name)
        .filter(Boolean)
        .join(', ');

      sections.push(`#### ${entity.name} ${sig}

**Description**: ${entity.description || 'No description available.'}${aliases}
**First Seen**: "${entity.firstSeen}"
**Key Posts**: ${keyPosts || 'N/A'}
**Related To**: ${[relatedEntities, relatedConcepts].filter(Boolean).join('; ') || 'N/A'}
`);
    }

    if (entities.length > 30) {
      sections.push(`\n*...and ${entities.length - 30} more ${typeName.toLowerCase()}.*\n`);
    }
  }

  return sections.join('\n');
}

/**
 * Generate concept directory
 */
function generateConceptDirectory(graph: KnowledgeGraph): string {
  const concepts = Array.from(graph.concepts.values())
    .sort((a, b) => {
      if (a.significance !== b.significance) {
        const sigOrder = { major: 0, moderate: 1, minor: 2 };
        return sigOrder[a.significance] - sigOrder[b.significance];
      }
      return b.occurrences.length - a.occurrences.length;
    });

  const sections: string[] = ['## Concept Directory'];

  for (const concept of concepts.slice(0, 50)) { // Limit to top 50
    const sig = concept.significance === 'major' ? '[MAJOR]' : concept.significance === 'moderate' ? '[MODERATE]' : '';
    const domains = concept.domains.length > 0 ? concept.domains.join(', ') : 'Unclassified';
    const aliases = concept.alternateTerms.length > 0 ? `\n**Also Known As**: ${concept.alternateTerms.join(', ')}` : '';

    const evolution = concept.evolution.length > 0
      ? concept.evolution
          .slice(0, 3)
          .map(e => `- *${e.postTitle}*: ${e.note}`)
          .join('\n')
      : '';

    const keyPosts = concept.occurrences
      .slice(0, 5)
      .map(o => `"${o.postTitle}"`)
      .join(', ');

    const relatedConcepts = concept.relatedConcepts
      .slice(0, 5)
      .map(id => graph.concepts.get(id)?.name)
      .filter(Boolean)
      .join(', ');

    const relatedEntities = concept.relatedEntities
      .slice(0, 5)
      .map(id => graph.entities.get(id)?.name)
      .filter(Boolean)
      .join(', ');

    sections.push(`### ${concept.name} ${sig}

**Domains**: ${domains}
**Description**: ${concept.description || 'No description available.'}${aliases}
**First Seen**: "${concept.firstSeen}"
**Key Posts**: ${keyPosts || 'N/A'}
${evolution ? `**Evolution**:\n${evolution}` : ''}
**Related Concepts**: ${relatedConcepts || 'None identified'}
**Related Entities**: ${relatedEntities || 'None identified'}
`);
  }

  if (concepts.length > 50) {
    sections.push(`\n*...and ${concepts.length - 50} more concepts.*\n`);
  }

  return sections.join('\n');
}

/**
 * Generate relationship map
 */
function generateRelationshipMap(graph: KnowledgeGraph): string {
  // Group relationships by type
  const byType = new Map<string, Relationship[]>();

  for (const rel of graph.relationships) {
    if (!byType.has(rel.type)) {
      byType.set(rel.type, []);
    }
    byType.get(rel.type)!.push(rel);
  }

  const sections: string[] = ['## Relationship Map'];

  // Get entity/concept names for display
  const getName = (id: string): string => {
    return graph.entities.get(id)?.name || graph.concepts.get(id)?.name || id;
  };

  const typeDescriptions: Record<string, string> = {
    influences: 'Intellectual Lineage',
    critiques: 'Critiques and Tensions',
    extends: 'Conceptual Extensions',
    opposes: 'Opposing Views',
    applies: 'Applications',
    cites: 'Citations',
    develops: 'Developments',
    synthesizes: 'Syntheses',
    related: 'Related Ideas',
  };

  for (const [type, rels] of byType) {
    if (rels.length === 0) continue;

    const heading = typeDescriptions[type] || type.charAt(0).toUpperCase() + type.slice(1);
    sections.push(`\n### ${heading}\n`);

    // Sort by evidence count (more evidence = more important)
    const sorted = rels.sort((a, b) => b.evidence.length - a.evidence.length);

    for (const rel of sorted.slice(0, 20)) {
      const sourceName = getName(rel.sourceId);
      const targetName = getName(rel.targetId);
      sections.push(`- **${sourceName}** → *${type}* → **${targetName}**: ${rel.description}`);
    }

    if (rels.length > 20) {
      sections.push(`\n*...and ${rels.length - 20} more ${type} relationships.*`);
    }
  }

  return sections.join('\n');
}

/**
 * Generate chronological development section
 */
function generateChronologicalDevelopment(graph: KnowledgeGraph): string {
  // Collect posts and their key introductions
  const postData = new Map<string, {
    date: string;
    newEntities: string[];
    newConcepts: string[];
    evolutions: string[];
  }>();

  // Track first appearances
  for (const entity of graph.entities.values()) {
    if (entity.occurrences.length > 0) {
      const first = entity.occurrences[0];
      if (!postData.has(first.postTitle)) {
        postData.set(first.postTitle, { date: first.postDate, newEntities: [], newConcepts: [], evolutions: [] });
      }
      postData.get(first.postTitle)!.newEntities.push(entity.name);
    }
  }

  for (const concept of graph.concepts.values()) {
    if (concept.occurrences.length > 0) {
      const first = concept.occurrences[0];
      if (!postData.has(first.postTitle)) {
        postData.set(first.postTitle, { date: first.postDate, newEntities: [], newConcepts: [], evolutions: [] });
      }
      postData.get(first.postTitle)!.newConcepts.push(concept.name);
    }

    for (const evo of concept.evolution) {
      if (!postData.has(evo.postTitle)) {
        postData.set(evo.postTitle, { date: evo.postDate, newEntities: [], newConcepts: [], evolutions: [] });
      }
      postData.get(evo.postTitle)!.evolutions.push(`${concept.name}: ${evo.note}`);
    }
  }

  // Sort by date
  const sorted = Array.from(postData.entries())
    .sort((a, b) => a[1].date.localeCompare(b[1].date));

  // Group into phases (roughly by thirds)
  const totalPosts = sorted.length;
  const phaseSize = Math.ceil(totalPosts / 3);

  const phases = [
    { name: 'Phase 1: Foundation', posts: sorted.slice(0, phaseSize) },
    { name: 'Phase 2: Development', posts: sorted.slice(phaseSize, phaseSize * 2) },
    { name: 'Phase 3: Application', posts: sorted.slice(phaseSize * 2) },
  ].filter(p => p.posts.length > 0);

  const sections: string[] = ['## Chronological Development'];

  for (const phase of phases) {
    sections.push(`\n### ${phase.name} (posts ${sorted.indexOf(phase.posts[0]) + 1}-${sorted.indexOf(phase.posts[phase.posts.length - 1]) + 1})\n`);

    const keyEntities = phase.posts.flatMap(p => p[1].newEntities).slice(0, 10);
    const keyConcepts = phase.posts.flatMap(p => p[1].newConcepts).slice(0, 10);
    const keyEvolutions = phase.posts.flatMap(p => p[1].evolutions).slice(0, 5);

    if (keyEntities.length > 0) {
      sections.push(`**Key Figures Introduced**: ${keyEntities.join(', ')}`);
    }
    if (keyConcepts.length > 0) {
      sections.push(`**Core Concepts Introduced**: ${keyConcepts.join(', ')}`);
    }
    if (keyEvolutions.length > 0) {
      sections.push(`**Notable Developments**:`);
      for (const evo of keyEvolutions) {
        sections.push(`- ${evo}`);
      }
    }
  }

  return sections.join('\n');
}

/**
 * Generate key frameworks section
 */
function generateKeyFrameworks(graph: KnowledgeGraph): string {
  const majorConcepts = Array.from(graph.concepts.values())
    .filter(c => c.significance === 'major')
    .sort((a, b) => b.occurrences.length - a.occurrences.length)
    .slice(0, 5);

  if (majorConcepts.length === 0) {
    return '## Key Frameworks\n\n*No major frameworks identified yet. Process more posts to identify recurring themes.*';
  }

  const sections: string[] = ['## Quick Reference: Key Frameworks'];

  for (const concept of majorConcepts) {
    sections.push(`\n### ${concept.name}\n`);
    sections.push(concept.description || 'No description available.');

    if (concept.evolution.length > 0) {
      sections.push('\n**Evolution**:');
      for (const evo of concept.evolution.slice(0, 3)) {
        sections.push(`- *${evo.postTitle}*: ${evo.note}`);
      }
    }
  }

  return sections.join('\n');
}

/**
 * Generate sample questions
 */
function generateSampleQuestions(graph: KnowledgeGraph, author: string): string {
  const majorEntities = Array.from(graph.entities.values())
    .filter(e => e.significance === 'major')
    .slice(0, 3)
    .map(e => e.name);

  const majorConcepts = Array.from(graph.concepts.values())
    .filter(c => c.significance === 'major')
    .slice(0, 3)
    .map(c => c.name);

  const questions = [
    `"How does ${author}'s work engage with ${majorEntities[0] || 'key thinkers'}?"`,
    `"What is ${author}'s understanding of ${majorConcepts[0] || 'core concepts'}?"`,
    `"Trace the development of ${majorConcepts[1] || 'ideas'} across the posts."`,
    `"Who are the most frequently cited thinkers and how does ${author} position themselves relative to each?"`,
    `"What critiques does ${author} level at mainstream frameworks?"`,
    `"How do ${majorConcepts[0] || 'concept A'} and ${majorConcepts[1] || 'concept B'} relate in ${author}'s work?"`,
  ];

  return `## Sample Questions This Graph Can Answer

${questions.map((q, i) => `${i + 1}. ${q}`).join('\n')}

---

*Generated by Substack Knowledge Graph Generator*
*Last Updated: ${new Date().toISOString()}*`;
}

/**
 * Copy LLM context to clipboard
 */
export async function copyLLMContextToClipboard(graph: KnowledgeGraph, authorName?: string): Promise<void> {
  const content = generateLLMContext(graph, authorName);
  await navigator.clipboard.writeText(content);
}
