/**
 * Configuration module for Obsidian Knowledge Graph Builder
 * Handles all settings and environment variables
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

// Default configuration
const defaults = {
  // Input/Output paths
  inputDir: './input',
  outputDir: './vault',
  seedOntologyDir: './seed-ontology',

  // AI Configuration
  aiProvider: 'openai', // 'openai' or 'anthropic'
  model: 'gpt-4o-mini', // Cost-effective for bulk processing
  maxTokens: 4000,
  temperature: 0.3, // Lower temperature for consistent extraction

  // Processing options
  batchSize: 10, // Number of files to process concurrently
  retryAttempts: 3,
  retryDelay: 1000,

  // Output structure
  folders: {
    articles: 'Articles',
    concepts: 'Concepts',
    entities: 'Entities',
    indices: 'Indices'
  },

  // Extraction settings
  maxSummaryLength: 500,
  maxQuotes: 5,
  minQuoteLength: 50,
  maxQuoteLength: 500
};

/**
 * Load configuration from file or use defaults
 */
export function loadConfig(configPath = null) {
  let config = { ...defaults };

  // Try to load from config file
  if (configPath && existsSync(configPath)) {
    try {
      const fileConfig = JSON.parse(readFileSync(configPath, 'utf-8'));
      config = { ...config, ...fileConfig };
    } catch (e) {
      console.warn(`Warning: Could not parse config file: ${e.message}`);
    }
  }

  // Environment variable overrides
  if (process.env.OPENAI_API_KEY) {
    config.openaiApiKey = process.env.OPENAI_API_KEY;
  }
  if (process.env.ANTHROPIC_API_KEY) {
    config.anthropicApiKey = process.env.ANTHROPIC_API_KEY;
    config.aiProvider = 'anthropic';
  }

  return config;
}

/**
 * Validate configuration
 */
export function validateConfig(config) {
  const errors = [];

  if (config.aiProvider === 'openai' && !config.openaiApiKey) {
    errors.push('OpenAI API key required. Set OPENAI_API_KEY environment variable.');
  }
  if (config.aiProvider === 'anthropic' && !config.anthropicApiKey) {
    errors.push('Anthropic API key required. Set ANTHROPIC_API_KEY environment variable.');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

export default defaults;
