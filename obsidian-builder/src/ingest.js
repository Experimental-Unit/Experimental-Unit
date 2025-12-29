/**
 * File Ingestion Module
 * Handles reading and parsing input files
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, extname, basename } from 'path';
import { glob } from 'glob';

// Supported file extensions
const SUPPORTED_EXTENSIONS = ['.txt', '.md', '.markdown', '.html'];

/**
 * Recursively find all supported files in a directory
 */
export async function findFiles(inputDir) {
  const patterns = SUPPORTED_EXTENSIONS.map(ext => `**/*${ext}`);
  const files = [];

  for (const pattern of patterns) {
    const matches = await glob(pattern, {
      cwd: inputDir,
      absolute: true,
      nodir: true
    });
    files.push(...matches);
  }

  return [...new Set(files)].sort();
}

/**
 * Parse a single file and extract raw content
 */
export function parseFile(filePath) {
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

  // Handle HTML - strip tags for text extraction
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
    wordCount: text.split(/\s+/).length,
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
  // Common date patterns
  const patterns = [
    /(\d{4}-\d{2}-\d{2})/,           // 2024-01-15
    /(\d{4})(\d{2})(\d{2})/,          // 20240115
    /(\d{2})-(\d{2})-(\d{4})/,        // 01-15-2024
  ];

  for (const pattern of patterns) {
    const match = filename.match(pattern);
    if (match) {
      if (match.length === 4) {
        return `${match[3]}-${match[1]}-${match[2]}`;
      }
      return match[1];
    }
  }

  return null;
}

/**
 * Batch load multiple files
 */
export async function loadFiles(inputDir, options = {}) {
  const filePaths = await findFiles(inputDir);
  const files = [];

  for (const filePath of filePaths) {
    try {
      const parsed = parseFile(filePath);

      // Skip very short files unless configured otherwise
      if (parsed.wordCount >= (options.minWordCount || 50)) {
        files.push(parsed);
      }
    } catch (e) {
      console.warn(`Warning: Could not parse ${filePath}: ${e.message}`);
    }
  }

  return files;
}

export default { findFiles, parseFile, loadFiles };
