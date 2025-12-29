// Core data structures for the Knowledge Graph

export interface Post {
  id: string;
  title: string;
  date: string;
  content: string;
  wordCount: number;
  filename: string;
  links: string[];
}

export interface Occurrence {
  postTitle: string;
  postDate: string;
  context: string;
  significance: string;
}

export interface ConceptEvolution {
  postTitle: string;
  postDate: string;
  note: string;
}

export interface Entity {
  id: string;
  name: string;
  type: 'person' | 'organization' | 'place' | 'work' | 'event' | 'other';
  description: string;
  aliases: string[];
  occurrences: Occurrence[];
  relatedEntities: string[];
  relatedConcepts: string[];
  firstSeen: string;
  significance: 'major' | 'moderate' | 'minor';
}

export interface Concept {
  id: string;
  name: string;
  domains: string[];
  description: string;
  alternateTerms: string[];
  occurrences: Occurrence[];
  relatedConcepts: string[];
  relatedEntities: string[];
  evolution: ConceptEvolution[];
  firstSeen: string;
  significance: 'major' | 'moderate' | 'minor';
}

export interface Relationship {
  id: string;
  sourceId: string;
  targetId: string;
  type: 'influences' | 'critiques' | 'extends' | 'opposes' | 'applies' | 'cites' | 'develops' | 'synthesizes' | 'related';
  description: string;
  evidence: string[];
}

export interface KnowledgeGraph {
  entities: Map<string, Entity>;
  concepts: Map<string, Concept>;
  relationships: Relationship[];
  metadata: {
    totalPostsProcessed: number;
    dateRange: { earliest: string; latest: string };
    lastUpdated: string;
    authorName?: string;
  };
}

// API Response Types
export interface ExtractedEntity {
  name: string;
  isNew: boolean;
  type: 'person' | 'organization' | 'place' | 'work' | 'event' | 'other';
  description: string;
  aliases: string[];
  contextInThisPost: string;
  significanceInThisPost: string;
  significance: 'major' | 'moderate' | 'minor';
}

export interface ExtractedConcept {
  name: string;
  isNew: boolean;
  domains: string[];
  description: string;
  alternateTerms: string[];
  contextInThisPost: string;
  evolutionNote?: string;
}

export interface ExtractedRelationship {
  source: string;
  target: string;
  type: string;
  description: string;
  evidenceQuote: string;
}

export interface ExtractionResult {
  entities: ExtractedEntity[];
  concepts: ExtractedConcept[];
  relationships: ExtractedRelationship[];
}

export interface IntegrationResult {
  merges: Array<{ keep: string; merge: string; reason: string }>;
  newRelationships: ExtractedRelationship[];
  updatedSignificance: Array<{ id: string; newSignificance: 'major' | 'moderate' | 'minor' }>;
  descriptionUpdates: Array<{ id: string; newDescription: string }>;
}

// Processing State
export interface ProcessingState {
  status: 'idle' | 'extracting' | 'processing' | 'paused' | 'complete' | 'error';
  currentPostIndex: number;
  totalPosts: number;
  currentPostTitle: string;
  graph: KnowledgeGraph;
  posts: Post[];
  errors: Array<{ postTitle: string; error: string }>;
  startTime: number;
  pausedAt?: number;
}

// UI Types
export interface FilterOptions {
  searchQuery: string;
  types: Set<string>;
  domains: Set<string>;
  significance: Set<string>;
}

export type ExportFormat = 'obsidian' | 'llm-context' | 'json';
