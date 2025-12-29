# Substack Knowledge Graph Generator

Transform your Substack posts into an interconnected knowledge graph using AI-powered extraction. This client-side application analyzes your posts to extract entities, concepts, and relationships, tracking how ideas evolve across your writing.

## Features

- **ZIP File Upload** - Import your Substack export directly
- **Progressive Knowledge Graph Building** - Graph grows as each post is processed
- **AI-Powered Extraction** using Claude:
  - **Entities** - People, organizations, works, places, events
  - **Concepts** - Theoretical frameworks, ideas, terminology
  - **Relationships** - How entities and concepts connect and influence each other
  - **Evolution Tracking** - How your understanding of concepts develops over time
- **Real-Time Preview** - Watch the graph build with search and filtering
- **Pause & Resume** - Stop processing anytime and pick up where you left off
- **Multiple Export Formats**:
  - **Obsidian Vault** - ZIP with interconnected markdown notes
  - **LLM Context File** - Single file optimized for AI assistants
  - **Raw JSON** - Complete graph data for custom processing

## Quick Start

### Online (GitHub Pages)

Visit the deployed application at your GitHub Pages URL.

### Local Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## Usage

1. **Get an Anthropic API Key** from [console.anthropic.com](https://console.anthropic.com)
2. **Export your Substack archive** (Settings → Export)
3. **Upload the ZIP file** to the application
4. **Wait for processing** - Each post is analyzed sequentially
5. **Export your knowledge graph** in your preferred format

## Export Formats

### Obsidian Vault

A ZIP file containing:
- `Entities/` - Organized by type (People, Organizations, Works, etc.)
- `Concepts/` - All extracted concepts with evolution tracking
- `_Index.md` - Statistics and navigation
- `_Graph Statistics.md` - Detailed breakdowns
- `_Reading Order.md` - Chronological post list

Each note includes:
- YAML frontmatter for Obsidian compatibility
- Wikilinks (`[[Note Name]]`) for graph visualization
- Occurrence details with dates and context

### LLM Context File

A single markdown file optimized for uploading to AI assistants (Claude, ChatGPT, etc.). Includes:
- Entity and concept directories
- Relationship maps
- Chronological development phases
- Sample questions the graph can answer

### Raw JSON

Complete graph data including:
- All entities with occurrences and relationships
- All concepts with evolution notes
- All relationship edges with evidence

## Architecture

```
src/
├── main.ts              # Entry point and UI logic
├── types.ts             # TypeScript interfaces
├── utils.ts             # Utility functions
├── fileProcessor.ts     # ZIP extraction and parsing
├── anthropic.ts         # Claude API integration
├── graphManager.ts      # Graph state management
├── styles.css           # Application styles
└── exporters/
    ├── obsidian.ts      # Obsidian vault generator
    ├── llmContext.ts    # LLM context file generator
    └── json.ts          # Raw JSON export
```

## API Usage

The application uses Claude Sonnet for extraction. Approximate costs:
- ~$0.01-0.03 per post depending on length
- 887 posts ≈ $10-25 total

Processing includes:
1. **Entity & Concept Extraction** - Per post
2. **Integration Verification** - Every 10 posts to merge duplicates and identify relationships

## Data Privacy

- **API keys are stored only in session storage** (cleared when tab closes)
- **All processing happens in your browser** - No data sent to any server except Anthropic
- **Progress is saved to localStorage** - Resume after page refresh

## Rate Limiting

Built-in rate limiting:
- 1 second delay between posts
- Exponential backoff on API errors
- Automatic retry (up to 3 times) on failures

## Browser Compatibility

Works in modern browsers with:
- ES2020 support
- Web Crypto API
- Clipboard API
- LocalStorage

## Development

```bash
# Type checking
npm run typecheck

# Build
npm run build

# Preview production build
npm run preview
```

## License

MIT
