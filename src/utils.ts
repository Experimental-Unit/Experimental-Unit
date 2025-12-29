// Utility functions

/**
 * Generate a unique ID from a name
 */
export function generateId(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 100);
}

/**
 * Sanitize filename for Obsidian compatibility
 */
export function sanitizeFilename(name: string): string {
  return (name || 'Untitled')
    .replace(/[<>:"/\\|?*]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 100);
}

/**
 * Strip HTML tags from content
 */
export function stripHtml(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extract links from HTML content
 */
export function extractLinks(html: string): string[] {
  const linkRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>/gi;
  const links: string[] = [];
  let match;
  while ((match = linkRegex.exec(html)) !== null) {
    if (match[1] && !match[1].startsWith('#') && !match[1].startsWith('javascript:')) {
      links.push(match[1]);
    }
  }
  return [...new Set(links)];
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

/**
 * Format duration for display
 */
export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
}

/**
 * Estimate remaining time based on progress
 */
export function estimateRemainingTime(
  processedCount: number,
  totalCount: number,
  elapsedMs: number
): string {
  if (processedCount === 0) return 'Calculating...';

  const avgTimePerItem = elapsedMs / processedCount;
  const remainingItems = totalCount - processedCount;
  const remainingMs = avgTimePerItem * remainingItems;

  return formatDuration(remainingMs);
}

/**
 * Delay helper for rate limiting
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 5,
  baseDelayMs: number = 1000
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxRetries - 1) {
        const delayMs = baseDelayMs * Math.pow(2, attempt);
        await delay(delayMs);
      }
    }
  }

  throw lastError;
}

/**
 * Extract date from Substack post content or filename
 */
export function extractDate(content: string, filename: string): string {
  // Try to find date in content (common Substack patterns)
  const datePatterns = [
    /(\d{4}-\d{2}-\d{2})/,
    /(\w+ \d{1,2}, \d{4})/,
    /(\d{1,2}\/\d{1,2}\/\d{4})/,
  ];

  for (const pattern of datePatterns) {
    const match = content.match(pattern);
    if (match) {
      const parsed = new Date(match[1]);
      if (!isNaN(parsed.getTime())) {
        return parsed.toISOString().split('T')[0];
      }
    }
  }

  // Try filename
  const filenameMatch = filename.match(/(\d{4}-\d{2}-\d{2})/);
  if (filenameMatch) {
    return filenameMatch[1];
  }

  return new Date().toISOString().split('T')[0];
}

/**
 * Extract title from HTML or markdown content
 */
export function extractTitle(content: string, filename: string): string {
  // Try HTML title tag
  const titleMatch = content.match(/<title>([^<]+)<\/title>/i);
  if (titleMatch) {
    return stripHtml(titleMatch[1]).trim();
  }

  // Try h1 tag
  const h1Match = content.match(/<h1[^>]*>([^<]+)<\/h1>/i);
  if (h1Match) {
    return stripHtml(h1Match[1]).trim();
  }

  // Try markdown h1
  const mdH1Match = content.match(/^#\s+(.+)$/m);
  if (mdH1Match) {
    return mdH1Match[1].trim();
  }

  // Fallback to filename
  return filename
    .replace(/\.[^.]+$/, '')
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

/**
 * Truncate text to a certain length with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: unknown[]) => void>(
  fn: T,
  delayMs: number
): T {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return ((...args: unknown[]) => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delayMs);
  }) as T;
}

/**
 * Deep clone an object (works with Maps)
 */
export function deepClone<T>(obj: T): T {
  if (obj instanceof Map) {
    return new Map(Array.from(obj.entries()).map(([k, v]) => [k, deepClone(v)])) as T;
  }
  if (Array.isArray(obj)) {
    return obj.map(item => deepClone(item)) as T;
  }
  if (obj && typeof obj === 'object') {
    const cloned: Record<string, unknown> = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        cloned[key] = deepClone((obj as Record<string, unknown>)[key]);
      }
    }
    return cloned as T;
  }
  return obj;
}
