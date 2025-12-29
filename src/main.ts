// Substack Knowledge Graph Generator - Main Entry Point

import './styles.css';
import { Post, ProcessingState, Entity, Concept, FilterOptions } from './types';
import { extractPostsFromZip, validateZipFile, getZipSummary } from './fileProcessor';
import { initializeClient, extractFromPost, runIntegrationVerification, validateApiKey } from './anthropic';
import {
  createProcessingState,
  applyExtraction,
  applyIntegration,
  shouldRunIntegration,
  saveStateToStorage,
  loadStateFromStorage,
  clearSavedState,
  getGraphStats,
} from './graphManager';
import {
  generateObsidianVault,
  generateLLMContextFile,
  copyLLMContextToClipboard,
  generateJSONExport,
} from './exporters';
import { estimateRemainingTime, truncate, debounce } from './utils';

// Application State
let state: ProcessingState | null = null;
let selectedFile: File | null = null;
let isPaused = false;
let shouldStop = false;
let currentFilter: FilterOptions = {
  searchQuery: '',
  types: new Set(),
  domains: new Set(),
  significance: new Set(),
};

// DOM Elements
const elements = {
  // API Key
  apiKeyInput: document.getElementById('apiKey') as HTMLInputElement,
  apiKeyStatus: document.getElementById('apiKeyStatus') as HTMLElement,

  // File Upload
  dropzone: document.getElementById('dropzone') as HTMLElement,
  fileInput: document.getElementById('fileInput') as HTMLInputElement,
  selectedFile: document.getElementById('selectedFile') as HTMLElement,
  fileName: document.getElementById('fileName') as HTMLElement,
  fileDetails: document.getElementById('fileDetails') as HTMLElement,
  removeFile: document.getElementById('removeFile') as HTMLElement,

  // Actions
  startBtn: document.getElementById('startBtn') as HTMLButtonElement,

  // Resume Banner
  resumeBanner: document.getElementById('resumeBanner') as HTMLElement,
  resumeInfo: document.getElementById('resumeInfo') as HTMLElement,
  resumeBtn: document.getElementById('resumeBtn') as HTMLButtonElement,
  discardBtn: document.getElementById('discardBtn') as HTMLButtonElement,

  // Progress
  progressSection: document.getElementById('progressSection') as HTMLElement,
  progressBar: document.getElementById('progressBar') as HTMLElement,
  progressPosts: document.getElementById('progressPosts') as HTMLElement,
  progressEntities: document.getElementById('progressEntities') as HTMLElement,
  progressConcepts: document.getElementById('progressConcepts') as HTMLElement,
  progressCurrent: document.getElementById('progressCurrent') as HTMLElement,
  progressEta: document.getElementById('progressEta') as HTMLElement,
  pauseBtn: document.getElementById('pauseBtn') as HTMLButtonElement,
  stopBtn: document.getElementById('stopBtn') as HTMLButtonElement,

  // Graph Preview
  graphPreview: document.getElementById('graphPreview') as HTMLElement,
  graphSearch: document.getElementById('graphSearch') as HTMLInputElement,
  graphTabs: document.querySelectorAll('.graph-tab') as NodeListOf<HTMLElement>,
  graphList: document.getElementById('graphList') as HTMLElement,

  // Export
  exportSection: document.getElementById('exportSection') as HTMLElement,
  exportObsidian: document.getElementById('exportObsidian') as HTMLElement,
  exportLLM: document.getElementById('exportLLM') as HTMLElement,
  exportJSON: document.getElementById('exportJSON') as HTMLElement,
  exportCopy: document.getElementById('exportCopy') as HTMLElement,

  // Upload Section
  uploadSection: document.getElementById('uploadSection') as HTMLElement,

  // Messages
  messageContainer: document.getElementById('messageContainer') as HTMLElement,
};

// Initialize Application
function init() {
  // Check for saved state
  const savedState = loadStateFromStorage();
  if (savedState && savedState.status !== 'complete' && savedState.currentPostIndex > 0) {
    showResumeBanner(savedState);
  }

  // Set up event listeners
  setupEventListeners();

  // Check for saved API key in session
  const savedKey = sessionStorage.getItem('anthropic-api-key');
  if (savedKey) {
    elements.apiKeyInput.value = savedKey;
    updateStartButton();
  }
}

function setupEventListeners() {
  // API Key
  elements.apiKeyInput.addEventListener('input', debounce(() => {
    const key = elements.apiKeyInput.value.trim();
    if (key) {
      sessionStorage.setItem('anthropic-api-key', key);
    }
    updateStartButton();
  }, 300));

  // Dropzone
  elements.dropzone.addEventListener('click', () => elements.fileInput.click());
  elements.dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    elements.dropzone.classList.add('dragover');
  });
  elements.dropzone.addEventListener('dragleave', () => {
    elements.dropzone.classList.remove('dragover');
  });
  elements.dropzone.addEventListener('drop', async (e) => {
    e.preventDefault();
    elements.dropzone.classList.remove('dragover');
    const file = e.dataTransfer?.files[0];
    if (file) await handleFileSelect(file);
  });
  elements.fileInput.addEventListener('change', async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) await handleFileSelect(file);
  });
  elements.removeFile.addEventListener('click', clearFile);

  // Start button
  elements.startBtn.addEventListener('click', startProcessing);

  // Resume banner
  elements.resumeBtn.addEventListener('click', resumeProcessing);
  elements.discardBtn.addEventListener('click', discardSavedState);

  // Progress controls
  elements.pauseBtn.addEventListener('click', togglePause);
  elements.stopBtn.addEventListener('click', stopProcessing);

  // Graph tabs
  elements.graphTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      elements.graphTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      renderGraphPreview();
    });
  });

  // Graph search
  elements.graphSearch.addEventListener('input', debounce(() => {
    currentFilter.searchQuery = elements.graphSearch.value.toLowerCase();
    renderGraphPreview();
  }, 200));

  // Export buttons
  elements.exportObsidian.addEventListener('click', exportObsidian);
  elements.exportLLM.addEventListener('click', exportLLM);
  elements.exportJSON.addEventListener('click', exportJSON);
  elements.exportCopy.addEventListener('click', copyToClipboard);
}

// File Handling
async function handleFileSelect(file: File) {
  const validation = await validateZipFile(file);
  if (!validation.valid) {
    showMessage(validation.error || 'Invalid file', 'error');
    return;
  }

  selectedFile = file;
  const summary = await getZipSummary(file);

  elements.fileName.textContent = file.name;
  elements.fileDetails.textContent = `${summary.supportedFiles} posts | ${summary.estimatedSize}`;
  elements.selectedFile.style.display = 'flex';
  elements.dropzone.style.display = 'none';

  updateStartButton();
}

function clearFile() {
  selectedFile = null;
  elements.fileInput.value = '';
  elements.selectedFile.style.display = 'none';
  elements.dropzone.style.display = 'block';
  updateStartButton();
}

// Start Processing
async function startProcessing() {
  const apiKey = elements.apiKeyInput.value.trim();
  if (!apiKey || !selectedFile) return;

  // Validate API key
  elements.startBtn.disabled = true;
  elements.startBtn.textContent = 'Validating API Key...';

  const keyValidation = await validateApiKey(apiKey);
  if (!keyValidation.valid) {
    showMessage(keyValidation.error || 'Invalid API key', 'error');
    elements.startBtn.disabled = false;
    elements.startBtn.textContent = 'Generate Knowledge Graph';
    return;
  }

  // Initialize client
  initializeClient(apiKey);

  // Extract posts
  elements.startBtn.textContent = 'Extracting posts...';
  let posts: Post[];
  try {
    posts = await extractPostsFromZip(selectedFile);
  } catch (error) {
    showMessage((error as Error).message, 'error');
    elements.startBtn.disabled = false;
    elements.startBtn.textContent = 'Generate Knowledge Graph';
    return;
  }

  // Initialize state
  state = createProcessingState(posts);
  state.status = 'processing';

  // Show progress section
  elements.uploadSection.classList.add('hidden');
  elements.progressSection.classList.add('active');
  elements.graphPreview.classList.remove('hidden');

  // Start processing
  await processQueue();
}

// Resume Processing
async function resumeProcessing() {
  const savedState = loadStateFromStorage();
  if (!savedState) return;

  const apiKey = elements.apiKeyInput.value.trim();
  if (!apiKey) {
    showMessage('Please enter your API key first', 'warning');
    return;
  }

  const keyValidation = await validateApiKey(apiKey);
  if (!keyValidation.valid) {
    showMessage(keyValidation.error || 'Invalid API key', 'error');
    return;
  }

  initializeClient(apiKey);
  state = savedState;
  state.status = 'processing';
  isPaused = false;
  shouldStop = false;

  elements.resumeBanner.classList.remove('active');
  elements.uploadSection.classList.add('hidden');
  elements.progressSection.classList.add('active');
  elements.graphPreview.classList.remove('hidden');

  await processQueue();
}

function discardSavedState() {
  clearSavedState();
  elements.resumeBanner.classList.remove('active');
}

// Process Queue
async function processQueue() {
  if (!state) return;

  const recentPosts: string[] = [];

  while (state.currentPostIndex < state.totalPosts && !shouldStop) {
    if (isPaused) {
      state.pausedAt = Date.now();
      saveStateToStorage(state);
      return;
    }

    const post = state.posts[state.currentPostIndex];
    state.currentPostTitle = post.title;
    updateProgressUI();

    try {
      // Extract entities and concepts
      const extraction = await extractFromPost(post, state.graph);
      state.graph = applyExtraction(state.graph, extraction, post);
      recentPosts.push(post.title);

      // Run integration verification periodically
      if (shouldRunIntegration(state.currentPostIndex) && recentPosts.length >= 10) {
        const integration = await runIntegrationVerification(state.graph, recentPosts.slice(-10));
        state.graph = applyIntegration(state.graph, integration);
      }

      state.currentPostIndex++;
      renderGraphPreview();

      // Save progress periodically
      if (state.currentPostIndex % 5 === 0) {
        saveStateToStorage(state);
      }
    } catch (error) {
      console.error('Error processing post:', error);
      state.errors.push({ postTitle: post.title, error: (error as Error).message });
      state.currentPostIndex++; // Skip and continue
    }
  }

  // Processing complete
  if (!shouldStop) {
    state.status = 'complete';
    clearSavedState();
    showExportSection();
  }
}

// UI Updates
function updateProgressUI() {
  if (!state) return;

  const percent = Math.round((state.currentPostIndex / state.totalPosts) * 100);
  const stats = getGraphStats(state.graph);
  const elapsed = Date.now() - state.startTime;

  elements.progressBar.style.width = `${percent}%`;
  elements.progressPosts.textContent = `${state.currentPostIndex}/${state.totalPosts}`;
  elements.progressEntities.textContent = String(stats.totalEntities);
  elements.progressConcepts.textContent = String(stats.totalConcepts);
  elements.progressCurrent.textContent = truncate(state.currentPostTitle, 50);
  elements.progressEta.textContent = estimateRemainingTime(
    state.currentPostIndex,
    state.totalPosts,
    elapsed
  );
}

function updateStartButton() {
  const hasKey = elements.apiKeyInput.value.trim().length > 0;
  const hasFile = selectedFile !== null;
  elements.startBtn.disabled = !(hasKey && hasFile);
}

function showResumeBanner(savedState: ProcessingState) {
  const stats = getGraphStats(savedState.graph);
  elements.resumeInfo.textContent =
    `${savedState.currentPostIndex}/${savedState.totalPosts} posts processed | ` +
    `${stats.totalEntities} entities | ${stats.totalConcepts} concepts`;
  elements.resumeBanner.classList.add('active');
}

function showExportSection() {
  elements.progressSection.classList.remove('active');
  elements.exportSection.classList.add('active');

  if (state) {
    const stats = getGraphStats(state.graph);
    showMessage(
      `Processing complete! Extracted ${stats.totalEntities} entities and ${stats.totalConcepts} concepts.`,
      'success'
    );
  }
}

function showMessage(text: string, type: 'success' | 'error' | 'warning') {
  const icon = type === 'success' ? '✓' : type === 'error' ? '✕' : '⚠';
  elements.messageContainer.innerHTML = `
    <div class="message message-${type} fade-in">
      <span class="message-icon">${icon}</span>
      <span>${text}</span>
    </div>
  `;

  // Auto-hide after 5 seconds
  setTimeout(() => {
    elements.messageContainer.innerHTML = '';
  }, 5000);
}

// Graph Preview
function renderGraphPreview() {
  if (!state) return;

  const activeTab = document.querySelector('.graph-tab.active') as HTMLElement;
  const showType = activeTab?.dataset.type || 'all';

  let items: Array<{ type: 'entity' | 'concept'; data: Entity | Concept }> = [];

  if (showType === 'all' || showType === 'entities') {
    for (const entity of state.graph.entities.values()) {
      items.push({ type: 'entity', data: entity });
    }
  }

  if (showType === 'all' || showType === 'concepts') {
    for (const concept of state.graph.concepts.values()) {
      items.push({ type: 'concept', data: concept });
    }
  }

  // Apply search filter
  if (currentFilter.searchQuery) {
    items = items.filter(item => {
      const name = item.data.name.toLowerCase();
      const desc = item.data.description.toLowerCase();
      return name.includes(currentFilter.searchQuery) || desc.includes(currentFilter.searchQuery);
    });
  }

  // Sort by significance and occurrence count
  items.sort((a, b) => {
    const sigOrder = { major: 0, moderate: 1, minor: 2 };
    const sigA = sigOrder[a.data.significance];
    const sigB = sigOrder[b.data.significance];
    if (sigA !== sigB) return sigA - sigB;
    return b.data.occurrences.length - a.data.occurrences.length;
  });

  // Render items (limit to 100 for performance)
  const displayItems = items.slice(0, 100);

  if (displayItems.length === 0) {
    elements.graphList.innerHTML = `
      <div style="padding: 2rem; text-align: center; color: var(--text-muted);">
        ${currentFilter.searchQuery ? 'No results found' : 'Processing... items will appear here'}
      </div>
    `;
    return;
  }

  elements.graphList.innerHTML = displayItems.map(item => {
    const isEntity = item.type === 'entity';
    const entity = isEntity ? (item.data as Entity) : null;
    const concept = !isEntity ? (item.data as Concept) : null;

    const icon = isEntity ? getEntityIcon(entity!.type) : '💡';
    const typeLabel = isEntity ? entity!.type : (concept!.domains[0] || 'concept');
    const sigBadge = item.data.significance === 'major'
      ? '<span class="graph-item-badge major">MAJOR</span>'
      : '';

    return `
      <div class="graph-item">
        <div class="graph-item-icon ${item.type}">${icon}</div>
        <div class="graph-item-content">
          <div class="graph-item-name">${item.data.name} ${sigBadge}</div>
          <div class="graph-item-meta">
            <span>${typeLabel}</span>
            <span>${item.data.occurrences.length} posts</span>
          </div>
          ${item.data.description ? `<div class="graph-item-description">${truncate(item.data.description, 150)}</div>` : ''}
        </div>
      </div>
    `;
  }).join('');

  if (items.length > 100) {
    elements.graphList.innerHTML += `
      <div style="padding: 1rem; text-align: center; color: var(--text-muted); font-size: 0.9rem;">
        ...and ${items.length - 100} more items
      </div>
    `;
  }
}

function getEntityIcon(type: string): string {
  const icons: Record<string, string> = {
    person: '👤',
    organization: '🏢',
    place: '📍',
    work: '📚',
    event: '📅',
    other: '🔹',
  };
  return icons[type] || '🔹';
}

// Controls
function togglePause() {
  isPaused = !isPaused;
  elements.pauseBtn.textContent = isPaused ? '▶ Resume' : '⏸ Pause';

  if (!isPaused && state) {
    state.status = 'processing';
    processQueue();
  }
}

function stopProcessing() {
  shouldStop = true;
  if (state) {
    state.status = 'paused';
    saveStateToStorage(state);
    showMessage('Processing stopped. You can resume later.', 'warning');
    showExportSection();
  }
}

// Exports
async function exportObsidian() {
  if (!state) return;

  try {
    const blob = await generateObsidianVault(state.graph);
    downloadBlob(blob, 'knowledge-graph-vault.zip');
    showMessage('Obsidian vault downloaded!', 'success');
  } catch (error) {
    showMessage('Failed to generate Obsidian vault', 'error');
  }
}

function exportLLM() {
  if (!state) return;

  try {
    const blob = generateLLMContextFile(state.graph);
    downloadBlob(blob, 'knowledge-graph-llm-context.md');
    showMessage('LLM context file downloaded!', 'success');
  } catch (error) {
    showMessage('Failed to generate LLM context', 'error');
  }
}

function exportJSON() {
  if (!state) return;

  try {
    const blob = generateJSONExport(state.graph);
    downloadBlob(blob, 'knowledge-graph.json');
    showMessage('JSON export downloaded!', 'success');
  } catch (error) {
    showMessage('Failed to generate JSON export', 'error');
  }
}

async function copyToClipboard() {
  if (!state) return;

  try {
    await copyLLMContextToClipboard(state.graph);
    showMessage('Copied to clipboard!', 'success');
  } catch (error) {
    showMessage('Failed to copy to clipboard', 'error');
  }
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Initialize on load
document.addEventListener('DOMContentLoaded', init);
