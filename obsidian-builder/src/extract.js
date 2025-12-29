/**
 * AI Extraction Module
 * Uses AI to extract structured metadata from unstructured text
 */

import OpenAI from 'openai';

let openaiClient = null;

/**
 * Initialize the AI client
 */
export function initializeAI(config) {
  if (config.aiProvider === 'openai') {
    openaiClient = new OpenAI({
      apiKey: config.openaiApiKey
    });
  }
  // Note: Anthropic support can be added similarly
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
 * Extract metadata from a single file using AI
 */
export async function extractMetadata(fileData, seedOntology, config) {
  const prompt = buildExtractionPrompt(fileData.textContent, seedOntology);

  try {
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

    const content = response.choices[0].message.content.trim();

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
 * Batch extract metadata from multiple files
 */
export async function batchExtract(files, seedOntology, config, progressCallback) {
  const results = [];
  const batchSize = config.batchSize || 5;

  for (let i = 0; i < files.length; i += batchSize) {
    const batch = files.slice(i, i + batchSize);

    const batchPromises = batch.map(async (file, index) => {
      // Add delay between requests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, index * 200));
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

    // Small delay between batches
    if (i + batchSize < files.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  return results;
}

/**
 * Offline extraction mode - uses heuristics instead of AI
 */
export function extractMetadataOffline(fileData, seedOntology) {
  // Extract title from filename or first heading
  let title = fileData.filename.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  const headingMatch = fileData.textContent.match(/^#\s+(.+)$/m);
  if (headingMatch) {
    title = headingMatch[1];
  }

  // Extract first substantial paragraph as summary
  const paragraphs = fileData.textContent.split(/\n\n+/).filter(p => p.length > 100);
  const summary = paragraphs[0]?.slice(0, 500) || 'Content summary not available.';

  // Find known concepts in text
  const foundConcepts = [];
  if (seedOntology.concepts) {
    for (const concept of seedOntology.concepts) {
      if (fileData.textContent.toLowerCase().includes(concept.toLowerCase())) {
        foundConcepts.push({
          name: concept,
          relevance: 'Mentioned in text'
        });
      }
    }
  }

  // Find known entities in text
  const foundEntities = [];
  if (seedOntology.entities) {
    for (const entity of seedOntology.entities) {
      if (fileData.textContent.includes(entity)) {
        foundEntities.push({
          name: entity,
          type: 'Unknown',
          context: 'Mentioned in text'
        });
      }
    }
  }

  // Extract potential quotes (sentences in quotation marks)
  const quoteMatches = fileData.textContent.match(/"[^"]{50,300}"/g) || [];
  const quotes = quoteMatches.slice(0, 5).map(q => ({
    text: q.replace(/^"|"$/g, ''),
    significance: 'Quoted passage'
  }));

  return {
    title,
    date: fileData.dateFromFilename || fileData.frontmatter?.date || null,
    summary,
    concepts: foundConcepts,
    entities: foundEntities,
    quotes,
    themes: [],
    connections: [],
    sourceFile: fileData.filename,
    sourcePath: fileData.filePath,
    wordCount: fileData.wordCount,
    offlineExtraction: true
  };
}

export default { initializeAI, extractMetadata, batchExtract, extractMetadataOffline };
