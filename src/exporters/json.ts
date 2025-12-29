// Raw JSON Export Generator

import { KnowledgeGraph } from '../types';

/**
 * Generate JSON export of the knowledge graph
 */
export function generateJSONExport(graph: KnowledgeGraph): Blob {
  const exportData = {
    version: '2.0.0',
    exportedAt: new Date().toISOString(),
    metadata: graph.metadata,
    entities: Object.fromEntries(graph.entities),
    concepts: Object.fromEntries(graph.concepts),
    relationships: graph.relationships,
  };

  const json = JSON.stringify(exportData, null, 2);
  return new Blob([json], { type: 'application/json' });
}

/**
 * Import knowledge graph from JSON
 */
export function importFromJSON(json: string): KnowledgeGraph {
  const data = JSON.parse(json);

  return {
    entities: new Map(Object.entries(data.entities || {})),
    concepts: new Map(Object.entries(data.concepts || {})),
    relationships: data.relationships || [],
    metadata: data.metadata || {
      totalPostsProcessed: 0,
      dateRange: { earliest: '', latest: '' },
      lastUpdated: new Date().toISOString(),
    },
  };
}
