# Quick Setup Guide for GitHub Pages Deployment

## 1. Initial Setup (One-time)

First, make sure you have Node.js installed. Then:
```bash
# Navigate to your project directory
cd triple-builder

# Install dependencies
npm install
```

## 2. Test Locally
```bash
# Start development server
npm run dev

# Open browser to http://localhost:3000
```

## 3. Configure for YOUR GitHub Account

Edit these files:

### package.json
Change line 5:
```json
"homepage": "https://YOUR_GITHUB_USERNAME.github.io/YOUR_REPO_NAME"
```

Example:
```json
"homepage": "https://astephenw.github.io/triple-builder"
```

### vite.config.js
Change line 6:
```javascript
base: '/YOUR_REPO_NAME/'
```

Example:
```javascript
base: '/triple-builder/'
```

## 4. Create GitHub Repository
```bash
# Initialize git (if not already done)
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit: Triple Builder app"

# Create repo on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git

# Push to main branch
git branch -M main
git push -u origin main
```

## 5. Deploy to GitHub Pages
```bash
# Build and deploy
npm run deploy
```

This will:
- Build your production app
- Create a gh-pages branch
- Deploy to GitHub Pages

## 6. Enable GitHub Pages on GitHub.com

1. Go to your repo: github.com/YOUR_USERNAME/YOUR_REPO_NAME
2. Click "Settings" tab
3. Click "Pages" in the left sidebar
4. Under "Source", select "gh-pages" branch
5. Click "Save"

Wait 1-2 minutes, then visit:
https://YOUR_USERNAME.github.io/YOUR_REPO_NAME

## 7. Making Updates

After making changes:
```bash
# Commit your changes
git add .
git commit -m "Description of changes"
git push

# Deploy updated version
npm run deploy
```

## Troubleshooting

### "Cannot find module" errors
```bash
rm -rf node_modules package-lock.json
npm install
```

### Blank page after deployment
- Check that `homepage` in package.json matches your GitHub Pages URL
- Check that `base` in vite.config.js matches your repo name
- Check browser console for errors

### Changes not showing up
- Clear browser cache (Ctrl+Shift+R or Cmd+Shift+R)
- Wait a few minutes for GitHub Pages to update
- Check that you ran `npm run deploy`

## Need Help?

Check the main README.md for more detailed information.
