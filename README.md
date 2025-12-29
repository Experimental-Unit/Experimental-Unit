# Obsidian Knowledge Graph Builder

A web application that transforms your documents into an interconnected Obsidian knowledge vault using AI-powered extraction.

## Features

- **Upload ZIP files** containing your documents (.txt, .md, .html)
- **AI-powered extraction** using GPT-4o-mini for cost-effective bulk processing
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
- OpenAI API key

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
2. Enter your OpenAI API key
3. Upload a ZIP file containing your documents
4. Wait for processing (progress is shown in real-time)
5. Download your Obsidian vault

## Supported File Types

- `.txt` - Plain text files
- `.md` / `.markdown` - Markdown files (frontmatter preserved)
- `.html` - HTML files (tags stripped automatically)

## Cost Considerations

Uses GPT-4o-mini which is optimized for:
- Cost-effective bulk processing
- ~$0.15 per 1M input tokens
- ~$0.60 per 1M output tokens

For 1000 documents averaging 2000 words each, expect approximately $3-5 in API costs.

## Project Structure

```
├── server/
│   ├── index.js       # Express server
│   ├── processor.js   # ZIP extraction and orchestration
│   ├── extract.js     # AI metadata extraction
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
- 5 concurrent files per batch
- 300ms delay between files
- 1.5s delay between batches

This prevents hitting OpenAI rate limits while maintaining good throughput.

## License

MIT
