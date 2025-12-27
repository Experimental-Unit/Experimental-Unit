# TECHNICAL.md - Architecture & Implementation Decisions

This file documents technical decisions for future developers. Not intended for the project owner.

## Technology Stack

### Frontend
- **React 18** - Already in project, stable, well-documented
- **Vite** - Fast build tool, already configured
- **D3.js or vis-network** - For graph visualization (vis-network already loaded via CDN)
- **CSS-in-JS (inline styles)** - Simple, no build complexity

### Backend Considerations
For proposition extraction, we need AI/LLM integration. Options:
1. **Client-side with API calls** - User provides their own API key (OpenAI, Anthropic, etc.)
2. **Serverless functions** - AWS Lambda, Vercel Functions
3. **Self-hosted** - More complex, not needed initially

**Decision:** Start with client-side + user-provided API key. Keeps costs on user side, no server infrastructure needed, privacy-respecting (data doesn't go through our servers).

### Data Storage
- **LocalStorage/IndexedDB** - For persistence in browser
- **JSON export/import** - Already implemented for graphs
- **Future:** Optional cloud sync for users who want it

## Architecture

### Core Modules

1. **TextImporter**
   - Accepts paste, file upload, or URL
   - Handles large text (100k+ words)
   - Chunks text for processing

2. **PropositionExtractor**
   - Sends text chunks to LLM
   - Prompt engineering to extract propositions
   - Returns structured proposition objects
   - Identifies "foundational" vs "derivative" claims

3. **WorldviewBuilder**
   - Presents propositions for user feedback
   - Tracks affirm/reject/nuance responses
   - Builds graph structure from responses
   - Handles corrections and modifications

4. **GraphVisualizer**
   - Multiple visualization modes:
     - Force-directed network
     - Hierarchical tree
     - Navigable web
   - Color coding by category/confidence
   - Interactive exploration

5. **ChatbotInterface** (Future)
   - RAG-style retrieval from worldview graph
   - Combines personal beliefs with general LLM knowledge
   - Personalized responses based on graph

### Data Structures

```javascript
// Proposition
{
  id: "prop_uuid",
  text: "Love is the fundamental force that must guide human action",
  source: "post_142669964",
  sourceText: "...the original text excerpt...",
  category: "ethics", // or "metaphysics", "epistemology", etc.
  foundational: true, // true = core belief, false = derivative
  dependencies: ["prop_other_uuid"], // what this derives from
  status: "pending" | "affirmed" | "rejected" | "nuanced",
  nuance: "Optional text explaining the nuance",
  confidence: 0.0-1.0, // how certain the user is
  createdAt: timestamp,
  modifiedAt: timestamp
}

// Worldview Graph
{
  id: "worldview_uuid",
  owner: "adam", // or anonymous hash
  label: "Experimental Unit Worldview",
  propositions: [...],
  connections: [
    { from: "prop_1", to: "prop_2", type: "supports" | "contradicts" | "derives" }
  ],
  metadata: {
    createdAt: timestamp,
    postCount: 887,
    totalPropositions: number,
    affirmed: number,
    rejected: number,
    nuanced: number
  }
}
```

### Proposition Extraction Strategy

1. **Chunking**: Split large texts into ~2000 token chunks with overlap
2. **Extraction prompt**:
   - Ask LLM to identify claims, beliefs, assertions
   - Distinguish facts from opinions
   - Identify foundational vs derivative claims
   - Extract dependencies between claims
3. **Deduplication**: Similar propositions across posts should merge
4. **Ordering**: Present foundational propositions first

### Foundational Detection Heuristics
- Claims about the nature of reality, existence, consciousness
- Ethical first principles ("love is...", "justice requires...")
- Epistemological stances ("we can know...", "truth is...")
- Metaphysical positions ("everything is connected", "god is...")
- Derivative = claims that reference or depend on other claims

## Color Palette (CSS Variables)

```css
:root {
  /* Primary */
  --xu-orange: #FF6B35;
  --xu-purple: #7B2D8E;
  --xu-forest: #2D5A27;
  --xu-grey: #4A4A4A;
  --xu-black: #1A1A1A;

  /* Secondary */
  --xu-neon-yellow: #DFFF00;
  --xu-ocean-blue: #0077B6;
  --xu-pink: #FF69B4;
  --xu-white: #FAFAFA;
  --xu-red: #DC143C;

  /* Functional */
  --affirmed: #4CAF50;
  --rejected: #F44336;
  --nuanced: #FF9800;
  --pending: #9E9E9E;
}
```

## Security Considerations

- API keys stored only in browser localStorage (never transmitted to our servers)
- Export includes option to exclude sensitive data
- No tracking or analytics without explicit consent
- HTTPS only for any external resources

## Performance Targets

- Initial load < 3 seconds
- Proposition extraction: ~1 second per chunk (depends on LLM)
- Graph rendering: smooth at 1000+ nodes
- Mobile-responsive (eventually)

## Future Considerations

### Multi-user / Sharing
- Optional anonymous sharing via hash URLs
- Comparison views between worldviews
- Isomorphism detection between graphs

### Chatbot Integration
- RAG architecture using propositions as retrieval corpus
- Context injection based on user's affirmed beliefs
- Personality modeling from worldview graph

### VR/Spatial
- Three.js for 3D visualization
- WebXR for VR exploration
- Memory palace metaphor for navigation

## Development Workflow

1. Feature branches from main
2. Test locally with `npm run dev`
3. Build with `npm run build`
4. Deploy via AWS Amplify (already configured)
