// Anthropic API integration with rate limiting and error handling

import Anthropic from '@anthropic-ai/sdk';
import {
  Post,
  KnowledgeGraph,
  ExtractionResult,
  IntegrationResult,
  ExtractedEntity,
  ExtractedConcept,
  ExtractedRelationship,
} from './types';
import { delay, retryWithBackoff } from './utils';

let client: Anthropic | null = null;

/**
 * Initialize the Anthropic client with user's API key
 */
export function initializeClient(apiKey: string): void {
  client = new Anthropic({
    apiKey,
    dangerouslyAllowBrowser: true,
  });
}

/**
 * Check if client is initialized
 */
export function isClientInitialized(): boolean {
  return client !== null;
}

/**
 * Generate a summary of the current graph state for context
 */
function generateGraphSummary(graph: KnowledgeGraph): string {
  const entityList = Array.from(graph.entities.values())
    .slice(0, 50)
    .map(e => `- ${e.name} (${e.type}): ${e.description.slice(0, 100)}...`)
    .join('\n');

  const conceptList = Array.from(graph.concepts.values())
    .slice(0, 50)
    .map(c => `- ${c.name} [${c.domains.join(', ')}]: ${c.description.slice(0, 100)}...`)
    .join('\n');

  const relationshipList = graph.relationships
    .slice(0, 30)
    .map(r => `- ${r.sourceId} --${r.type}--> ${r.targetId}`)
    .join('\n');

  return `
CURRENT ENTITIES (${graph.entities.size} total, showing first 50):
${entityList || 'None yet'}

CURRENT CONCEPTS (${graph.concepts.size} total, showing first 50):
${conceptList || 'None yet'}

KEY RELATIONSHIPS (${graph.relationships.length} total, showing first 30):
${relationshipList || 'None yet'}
`.trim();
}

/**
 * Extract entities and concepts from a single post
 */
export async function extractFromPost(
  post: Post,
  graph: KnowledgeGraph
): Promise<ExtractionResult> {
  if (!client) {
    throw new Error('Anthropic client not initialized. Please set your API key.');
  }

  const graphSummary = generateGraphSummary(graph);

  const prompt = `You are analyzing a blog post to extract entities and concepts for a knowledge graph.

<existing_graph_summary>
${graphSummary}
</existing_graph_summary>

<post>
<title>${post.title}</title>
<date>${post.date}</date>
<content>
${post.content.slice(0, 12000)}
</content>
</post>

Extract ALL significant entities and concepts from this post. For entities and concepts that ALREADY EXIST in the graph summary above, note how this post adds to or modifies our understanding. For NEW entities and concepts, provide full details.

IMPORTANT GUIDELINES:
1. Be thorough - capture all named individuals, organizations, theoretical frameworks, key terminology
2. For existing entities/concepts, focus on what NEW information this post provides
3. Include relationships between ideas and how the author positions themselves
4. Distinguish between the author's original ideas and their engagement with others' work
5. Capture the evolution of ideas - how concepts are developed, critiqued, or synthesized

Respond ONLY with valid JSON in this exact format (no markdown, no extra text):
{
  "entities": [
    {
      "name": "Full Name or Title",
      "isNew": true,
      "type": "person",
      "description": "Comprehensive description if new, or incremental update if existing",
      "aliases": ["alternate names", "abbreviations"],
      "contextInThisPost": "1-2 sentences on how they appear in this post",
      "significanceInThisPost": "why they matter here",
      "significance": "major"
    }
  ],
  "concepts": [
    {
      "name": "Concept Name",
      "isNew": true,
      "domains": ["philosophy", "military theory"],
      "description": "Comprehensive definition if new, or note developments if existing",
      "alternateTerms": ["other ways this concept is referenced"],
      "contextInThisPost": "how it's used in this post",
      "evolutionNote": "if existing concept, how understanding develops in this post"
    }
  ],
  "relationships": [
    {
      "source": "entity or concept name",
      "target": "entity or concept name",
      "type": "influences",
      "description": "nature of the relationship",
      "evidenceQuote": "brief supporting quote or paraphrase"
    }
  ]
}

Entity types: person, organization, place, work, event, other
Relationship types: influences, critiques, extends, opposes, applies, cites, develops, synthesizes, related
Significance levels: major (central to multiple posts), moderate (notable but not central), minor (mentioned briefly)`;

  const response = await retryWithBackoff(async () => {
    const result = await client!.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8000,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = result.content[0].type === 'text' ? result.content[0].text : '';
    return parseExtractionResponse(text);
  }, 3, 2000);

  // Add delay for rate limiting
  await delay(1000);

  return response;
}

/**
 * Parse and validate the extraction response
 */
function parseExtractionResponse(text: string): ExtractionResult {
  // Clean up the response - remove any markdown formatting
  let cleanText = text.trim();

  // Remove markdown code blocks if present
  if (cleanText.startsWith('```')) {
    cleanText = cleanText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  }

  try {
    const parsed = JSON.parse(cleanText);

    // Validate and normalize entities
    const entities: ExtractedEntity[] = (parsed.entities || []).map((e: Partial<ExtractedEntity>) => ({
      name: e.name || 'Unknown',
      isNew: e.isNew ?? true,
      type: validateEntityType(e.type),
      description: e.description || '',
      aliases: Array.isArray(e.aliases) ? e.aliases : [],
      contextInThisPost: e.contextInThisPost || '',
      significanceInThisPost: e.significanceInThisPost || '',
      significance: validateSignificance(e.significance),
    }));

    // Validate and normalize concepts
    const concepts: ExtractedConcept[] = (parsed.concepts || []).map((c: Partial<ExtractedConcept>) => ({
      name: c.name || 'Unknown',
      isNew: c.isNew ?? true,
      domains: Array.isArray(c.domains) ? c.domains : [],
      description: c.description || '',
      alternateTerms: Array.isArray(c.alternateTerms) ? c.alternateTerms : [],
      contextInThisPost: c.contextInThisPost || '',
      evolutionNote: c.evolutionNote || '',
    }));

    // Validate and normalize relationships
    const relationships: ExtractedRelationship[] = (parsed.relationships || []).map((r: Partial<ExtractedRelationship>) => ({
      source: r.source || '',
      target: r.target || '',
      type: r.type || 'related',
      description: r.description || '',
      evidenceQuote: r.evidenceQuote || '',
    })).filter((r: ExtractedRelationship) => r.source && r.target);

    return { entities, concepts, relationships };
  } catch (error) {
    console.error('Failed to parse extraction response:', error);
    console.error('Raw response:', text.slice(0, 500));
    return { entities: [], concepts: [], relationships: [] };
  }
}

function validateEntityType(type: string | undefined): ExtractedEntity['type'] {
  const validTypes = ['person', 'organization', 'place', 'work', 'event', 'other'];
  return validTypes.includes(type || '') ? type as ExtractedEntity['type'] : 'other';
}

function validateSignificance(sig: string | undefined): 'major' | 'moderate' | 'minor' {
  const validSig = ['major', 'moderate', 'minor'];
  return validSig.includes(sig || '') ? sig as 'major' | 'moderate' | 'minor' : 'moderate';
}

/**
 * Run integration verification to clean up and consolidate the graph
 * Should be run every 10-15 posts
 */
export async function runIntegrationVerification(
  graph: KnowledgeGraph,
  recentPostTitles: string[]
): Promise<IntegrationResult> {
  if (!client) {
    throw new Error('Anthropic client not initialized.');
  }

  // Convert graph to JSON-serializable format
  const graphData = {
    entities: Object.fromEntries(graph.entities),
    concepts: Object.fromEntries(graph.concepts),
    relationships: graph.relationships,
    metadata: graph.metadata,
  };

  const prompt = `Review the current state of this knowledge graph for consistency and completeness.

<full_graph>
${JSON.stringify(graphData, null, 2).slice(0, 50000)}
</full_graph>

<recent_posts_processed>
${recentPostTitles.join('\n')}
</recent_posts_processed>

Analyze the graph and identify:
1. Duplicate entities that should be merged (same person/concept, different names or slight variations)
2. Missing relationships that are implied but not explicit
3. Concepts that should be linked but aren't
4. Significance ratings that should be adjusted based on frequency of occurrence
5. Descriptions that need synthesis or updating based on accumulated evidence

Respond ONLY with valid JSON (no markdown, no extra text):
{
  "merges": [
    {"keep": "id-to-keep", "merge": "id-to-merge-into-keep", "reason": "explanation"}
  ],
  "newRelationships": [
    {"source": "name", "target": "name", "type": "relationship-type", "description": "why this relationship exists", "evidenceQuote": "supporting evidence"}
  ],
  "updatedSignificance": [
    {"id": "entity-or-concept-id", "newSignificance": "major"}
  ],
  "descriptionUpdates": [
    {"id": "entity-or-concept-id", "newDescription": "improved description synthesizing all occurrences"}
  ]
}

Only include changes that are clearly warranted. Quality over quantity.`;

  const response = await retryWithBackoff(async () => {
    const result = await client!.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8000,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = result.content[0].type === 'text' ? result.content[0].text : '';
    return parseIntegrationResponse(text);
  }, 3, 2000);

  await delay(1000);

  return response;
}

/**
 * Parse integration verification response
 */
function parseIntegrationResponse(text: string): IntegrationResult {
  let cleanText = text.trim();

  if (cleanText.startsWith('```')) {
    cleanText = cleanText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  }

  try {
    const parsed = JSON.parse(cleanText);

    return {
      merges: Array.isArray(parsed.merges) ? parsed.merges : [],
      newRelationships: Array.isArray(parsed.newRelationships) ? parsed.newRelationships : [],
      updatedSignificance: Array.isArray(parsed.updatedSignificance) ? parsed.updatedSignificance : [],
      descriptionUpdates: Array.isArray(parsed.descriptionUpdates) ? parsed.descriptionUpdates : [],
    };
  } catch (error) {
    console.error('Failed to parse integration response:', error);
    return { merges: [], newRelationships: [], updatedSignificance: [], descriptionUpdates: [] };
  }
}

/**
 * Validate API key by making a minimal request
 */
export async function validateApiKey(apiKey: string): Promise<{ valid: boolean; error?: string }> {
  try {
    const testClient = new Anthropic({
      apiKey,
      dangerouslyAllowBrowser: true,
    });

    await testClient.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 10,
      messages: [{ role: 'user', content: 'Say "ok"' }],
    });

    return { valid: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    if (message.includes('401') || message.includes('invalid')) {
      return { valid: false, error: 'Invalid API key. Please check your key and try again.' };
    }
    if (message.includes('rate')) {
      return { valid: true }; // Rate limit means key is valid
    }
    return { valid: false, error: `API error: ${message}` };
  }
}
