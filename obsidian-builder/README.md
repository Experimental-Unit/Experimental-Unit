# Obsidian Knowledge Graph Builder

Transform a folder of text files into an interconnected Obsidian vault with automatic concept extraction, entity recognition, and relationship mapping.

## What It Does

Drop in your text files (blog posts, transcripts, notes, papers) and get back a complete Obsidian vault with:

- **Article Notes** - Each file becomes a structured note with summary, concepts, entities, and quotes
- **Concept Notes** - Theoretical frameworks automatically identified and cross-referenced
- **Entity Notes** - People, organizations, and works tracked across your corpus
- **Index Pages** - Alphabetical and frequency-sorted navigation
- **WikiLinks** - Every concept and entity is linked for graph exploration

## Quick Start

```bash
# 1. Navigate to the obsidian-builder folder
cd obsidian-builder

# 2. Install dependencies
npm install

# 3. Put your text files in the input folder
mkdir input
cp /path/to/your/files/*.txt input/
cp /path/to/your/files/*.md input/

# 4. Run the builder (offline mode - no API key needed)
node src/main.js --offline

# 5. Open the 'vault' folder in Obsidian
```

## AI-Powered Mode

For richer extraction with summaries, inferred connections, and key quotes:

```bash
# Set your OpenAI API key
export OPENAI_API_KEY="your-key-here"

# Run without --offline flag
node src/main.js
```

This uses GPT-4o-mini by default (cost-effective for bulk processing).

## Command Line Options

```
Options:
  -i, --input <path>   Input directory with text files (default: "./input")
  -o, --output <path>  Output directory for vault (default: "./vault")
  -s, --seed <path>    Seed ontology directory (default: "./seed-ontology")
  --offline            Use heuristic extraction (no API calls)
  --dry-run            Show what would be processed without changes
  --verbose            Enable detailed logging
```

## Seed Ontology

The `seed-ontology/` folder contains pre-defined concepts and entities that should be consistently recognized across your corpus. Edit these files to customize:

- `concepts.md` - Theoretical frameworks and ideas to track
- `entities.md` - People, organizations, and works to recognize
- `ontology.json` - Entity type mappings (Person, Organization, Work, etc.)

## Output Structure

```
vault/
├── Home.md                    # Main navigation page
├── Articles/                  # One note per input file
│   ├── My First Post.md
│   └── Another Article.md
├── Concepts/                  # Auto-generated concept notes
│   ├── Symbolic Exchange.md
│   └── Experimental Unit.md
├── Entities/                  # Auto-generated entity notes
│   ├── Jean Baudrillard.md
│   └── TRADOC.md
├── Indices/                   # Navigation indices
│   ├── Article Index.md
│   ├── Concept Index.md
│   └── Entity Index.md
└── .obsidian/                 # Obsidian configuration
```

## Supported File Types

- `.txt` - Plain text files
- `.md` / `.markdown` - Markdown files (preserves frontmatter)
- `.html` - HTML files (auto-strips tags)

## Processing Large Archives

The builder handles 1 to 10,000+ files. For large archives:

```bash
# Dry run first to see what will be processed
node src/main.js --dry-run

# Process with verbose logging
node src/main.js --verbose
```

## Example with Substack Export

```bash
# Unzip your Substack export
unzip my-substack-posts.zip -d input/

# Build the vault
node src/main.js --offline

# Or with AI enrichment
export OPENAI_API_KEY="sk-..."
node src/main.js
```

## Customizing Templates

Edit `src/templates.js` to customize the note formats for:
- Article frontmatter fields
- Concept note structure
- Entity note layout
- Index formatting

## Requirements

- Node.js 18+
- npm

## License

MIT
