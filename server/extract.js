/**
 * AI Extraction Module
 * Uses OpenAI or Anthropic to extract structured metadata from unstructured text
 */

import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

let openaiClient = null;
let anthropicClient = null;
let activeProvider = 'openai';

/**
 * Initialize the AI client
 */
export function initializeAI(config) {
  activeProvider = config.provider || 'openai';

  if (activeProvider === 'openai') {
    openaiClient = new OpenAI({
      apiKey: config.apiKey
    });
  } else if (activeProvider === 'anthropic') {
    anthropicClient = new Anthropic({
      apiKey: config.apiKey
    });
  }
}

/**
 * Build the extraction prompt with seed ontology context
 */
function buildExtractionPrompt(textContent, seedOntology) {
  const conceptList = seedOntology.concepts?.length > 0
    ? `\n\nKNOWN CONCEPTS (prefer these when applicable):\n${seedOntology.concepts.join(', ')}`
    : '';

  const entityList = seedOntology.entities?.length > 0
    ? `\n\nKNOWN ENTITIES (prefer these when applicable):\n${seedOntology.entities.join(', ')}`
    : '';

  return `Analyze this text and extract structured metadata for a knowledge graph. Be precise and thorough.

TEXT TO ANALYZE:
${textContent.slice(0, 12000)}

${conceptList}${entityList}

Extract the following in JSON format:

{
  "title": "A concise, descriptive title (inferred from content)",
  "date": "YYYY-MM-DD format if detectable, otherwise null",
  "summary": "3-5 sentence distillation of the core argument or main ideas",
  "concepts": [
    {
      "name": "Concept Name",
      "relevance": "Brief explanation of how this concept appears in the text"
    }
  ],
  "entities": [
    {
      "name": "Entity Name",
      "type": "Person|Organization|Work|Place|Event",
      "context": "How this entity appears in the text"
    }
  ],
  "quotes": [
    {
      "text": "Verbatim quote from the text",
      "significance": "Why this quote is important"
    }
  ],
  "themes": ["theme1", "theme2"],
  "connections": ["potential related topics or ideas for cross-referencing"]
}

Guidelines:
- Extract 3-10 key concepts (theoretical frameworks, ideas, methods)
- Extract 3-10 key entities (people, organizations, specific works, institutions)
- Extract 2-5 significant quotes that represent core ideas
- Themes should be broad categorizations
- Connections are inferred topics that might link to other documents

Return ONLY valid JSON, no markdown code blocks or extra text.`;
}

/**
 * Extract metadata using OpenAI
 */
async function extractWithOpenAI(prompt, config) {
  const response = await openaiClient.chat.completions.create({
    model: config.model || 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: 'You are a knowledge extraction assistant. Extract structured metadata from texts for building an Obsidian knowledge graph. Always return valid JSON.'
      },
      {
        role: 'user',
        content: prompt
      }
    ],
    temperature: config.temperature || 0.3,
    max_tokens: config.maxTokens || 4000
  });

  return response.choices[0].message.content.trim();
}

/**
 * Extract metadata using Anthropic Claude
 */
async function extractWithAnthropic(prompt, config) {
  const response = await anthropicClient.messages.create({
    model: config.model || 'claude-opus-4-5-20251101',
    max_tokens: config.maxTokens || 4000,
    messages: [
      {
        role: 'user',
        content: prompt
      }
    ],
    system: 'You are a knowledge extraction assistant. Extract structured metadata from texts for building an Obsidian knowledge graph. Always return valid JSON, no markdown code blocks.',
    temperature: config.temperature || 0.3
  });

  // Anthropic returns content as an array of blocks
  const textBlock = response.content.find(block => block.type === 'text');
  return textBlock?.text?.trim() || '';
}

/**
 * Extract metadata from a single file using AI
 */
export async function extractMetadata(fileData, seedOntology, config) {
  const prompt = buildExtractionPrompt(fileData.textContent, seedOntology);

  try {
    let content;

    if (activeProvider === 'anthropic') {
      content = await extractWithAnthropic(prompt, config);
    } else {
      content = await extractWithOpenAI(prompt, config);
    }

    // Parse JSON response
    let extracted;
    try {
      // Handle potential markdown code blocks
      const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) ||
                       content.match(/```\n?([\s\S]*?)\n?```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : content;
      extracted = JSON.parse(jsonStr);
    } catch (parseError) {
      console.warn(`Warning: Could not parse AI response for ${fileData.filename}`);
      extracted = createFallbackExtraction(fileData);
    }

    return {
      ...extracted,
      sourceFile: fileData.filename,
      sourcePath: fileData.filePath,
      wordCount: fileData.wordCount,
      // Preserve any date from filename if AI didn't detect one
      date: extracted.date || fileData.dateFromFilename || fileData.frontmatter?.date || null
    };
  } catch (error) {
    console.error(`Error extracting metadata from ${fileData.filename}:`, error.message);
    return createFallbackExtraction(fileData);
  }
}

/**
 * Create a fallback extraction when AI fails
 */
function createFallbackExtraction(fileData) {
  // Extract a title from filename
  const title = fileData.filename
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());

  // Extract first paragraph as summary
  const paragraphs = fileData.textContent.split(/\n\n+/);
  const summary = paragraphs[0]?.slice(0, 500) || 'No summary available.';

  return {
    title,
    date: fileData.dateFromFilename || null,
    summary,
    concepts: [],
    entities: [],
    quotes: [],
    themes: [],
    connections: [],
    sourceFile: fileData.filename,
    sourcePath: fileData.filePath,
    wordCount: fileData.wordCount,
    extractionFailed: true
  };
}

/**
 * Batch extract metadata from multiple files with rate limiting
 */
export async function batchExtract(files, seedOntology, config, progressCallback) {
  const results = [];

  // Adjust batch size based on provider (Opus is slower, use smaller batches)
  const batchSize = activeProvider === 'anthropic' ? 3 : (config.batchSize || 5);

  // Adjust delays for Anthropic (more conservative rate limiting)
  const interRequestDelay = activeProvider === 'anthropic' ? 500 : 300;
  const interBatchDelay = activeProvider === 'anthropic' ? 2000 : 1500;

  for (let i = 0; i < files.length; i += batchSize) {
    const batch = files.slice(i, i + batchSize);

    const batchPromises = batch.map(async (file, index) => {
      // Add delay between requests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, index * interRequestDelay));
      return extractMetadata(file, seedOntology, config);
    });

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);

    if (progressCallback) {
      progressCallback({
        processed: Math.min(i + batchSize, files.length),
        total: files.length,
        current: batch.map(f => f.filename)
      });
    }

    // Delay between batches to avoid rate limits
    if (i + batchSize < files.length) {
      await new Promise(resolve => setTimeout(resolve, interBatchDelay));
    }
  }

  return results;
}

export default { initializeAI, extractMetadata, batchExtract };
