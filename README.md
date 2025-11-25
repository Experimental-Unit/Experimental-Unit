# 📊 Experimental Unit Triple Builder

A modern React application for building knowledge graphs with Wikidata integration. Create, visualize, and export semantic triples in JSON and JSON-LD formats.

## Features

- 🔍 **Wikidata Integration**: Search and select entities and properties from Wikidata
- ➕ **Custom Nodes**: Create your own entities and properties
- 📊 **Live Visualization**: Interactive graph visualization using vis-network
- 💾 **Import/Export**: Save and load graphs in JSON format
- 🌐 **Semantic Web Ready**: Export to JSON-LD for linked data applications
- 🎨 **Clean UI**: Modern, intuitive interface

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- A GitHub account (for deployment)

### Installation

1. Clone this repository:
```bash
git clone https://github.com/YOUR_USERNAME/triple-builder.git
cd triple-builder
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

The app will open at `http://localhost:3000`

## Deployment to GitHub Pages

### Step 1: Update Configuration

1. Edit `package.json` and update the homepage:
```json
"homepage": "https://YOUR_GITHUB_USERNAME.github.io/triple-builder"
```

2. Edit `vite.config.js` and update the base:
```javascript
base: '/triple-builder/' // or whatever your repo name is
```

### Step 2: Deploy

1. Build and deploy:
```bash
npm run deploy
```

This will:
- Build your app
- Create a `gh-pages` branch
- Push the built files to GitHub Pages

### Step 3: Enable GitHub Pages

1. Go to your repository on GitHub
2. Navigate to Settings → Pages
3. Under "Source", select the `gh-pages` branch
4. Click Save

Your app will be live at: `https://YOUR_GITHUB_USERNAME.github.io/triple-builder/`

## Usage

### Starting a Session

1. Enter a session label (e.g., "my-research")
2. Click "Start Session"

### Building Triples

1. **Entity 1 (Subject)**: Search for or create an entity
2. **Property (Relationship)**: Search for or create a property
3. **Entity 2 (Object)**: Search for or create an entity
4. Click "Add Triple to Graph"

### Managing Your Graph

- **View**: See all triples listed and visualized in the graph
- **Remove**: Click "Remove" on any triple to delete it
- **Export**: Download as JSON or JSON-LD
- **Import**: Load previously saved graphs

## File Structure
```
triple-builder/
├── public/
│   └── index.html          # HTML template
├── src/
│   ├── App.jsx            # Main application component
│   ├── index.js           # React entry point
│   └── index.css          # Global styles
├── package.json           # Dependencies and scripts
├── vite.config.js         # Vite configuration
└── README.md             # This file
```

## Built With

- [React 18](https://react.dev/) - UI framework
- [Vite](https://vitejs.dev/) - Build tool
- [vis-network](https://visjs.github.io/vis-network/docs/network/) - Graph visualization
- [Wikidata API](https://www.wikidata.org/wiki/Wikidata:Data_access) - Knowledge base

## Contributing

Contributions are welcome! Feel free to open issues or submit pull requests.

## License

MIT License - feel free to use this project for any purpose.

## Author

Æ (Adam Stephen Wadley)

## Acknowledgments

- Wikidata community for the amazing knowledge base
- vis.js team for the graph visualization library
