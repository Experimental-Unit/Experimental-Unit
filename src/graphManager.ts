// Knowledge Graph state management

import {
  KnowledgeGraph,
  Entity,
  Concept,
  Relationship,
  Post,
  ExtractionResult,
  IntegrationResult,
  ProcessingState,
} from './types';
import { generateId, sanitizeFilename } from './utils';

// Re-export sanitizeFilename for use in exporters
export { sanitizeFilename };

const STORAGE_KEY = 'substack-kg-state';
const INTEGRATION_INTERVAL = 10; // Run integration every N posts

/**
 * Create an empty knowledge graph
 */
export function createEmptyGraph(): KnowledgeGraph {
  return {
    entities: new Map(),
    concepts: new Map(),
    relationships: [],
    metadata: {
      totalPostsProcessed: 0,
      dateRange: { earliest: '', latest: '' },
      lastUpdated: new Date().toISOString(),
    },
  };
}

/**
 * Create initial processing state
 */
export function createProcessingState(posts: Post[]): ProcessingState {
  return {
    status: 'idle',
    currentPostIndex: 0,
    totalPosts: posts.length,
    currentPostTitle: '',
    graph: createEmptyGraph(),
    posts,
    errors: [],
    startTime: Date.now(),
  };
}

/**
 * Apply extraction results to the graph
 */
export function applyExtraction(
  graph: KnowledgeGraph,
  extraction: ExtractionResult,
  post: Post
): KnowledgeGraph {
  const updatedGraph = { ...graph };
  updatedGraph.entities = new Map(graph.entities);
  updatedGraph.concepts = new Map(graph.concepts);
  updatedGraph.relationships = [...graph.relationships];

  // Process entities
  for (const extracted of extraction.entities) {
    const id = generateId(extracted.name);
    const existing = updatedGraph.entities.get(id);

    if (existing) {
      // Update existing entity
      const updated: Entity = {
        ...existing,
        occurrences: [
          ...existing.occurrences,
          {
            postTitle: post.title,
            postDate: post.date,
            context: extracted.contextInThisPost,
            significance: extracted.significanceInThisPost,
          },
        ],
        aliases: mergeArrays(existing.aliases, extracted.aliases),
        description: extracted.description.length > existing.description.length
          ? extracted.description
          : existing.description,
      };

      // Update significance based on occurrence count
      if (updated.occurrences.length >= 5) {
        updated.significance = 'major';
      } else if (updated.occurrences.length >= 2) {
        updated.significance = 'moderate';
      }

      updatedGraph.entities.set(id, updated);
    } else {
      // Create new entity
      const newEntity: Entity = {
        id,
        name: extracted.name,
        type: extracted.type,
        description: extracted.description,
        aliases: extracted.aliases,
        occurrences: [
          {
            postTitle: post.title,
            postDate: post.date,
            context: extracted.contextInThisPost,
            significance: extracted.significanceInThisPost,
          },
        ],
        relatedEntities: [],
        relatedConcepts: [],
        firstSeen: post.title,
        significance: extracted.significance,
      };
      updatedGraph.entities.set(id, newEntity);
    }
  }

  // Process concepts
  for (const extracted of extraction.concepts) {
    const id = generateId(extracted.name);
    const existing = updatedGraph.concepts.get(id);

    if (existing) {
      // Update existing concept
      const updated: Concept = {
        ...existing,
        occurrences: [
          ...existing.occurrences,
          {
            postTitle: post.title,
            postDate: post.date,
            context: extracted.contextInThisPost,
            significance: '',
          },
        ],
        domains: mergeArrays(existing.domains, extracted.domains),
        alternateTerms: mergeArrays(existing.alternateTerms, extracted.alternateTerms),
        evolution: extracted.evolutionNote
          ? [
              ...existing.evolution,
              {
                postTitle: post.title,
                postDate: post.date,
                note: extracted.evolutionNote,
              },
            ]
          : existing.evolution,
        description: extracted.description.length > existing.description.length
          ? extracted.description
          : existing.description,
      };

      // Update significance based on occurrence count
      if (updated.occurrences.length >= 5) {
        updated.significance = 'major';
      } else if (updated.occurrences.length >= 2) {
        updated.significance = 'moderate';
      }

      updatedGraph.concepts.set(id, updated);
    } else {
      // Create new concept
      const newConcept: Concept = {
        id,
        name: extracted.name,
        domains: extracted.domains,
        description: extracted.description,
        alternateTerms: extracted.alternateTerms,
        occurrences: [
          {
            postTitle: post.title,
            postDate: post.date,
            context: extracted.contextInThisPost,
            significance: '',
          },
        ],
        relatedConcepts: [],
        relatedEntities: [],
        evolution: extracted.evolutionNote
          ? [{ postTitle: post.title, postDate: post.date, note: extracted.evolutionNote }]
          : [],
        firstSeen: post.title,
        significance: 'moderate',
      };
      updatedGraph.concepts.set(id, newConcept);
    }
  }

  // Process relationships
  for (const extracted of extraction.relationships) {
    const sourceId = generateId(extracted.source);
    const targetId = generateId(extracted.target);

    // Check if relationship already exists
    const existingRel = updatedGraph.relationships.find(
      r => r.sourceId === sourceId && r.targetId === targetId && r.type === extracted.type
    );

    if (existingRel) {
      // Add post to evidence
      if (!existingRel.evidence.includes(post.title)) {
        existingRel.evidence.push(post.title);
      }
    } else {
      // Create new relationship
      const newRel: Relationship = {
        id: `${sourceId}-${extracted.type}-${targetId}`,
        sourceId,
        targetId,
        type: extracted.type as Relationship['type'],
        description: extracted.description,
        evidence: [post.title],
      };
      updatedGraph.relationships.push(newRel);
    }

    // Update related arrays in entities/concepts
    const sourceEntity = updatedGraph.entities.get(sourceId);
    const sourceConcept = updatedGraph.concepts.get(sourceId);
    const targetEntity = updatedGraph.entities.get(targetId);
    const targetConcept = updatedGraph.concepts.get(targetId);

    if (sourceEntity && targetEntity) {
      if (!sourceEntity.relatedEntities.includes(targetId)) {
        sourceEntity.relatedEntities.push(targetId);
      }
      if (!targetEntity.relatedEntities.includes(sourceId)) {
        targetEntity.relatedEntities.push(sourceId);
      }
    }

    if (sourceConcept && targetConcept) {
      if (!sourceConcept.relatedConcepts.includes(targetId)) {
        sourceConcept.relatedConcepts.push(targetId);
      }
      if (!targetConcept.relatedConcepts.includes(sourceId)) {
        targetConcept.relatedConcepts.push(sourceId);
      }
    }

    if (sourceEntity && targetConcept) {
      if (!sourceEntity.relatedConcepts.includes(targetId)) {
        sourceEntity.relatedConcepts.push(targetId);
      }
      if (!targetConcept.relatedEntities.includes(sourceId)) {
        targetConcept.relatedEntities.push(sourceId);
      }
    }

    if (sourceConcept && targetEntity) {
      if (!sourceConcept.relatedEntities.includes(targetId)) {
        sourceConcept.relatedEntities.push(targetId);
      }
      if (!targetEntity.relatedConcepts.includes(sourceId)) {
        targetEntity.relatedConcepts.push(sourceId);
      }
    }
  }

  // Update metadata
  updatedGraph.metadata.totalPostsProcessed++;
  updatedGraph.metadata.lastUpdated = new Date().toISOString();

  if (!updatedGraph.metadata.dateRange.earliest || post.date < updatedGraph.metadata.dateRange.earliest) {
    updatedGraph.metadata.dateRange.earliest = post.date;
  }
  if (!updatedGraph.metadata.dateRange.latest || post.date > updatedGraph.metadata.dateRange.latest) {
    updatedGraph.metadata.dateRange.latest = post.date;
  }

  return updatedGraph;
}

/**
 * Apply integration verification results to clean up the graph
 */
export function applyIntegration(
  graph: KnowledgeGraph,
  integration: IntegrationResult
): KnowledgeGraph {
  const updatedGraph = { ...graph };
  updatedGraph.entities = new Map(graph.entities);
  updatedGraph.concepts = new Map(graph.concepts);
  updatedGraph.relationships = [...graph.relationships];

  // Process merges
  for (const merge of integration.merges) {
    const keepEntity = updatedGraph.entities.get(merge.keep);
    const mergeEntity = updatedGraph.entities.get(merge.merge);
    const keepConcept = updatedGraph.concepts.get(merge.keep);
    const mergeConcept = updatedGraph.concepts.get(merge.merge);

    if (keepEntity && mergeEntity) {
      // Merge entity occurrences and aliases
      keepEntity.occurrences.push(...mergeEntity.occurrences);
      keepEntity.aliases = mergeArrays(keepEntity.aliases, mergeEntity.aliases, [mergeEntity.name]);
      keepEntity.relatedEntities = mergeArrays(keepEntity.relatedEntities, mergeEntity.relatedEntities);
      keepEntity.relatedConcepts = mergeArrays(keepEntity.relatedConcepts, mergeEntity.relatedConcepts);

      // Update significance
      if (keepEntity.occurrences.length >= 5) {
        keepEntity.significance = 'major';
      }

      // Remove merged entity
      updatedGraph.entities.delete(merge.merge);

      // Update relationships to point to kept entity
      for (const rel of updatedGraph.relationships) {
        if (rel.sourceId === merge.merge) rel.sourceId = merge.keep;
        if (rel.targetId === merge.merge) rel.targetId = merge.keep;
      }
    }

    if (keepConcept && mergeConcept) {
      // Merge concept data
      keepConcept.occurrences.push(...mergeConcept.occurrences);
      keepConcept.alternateTerms = mergeArrays(keepConcept.alternateTerms, mergeConcept.alternateTerms, [mergeConcept.name]);
      keepConcept.domains = mergeArrays(keepConcept.domains, mergeConcept.domains);
      keepConcept.evolution.push(...mergeConcept.evolution);
      keepConcept.relatedConcepts = mergeArrays(keepConcept.relatedConcepts, mergeConcept.relatedConcepts);
      keepConcept.relatedEntities = mergeArrays(keepConcept.relatedEntities, mergeConcept.relatedEntities);

      if (keepConcept.occurrences.length >= 5) {
        keepConcept.significance = 'major';
      }

      updatedGraph.concepts.delete(merge.merge);

      for (const rel of updatedGraph.relationships) {
        if (rel.sourceId === merge.merge) rel.sourceId = merge.keep;
        if (rel.targetId === merge.merge) rel.targetId = merge.keep;
      }
    }
  }

  // Add new relationships
  for (const newRel of integration.newRelationships) {
    const sourceId = generateId(newRel.source);
    const targetId = generateId(newRel.target);

    const exists = updatedGraph.relationships.some(
      r => r.sourceId === sourceId && r.targetId === targetId && r.type === newRel.type
    );

    if (!exists) {
      updatedGraph.relationships.push({
        id: `${sourceId}-${newRel.type}-${targetId}`,
        sourceId,
        targetId,
        type: newRel.type as Relationship['type'],
        description: newRel.description,
        evidence: [newRel.evidenceQuote],
      });
    }
  }

  // Update significance ratings
  for (const update of integration.updatedSignificance) {
    const entity = updatedGraph.entities.get(update.id);
    const concept = updatedGraph.concepts.get(update.id);

    if (entity) {
      entity.significance = update.newSignificance;
    }
    if (concept) {
      concept.significance = update.newSignificance;
    }
  }

  // Update descriptions
  for (const update of integration.descriptionUpdates) {
    const entity = updatedGraph.entities.get(update.id);
    const concept = updatedGraph.concepts.get(update.id);

    if (entity) {
      entity.description = update.newDescription;
    }
    if (concept) {
      concept.description = update.newDescription;
    }
  }

  // Remove duplicate relationships
  const uniqueRels = new Map<string, Relationship>();
  for (const rel of updatedGraph.relationships) {
    const key = `${rel.sourceId}-${rel.type}-${rel.targetId}`;
    if (!uniqueRels.has(key)) {
      uniqueRels.set(key, rel);
    } else {
      // Merge evidence
      const existing = uniqueRels.get(key)!;
      existing.evidence = mergeArrays(existing.evidence, rel.evidence);
    }
  }
  updatedGraph.relationships = Array.from(uniqueRels.values());

  return updatedGraph;
}

/**
 * Check if integration should run
 */
export function shouldRunIntegration(postIndex: number): boolean {
  return (postIndex + 1) % INTEGRATION_INTERVAL === 0;
}

/**
 * Save processing state to localStorage
 */
export function saveStateToStorage(state: ProcessingState): void {
  try {
    const serializable = {
      ...state,
      graph: {
        entities: Object.fromEntries(state.graph.entities),
        concepts: Object.fromEntries(state.graph.concepts),
        relationships: state.graph.relationships,
        metadata: state.graph.metadata,
      },
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(serializable));
  } catch (error) {
    console.warn('Failed to save state to localStorage:', error);
  }
}

/**
 * Load processing state from localStorage
 */
export function loadStateFromStorage(): ProcessingState | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return null;

    const parsed = JSON.parse(saved);

    // Reconstruct Maps
    const graph: KnowledgeGraph = {
      entities: new Map(Object.entries(parsed.graph.entities || {})),
      concepts: new Map(Object.entries(parsed.graph.concepts || {})),
      relationships: parsed.graph.relationships || [],
      metadata: parsed.graph.metadata || {
        totalPostsProcessed: 0,
        dateRange: { earliest: '', latest: '' },
        lastUpdated: new Date().toISOString(),
      },
    };

    return {
      ...parsed,
      graph,
    };
  } catch (error) {
    console.warn('Failed to load state from localStorage:', error);
    return null;
  }
}

/**
 * Clear saved state
 */
export function clearSavedState(): void {
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Get graph statistics
 */
export function getGraphStats(graph: KnowledgeGraph): {
  totalEntities: number;
  totalConcepts: number;
  totalRelationships: number;
  majorEntities: number;
  majorConcepts: number;
  entityTypes: Record<string, number>;
  domains: Record<string, number>;
} {
  const entityTypes: Record<string, number> = {};
  const domains: Record<string, number> = {};
  let majorEntities = 0;
  let majorConcepts = 0;

  for (const entity of graph.entities.values()) {
    entityTypes[entity.type] = (entityTypes[entity.type] || 0) + 1;
    if (entity.significance === 'major') majorEntities++;
  }

  for (const concept of graph.concepts.values()) {
    for (const domain of concept.domains) {
      domains[domain] = (domains[domain] || 0) + 1;
    }
    if (concept.significance === 'major') majorConcepts++;
  }

  return {
    totalEntities: graph.entities.size,
    totalConcepts: graph.concepts.size,
    totalRelationships: graph.relationships.length,
    majorEntities,
    majorConcepts,
    entityTypes,
    domains,
  };
}

/**
 * Helper to merge arrays without duplicates
 */
function mergeArrays<T>(...arrays: T[][]): T[] {
  return [...new Set(arrays.flat())];
}
