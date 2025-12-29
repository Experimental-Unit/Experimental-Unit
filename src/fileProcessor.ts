// File processing module - handles ZIP extraction and post parsing

import JSZip from 'jszip';
import { Post } from './types';
import { stripHtml, extractLinks, extractDate, extractTitle, generateId } from './utils';

/**
 * Extract and parse posts from a ZIP file
 */
export async function extractPostsFromZip(file: File): Promise<Post[]> {
  const zip = await JSZip.loadAsync(file);
  const posts: Post[] = [];

  // Collect all processable files
  const fileEntries: Array<{ path: string; entry: JSZip.JSZipObject }> = [];

  zip.forEach((path, entry) => {
    if (!entry.dir && /\.(txt|md|markdown|html|htm)$/i.test(path)) {
      fileEntries.push({ path, entry });
    }
  });

  if (fileEntries.length === 0) {
    throw new Error('No supported files found in ZIP. Please include .txt, .md, or .html files.');
  }

  // Process each file
  for (const { path, entry } of fileEntries) {
    try {
      const content = await entry.async('string');
      const post = parsePost(content, path);

      // Filter out very short posts
      if (post.wordCount >= 100) {
        posts.push(post);
      }
    } catch (error) {
      console.warn(`Failed to parse file: ${path}`, error);
    }
  }

  if (posts.length === 0) {
    throw new Error('No valid posts found. Posts must have at least 100 words.');
  }

  // Sort by date (oldest first for chronological processing)
  posts.sort((a, b) => a.date.localeCompare(b.date));

  return posts;
}

/**
 * Parse a single post from its content and filename
 */
function parsePost(content: string, filepath: string): Post {
  const filename = filepath.split('/').pop() || filepath;
  const isHtml = /\.html?$/i.test(filename);

  // Extract metadata before stripping HTML
  const title = extractTitle(content, filename);
  const date = extractDate(content, filename);
  const links = isHtml ? extractLinks(content) : [];

  // Get clean text content
  const textContent = isHtml ? stripHtml(content) : content;
  const wordCount = textContent.split(/\s+/).filter(w => w.length > 0).length;

  return {
    id: generateId(title),
    title,
    date,
    content: textContent,
    wordCount,
    filename,
    links,
  };
}

/**
 * Parse Substack-specific HTML export format
 * Substack exports include special metadata in HTML
 */
export function parseSubstackPost(html: string, filename: string): Post {
  // Extract Substack-specific metadata
  let title = '';
  let date = '';

  // Try to get title from og:title or article title
  const ogTitleMatch = html.match(/<meta property="og:title" content="([^"]+)"/i);
  if (ogTitleMatch) {
    title = ogTitleMatch[1];
  }

  // Try to get published date
  const publishedMatch = html.match(/<time[^>]*datetime="([^"]+)"/i);
  if (publishedMatch) {
    date = publishedMatch[1].split('T')[0];
  }

  // Extract main content (Substack uses article or post-content class)
  let mainContent = html;
  const articleMatch = html.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
  if (articleMatch) {
    mainContent = articleMatch[1];
  } else {
    const contentMatch = html.match(/<div[^>]*class="[^"]*post-content[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
    if (contentMatch) {
      mainContent = contentMatch[1];
    }
  }

  // Fallback extraction
  if (!title) {
    title = extractTitle(mainContent, filename);
  }
  if (!date) {
    date = extractDate(mainContent, filename);
  }

  const links = extractLinks(html);
  const textContent = stripHtml(mainContent);
  const wordCount = textContent.split(/\s+/).filter(w => w.length > 0).length;

  return {
    id: generateId(title),
    title,
    date,
    content: textContent,
    wordCount,
    filename,
    links,
  };
}

/**
 * Validate that a file is a proper ZIP file
 */
export async function validateZipFile(file: File): Promise<{ valid: boolean; error?: string }> {
  if (!file.name.toLowerCase().endsWith('.zip')) {
    return { valid: false, error: 'File must be a ZIP archive.' };
  }

  if (file.size > 500 * 1024 * 1024) {
    return { valid: false, error: 'File too large. Maximum size is 500MB.' };
  }

  try {
    const zip = await JSZip.loadAsync(file);
    let hasValidFiles = false;

    zip.forEach((path, entry) => {
      if (!entry.dir && /\.(txt|md|markdown|html|htm)$/i.test(path)) {
        hasValidFiles = true;
      }
    });

    if (!hasValidFiles) {
      return { valid: false, error: 'ZIP contains no supported files (.txt, .md, .html).' };
    }

    return { valid: true };
  } catch {
    return { valid: false, error: 'Invalid or corrupted ZIP file.' };
  }
}

/**
 * Get summary statistics about a ZIP file
 */
export async function getZipSummary(file: File): Promise<{
  totalFiles: number;
  supportedFiles: number;
  estimatedSize: string;
}> {
  const zip = await JSZip.loadAsync(file);
  let totalFiles = 0;
  let supportedFiles = 0;

  zip.forEach((path, entry) => {
    if (!entry.dir) {
      totalFiles++;
      if (/\.(txt|md|markdown|html|htm)$/i.test(path)) {
        supportedFiles++;
      }
    }
  });

  return {
    totalFiles,
    supportedFiles,
    estimatedSize: `${(file.size / 1024 / 1024).toFixed(1)} MB`,
  };
}
