/**
 * Obsidian Knowledge Graph Builder - Web Server
 * Main entry point for the Express.js backend
 */

import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdirSync, existsSync, rmSync } from 'fs';

import { processZipFile } from './processor.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Ensure uploads directory exists
const uploadsDir = join(__dirname, '..', 'uploads');
if (!existsSync(uploadsDir)) {
  mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/zip' || file.originalname.endsWith('.zip')) {
      cb(null, true);
    } else {
      cb(new Error('Only ZIP files are allowed'));
    }
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(join(__dirname, '..', 'public')));

// Store processing status
const processingJobs = new Map();

/**
 * POST /api/upload
 * Upload a ZIP file and start processing
 */
app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const apiKey = req.body.apiKey;
    if (!apiKey) {
      // Clean up uploaded file
      rmSync(req.file.path, { force: true });
      return res.status(400).json({ error: 'API key is required' });
    }

    const jobId = Date.now().toString();
    const inputPath = req.file.path;

    // Initialize job status
    processingJobs.set(jobId, {
      status: 'processing',
      progress: 0,
      total: 0,
      currentFile: '',
      startTime: Date.now(),
      inputPath
    });

    // Start processing in background
    processZipFile(inputPath, apiKey, (progress) => {
      const job = processingJobs.get(jobId);
      if (job) {
        job.progress = progress.processed;
        job.total = progress.total;
        job.currentFile = progress.currentFile || '';
      }
    })
      .then((result) => {
        const job = processingJobs.get(jobId);
        if (job) {
          job.status = 'complete';
          job.outputPath = result.outputPath;
          job.stats = result.stats;
        }
      })
      .catch((error) => {
        console.error('Processing error:', error);
        const job = processingJobs.get(jobId);
        if (job) {
          job.status = 'error';
          job.error = error.message;
        }
      });

    res.json({ jobId, message: 'Processing started' });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/status/:jobId
 * Get processing status
 */
app.get('/api/status/:jobId', (req, res) => {
  const job = processingJobs.get(req.params.jobId);
  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  res.json({
    status: job.status,
    progress: job.progress,
    total: job.total,
    currentFile: job.currentFile,
    stats: job.stats,
    error: job.error
  });
});

/**
 * GET /api/download/:jobId
 * Download the generated vault ZIP
 */
app.get('/api/download/:jobId', (req, res) => {
  const job = processingJobs.get(req.params.jobId);
  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  if (job.status !== 'complete') {
    return res.status(400).json({ error: 'Processing not complete' });
  }

  if (!job.outputPath || !existsSync(job.outputPath)) {
    return res.status(404).json({ error: 'Output file not found' });
  }

  res.download(job.outputPath, 'obsidian-vault.zip', (err) => {
    if (err) {
      console.error('Download error:', err);
    }
    // Clean up after download
    setTimeout(() => {
      try {
        rmSync(job.outputPath, { force: true });
        rmSync(job.inputPath, { force: true });
        processingJobs.delete(req.params.jobId);
      } catch (e) {
        console.error('Cleanup error:', e);
      }
    }, 60000); // Clean up after 1 minute
  });
});

/**
 * GET /api/health
 * Health check endpoint
 */
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', version: '1.0.0' });
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   Obsidian Knowledge Graph Builder                            ║
║   AI-Powered Knowledge Extraction                             ║
║                                                               ║
║   Server running at: http://localhost:${PORT}                    ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
  `);
});
