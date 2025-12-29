# Obsidian Knowledge Graph Builder

A web application that transforms your documents into an interconnected Obsidian knowledge vault using AI-powered extraction.

## Features

- **Upload ZIP files** containing your documents (.txt, .md, .html)
- **Choose your AI provider:**
  - **OpenAI GPT-4o-mini** - Cost-effective bulk processing (~$3-5 per 1000 docs)
  - **Anthropic Claude Opus 4.5** - Premium quality extraction (~$100-110 per 1000 docs)
- **Automatic metadata extraction:**
  - Inferred titles
  - Dates (when detectable)
  - 3-5 sentence summaries
  - Key concepts and theoretical frameworks
  - Key entities (people, organizations, works)
  - Significant quotes with context
  - Cross-document connections
- **Generate structured Obsidian vault** with:
  - Article notes with full metadata
  - Concept notes aggregating mentions
  - Entity notes with appearances
  - Index notes for navigation
  - Home page with statistics
- **Download as ZIP** ready to open in Obsidian

## Quick Start

### Prerequisites

- Node.js 18 or higher
- OpenAI API key or Anthropic API key

### Installation

```bash
npm install
```

### Running the Server

```bash
npm start
```

The server will start at http://localhost:3000

### Usage

1. Open http://localhost:3000 in your browser
2. Select your AI provider (OpenAI or Anthropic)
3. Enter your API key
4. Upload a ZIP file containing your documents
5. Wait for processing (progress is shown in real-time)
6. Download your Obsidian vault

## Supported File Types

- `.txt` - Plain text files
- `.md` / `.markdown` - Markdown files (frontmatter preserved)
- `.html` - HTML files (tags stripped automatically)

## AI Provider Comparison

| Feature | OpenAI GPT-4o-mini | Anthropic Claude Opus 4.5 |
|---------|-------------------|---------------------------|
| Cost per 1000 docs | ~$3-5 | ~$100-110 |
| Speed | Fast | Slower |
| Quality | Good | Premium |
| Best for | Bulk processing | Complex philosophical texts |

### Cost Breakdown

**OpenAI GPT-4o-mini:**
- Input: $0.15 per 1M tokens
- Output: $0.60 per 1M tokens

**Anthropic Claude Opus 4.5:**
- Input: $15.00 per 1M tokens
- Output: $75.00 per 1M tokens

## Project Structure

```
├── server/
│   ├── index.js       # Express server
│   ├── processor.js   # ZIP extraction and orchestration
│   ├── extract.js     # AI metadata extraction (OpenAI + Anthropic)
│   ├── ontology.js    # Seed ontology management
│   ├── templates.js   # Obsidian note generators
│   └── vault.js       # Vault packaging
├── public/
│   └── index.html     # Frontend interface
├── seed-ontology/     # Domain-specific concepts and entities
│   ├── ontology.json
│   ├── concepts.md
│   └── entities.md
└── package.json
```

## Seed Ontology

The `seed-ontology/` folder contains domain-specific concepts and entities that help the AI provide more accurate extractions. Edit these files to customize for your domain:

- `ontology.json` - Entity types and aliases
- `concepts.md` - Known theoretical frameworks
- `entities.md` - Known people, organizations, and works

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 3000 |

API keys are provided through the web interface and are not stored.

## Rate Limiting

The application includes built-in rate limiting:

**OpenAI:**
- 5 concurrent files per batch
- 300ms delay between files
- 1.5s delay between batches

**Anthropic:**
- 3 concurrent files per batch
- 500ms delay between files
- 2s delay between batches

This prevents hitting API rate limits while maintaining good throughput.

## License

MIT
