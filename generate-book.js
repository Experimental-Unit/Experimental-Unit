#!/usr/bin/env node
/**
 * Generates a printable HTML book from Experimental Unit Substack posts
 * Open the output in a browser and use Print -> Save as PDF
 */

const fs = require('fs');
const path = require('path');

// Load book structure
const bookStructure = require('./src/book-structure.json');
const postsDir = './substack-export/posts';

// HTML entity decoder
function decodeHTML(html) {
  return html
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

// Extract clean text from HTML
function htmlToCleanContent(html) {
  // Remove scripts and styles
  let content = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  content = content.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');

  // Keep paragraph structure
  content = content.replace(/<\/p>/gi, '</p>\n\n');
  content = content.replace(/<br\s*\/?>/gi, '\n');
  content = content.replace(/<\/h[1-6]>/gi, '</h$1>\n\n');
  content = content.replace(/<\/li>/gi, '</li>\n');
  content = content.replace(/<\/blockquote>/gi, '</blockquote>\n\n');

  // Convert lists
  content = content.replace(/<ul[^>]*>/gi, '<ul>');
  content = content.replace(/<ol[^>]*>/gi, '<ol>');
  content = content.replace(/<li[^>]*>/gi, '<li>');

  // Clean up headers for preservation
  content = content.replace(/<h([1-6])[^>]*>/gi, '<h$1>');

  // Keep blockquotes
  content = content.replace(/<blockquote[^>]*>/gi, '<blockquote>');

  // Keep strong/em
  content = content.replace(/<strong[^>]*>/gi, '<strong>');
  content = content.replace(/<em[^>]*>/gi, '<em>');
  content = content.replace(/<b[^>]*>/gi, '<strong>');
  content = content.replace(/<i[^>]*>/gi, '<em>');
  content = content.replace(/<\/b>/gi, '</strong>');
  content = content.replace(/<\/i>/gi, '</em>');

  // Paragraphs
  content = content.replace(/<p[^>]*>/gi, '<p>');

  // Remove all other tags
  content = content.replace(/<(?!\/?(?:p|h[1-6]|ul|ol|li|blockquote|strong|em)[ >])(?:[^>'"]*|"[^"]*"|'[^']*')*>/gi, '');

  // Clean up whitespace
  content = content.replace(/\n{3,}/g, '\n\n');
  content = decodeHTML(content);

  return content.trim();
}

// Extract title from filename
function extractTitle(filename) {
  const slug = filename.replace(/^\d+\./, '').replace(/\.html$/, '');
  return slug
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// CSS for the book
const bookCSS = `
@import url('https://fonts.googleapis.com/css2?family=Crimson+Pro:ital,wght@0,400;0,600;1,400&family=Source+Sans+3:wght@400;600&display=swap');

* {
  box-sizing: border-box;
}

:root {
  --orange: #FF6B35;
  --purple: #7B2D8E;
  --forest: #2D5A27;
  --grey: #4A4A4A;
  --black: #1A1A1A;
  --white: #FAFAFA;
}

@page {
  margin: 1in;
  size: letter;
}

@media print {
  .no-print { display: none !important; }
  .page-break { page-break-after: always; }
  .avoid-break { page-break-inside: avoid; }
}

body {
  font-family: 'Crimson Pro', Georgia, serif;
  font-size: 12pt;
  line-height: 1.7;
  color: var(--black);
  background: var(--white);
  max-width: 7in;
  margin: 0 auto;
  padding: 20px;
}

/* Title Page */
.title-page {
  text-align: center;
  padding: 3in 0;
  page-break-after: always;
}

.title-page h1 {
  font-size: 36pt;
  color: var(--orange);
  margin-bottom: 0.5em;
  font-weight: 600;
}

.title-page .subtitle {
  font-size: 18pt;
  color: var(--purple);
  font-style: italic;
  margin-bottom: 2em;
}

.title-page .author {
  font-size: 20pt;
  color: var(--grey);
}

/* Table of Contents */
.toc {
  page-break-after: always;
}

.toc h1 {
  font-size: 24pt;
  color: var(--orange);
  border-bottom: 2px solid var(--purple);
  padding-bottom: 10px;
  margin-bottom: 30px;
}

.toc-part {
  margin: 25px 0;
}

.toc-part-title {
  font-size: 14pt;
  font-weight: 600;
  color: var(--purple);
  margin-bottom: 8px;
}

.toc-chapter {
  margin-left: 20px;
  margin-bottom: 5px;
  font-size: 11pt;
}

.toc-chapter a {
  color: var(--black);
  text-decoration: none;
}

.toc-chapter a:hover {
  color: var(--orange);
}

/* Part Headers */
.part-header {
  text-align: center;
  padding: 3in 0 2in 0;
  page-break-before: always;
  page-break-after: always;
}

.part-header h1 {
  font-size: 30pt;
  color: var(--orange);
  margin-bottom: 0.3em;
}

.part-header .subtitle {
  font-size: 16pt;
  color: var(--purple);
  font-style: italic;
}

/* Chapter Headers */
.chapter {
  page-break-before: always;
}

.chapter-header {
  margin-bottom: 40px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--grey);
}

.chapter-header h2 {
  font-size: 22pt;
  color: var(--purple);
  margin-bottom: 5px;
}

.chapter-header .description {
  font-size: 11pt;
  color: var(--grey);
  font-style: italic;
}

/* Individual Posts */
.post {
  margin-bottom: 40px;
  page-break-inside: avoid;
}

.post-title {
  font-family: 'Source Sans 3', sans-serif;
  font-size: 14pt;
  font-weight: 600;
  color: var(--forest);
  margin-bottom: 15px;
  padding-left: 15px;
  border-left: 3px solid var(--orange);
}

.post-content {
  text-align: justify;
  hyphens: auto;
}

.post-content p {
  margin-bottom: 1em;
  text-indent: 1.5em;
}

.post-content p:first-of-type {
  text-indent: 0;
}

.post-content h1, .post-content h2, .post-content h3,
.post-content h4, .post-content h5, .post-content h6 {
  font-family: 'Source Sans 3', sans-serif;
  color: var(--purple);
  margin-top: 1.5em;
  margin-bottom: 0.5em;
}

.post-content blockquote {
  margin: 1.5em 0;
  padding: 10px 20px;
  border-left: 3px solid var(--orange);
  background: #f9f9f9;
  font-style: italic;
}

.post-content ul, .post-content ol {
  margin: 1em 0;
  padding-left: 2em;
}

.post-content li {
  margin-bottom: 0.5em;
}

.post-separator {
  text-align: center;
  margin: 30px 0;
  color: var(--grey);
}

/* Navigation help */
.nav-help {
  position: fixed;
  bottom: 20px;
  right: 20px;
  background: var(--purple);
  color: white;
  padding: 15px 20px;
  border-radius: 8px;
  font-family: 'Source Sans 3', sans-serif;
  font-size: 12pt;
  box-shadow: 0 2px 10px rgba(0,0,0,0.2);
}

.nav-help a {
  color: var(--neonYellow);
}
`;

// Generate the book
function generateBook() {
  console.log('Generating Experimental Unit book...\n');

  let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${bookStructure.title}</title>
  <style>${bookCSS}</style>
</head>
<body>

<!-- Title Page -->
<div class="title-page">
  <h1>${bookStructure.title}</h1>
  <div class="subtitle">${bookStructure.subtitle}</div>
  <div class="author">${bookStructure.author}</div>
</div>

<!-- Table of Contents -->
<div class="toc">
  <h1>Table of Contents</h1>
`;

  // Generate TOC
  bookStructure.parts.forEach((part, partIdx) => {
    html += `  <div class="toc-part">
    <div class="toc-part-title">${part.title}</div>
`;
    part.chapters.forEach(chapter => {
      html += `    <div class="toc-chapter"><a href="#${chapter.id}">${chapter.title}</a></div>\n`;
    });
    html += `  </div>\n`;
  });

  html += `</div>\n\n`;

  // Track statistics
  let totalPosts = 0;
  let missingPosts = [];
  let includedPosts = [];

  // Generate content for each part
  bookStructure.parts.forEach((part, partIdx) => {
    console.log(`Processing ${part.title}...`);

    html += `<!-- ${part.title} -->
<div class="part-header">
  <h1>${part.title}</h1>
  <div class="subtitle">${part.subtitle}</div>
</div>

`;

    part.chapters.forEach(chapter => {
      html += `<div class="chapter" id="${chapter.id}">
  <div class="chapter-header">
    <h2>${chapter.title}</h2>
    <div class="description">${chapter.description}</div>
  </div>

`;

      chapter.posts.forEach((postFile, postIdx) => {
        const postPath = path.join(postsDir, postFile);

        if (fs.existsSync(postPath)) {
          const rawHtml = fs.readFileSync(postPath, 'utf-8');
          const content = htmlToCleanContent(rawHtml);
          const title = extractTitle(postFile);

          if (content.length > 10) {
            totalPosts++;
            includedPosts.push(postFile);

            html += `  <div class="post">
    <h3 class="post-title">${title}</h3>
    <div class="post-content">
      ${content}
    </div>
  </div>
`;
            if (postIdx < chapter.posts.length - 1) {
              html += `  <div class="post-separator">◆ ◆ ◆</div>\n\n`;
            }
          }
        } else {
          missingPosts.push(postFile);
        }
      });

      html += `</div>\n\n`;
    });
  });

  // Close HTML
  html += `
<div class="no-print nav-help">
  <strong>To save as PDF:</strong><br>
  Press Ctrl+P (or Cmd+P on Mac)<br>
  Select "Save as PDF"
</div>

</body>
</html>`;

  // Write the book
  const outputPath = './experimental-unit-book.html';
  fs.writeFileSync(outputPath, html);

  console.log(`\n✓ Book generated: ${outputPath}`);
  console.log(`  - ${totalPosts} posts included`);
  console.log(`  - ${missingPosts.length} posts not found`);

  if (missingPosts.length > 0 && missingPosts.length <= 10) {
    console.log('\nMissing posts:');
    missingPosts.forEach(p => console.log(`  - ${p}`));
  }

  console.log('\nTo create PDF:');
  console.log('  1. Open experimental-unit-book.html in your browser');
  console.log('  2. Press Ctrl+P (Cmd+P on Mac)');
  console.log('  3. Select "Save as PDF" as the destination');
  console.log('  4. Click Save');
}

generateBook();
