/**
 * File Processing Module
 * Handles ZIP extraction, file parsing, and orchestrates the pipeline
 */

import AdmZip from 'adm-zip';
import { mkdirSync, existsSync, rmSync, readdirSync, readFileSync, statSync } from 'fs';
import { join, extname, basename } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

import { initializeAI, batchExtract } from './extract.js';
import { loadSeedOntology } from './ontology.js';
import { generateVaultZip } from './vault.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Supported file extensions
const SUPPORTED_EXTENSIONS = ['.txt', '.md', '.markdown', '.html'];

/**
 * Extract and process a ZIP file
 */
export async function processZipFile(zipPath, apiKey, progressCallback) {
  const tempDir = join(__dirname, '..', 'temp', Date.now().toString());
  const extractDir = join(tempDir, 'extracted');

  try {
    // Create temp directories
    mkdirSync(extractDir, { recursive: true });

    // Extract ZIP file
    const zip = new AdmZip(zipPath);
    zip.extractAllTo(extractDir, true);

    // Find all supported files
    const files = findAllFiles(extractDir);

    if (files.length === 0) {
      throw new Error('No supported files found in ZIP (looking for .txt, .md, .html)');
    }

    progressCallback({ processed: 0, total: files.length, currentFile: 'Initializing...' });

    // Parse all files
    const parsedFiles = files.map(f => parseFile(f)).filter(f => f.wordCount >= 50);

    if (parsedFiles.length === 0) {
      throw new Error('No files with sufficient content found (minimum 50 words)');
    }

    // Initialize AI
    initializeAI({ openaiApiKey: apiKey });

    // Load seed ontology
    const seedOntologyDir = join(__dirname, '..', 'seed-ontology');
    const seedOntology = loadSeedOntology(seedOntologyDir);

    // Extract metadata from all files
    const config = {
      model: 'gpt-4o-mini',
      temperature: 0.3,
      maxTokens: 4000,
      batchSize: 5
    };

    const extractions = await batchExtract(parsedFiles, seedOntology, config, (progress) => {
      progressCallback({
        processed: progress.processed,
        total: progress.total,
        currentFile: progress.current?.[0] || ''
      });
    });

    // Generate Obsidian vault as ZIP
    const outputPath = join(tempDir, 'obsidian-vault.zip');
    const stats = await generateVaultZip(extractions, outputPath);

    // Clean up extracted files
    rmSync(extractDir, { recursive: true, force: true });

    return {
      outputPath,
      stats
    };
  } catch (error) {
    // Clean up on error
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
    throw error;
  }
}

/**
 * Recursively find all supported files in a directory
 */
function findAllFiles(dir) {
  const files = [];

  function scan(currentDir) {
    const entries = readdirSync(currentDir);

    for (const entry of entries) {
      const fullPath = join(currentDir, entry);
      const stat = statSync(fullPath);

      if (stat.isDirectory()) {
        // Skip hidden directories and common non-content directories
        if (!entry.startsWith('.') && entry !== 'node_modules') {
          scan(fullPath);
        }
      } else if (stat.isFile()) {
        const ext = extname(entry).toLowerCase();
        if (SUPPORTED_EXTENSIONS.includes(ext)) {
          files.push(fullPath);
        }
      }
    }
  }

  scan(dir);
  return files;
}

/**
 * Parse a single file and extract content
 */
function parseFile(filePath) {
  const content = readFileSync(filePath, 'utf-8');
  const ext = extname(filePath).toLowerCase();
  const filename = basename(filePath, ext);

  let text = content;
  let frontmatter = null;

  // Handle Markdown frontmatter
  if (ext === '.md' || ext === '.markdown') {
    const fmMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    if (fmMatch) {
      try {
        frontmatter = parseYamlFrontmatter(fmMatch[1]);
        text = fmMatch[2];
      } catch (e) {
        // If YAML parsing fails, use full content
      }
    }
  }

  // Handle HTML - strip tags
  if (ext === '.html') {
    text = stripHtml(content);
  }

  // Extract date from filename if present
  const dateFromFilename = extractDateFromFilename(filename);

  return {
    filePath,
    filename,
    extension: ext,
    rawContent: content,
    textContent: text.trim(),
    frontmatter,
    dateFromFilename,
    wordCount: text.split(/\s+/).filter(w => w.length > 0).length,
    charCount: text.length
  };
}

/**
 * Simple YAML frontmatter parser
 */
function parseYamlFrontmatter(yamlStr) {
  const result = {};
  const lines = yamlStr.split('\n');

  for (const line of lines) {
    const match = line.match(/^(\w+):\s*(.*)$/);
    if (match) {
      const [, key, value] = match;
      result[key] = value.replace(/^["']|["']$/g, '');
    }
  }

  return result;
}

/**
 * Strip HTML tags from content
 */
function stripHtml(html) {
  // Remove script and style elements
  let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');

  // Remove HTML tags
  text = text.replace(/<[^>]+>/g, ' ');

  // Decode common HTML entities
  text = text.replace(/&nbsp;/g, ' ');
  text = text.replace(/&amp;/g, '&');
  text = text.replace(/&lt;/g, '<');
  text = text.replace(/&gt;/g, '>');
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&#39;/g, "'");

  // Normalize whitespace
  text = text.replace(/\s+/g, ' ');

  return text.trim();
}

/**
 * Extract date from filename patterns
 */
function extractDateFromFilename(filename) {
  const patterns = [
    /(\d{4}-\d{2}-\d{2})/,        // 2024-01-15
    /^(\d{4})(\d{2})(\d{2})/,     // 20240115
    /(\d{2})-(\d{2})-(\d{4})/,    // 01-15-2024
  ];

  for (const pattern of patterns) {
    const match = filename.match(pattern);
    if (match) {
      if (match.length === 4) {
        // MM-DD-YYYY format
        return `${match[3]}-${match[1]}-${match[2]}`;
      }
      return match[1];
    }
  }

  return null;
}

export default { processZipFile };
