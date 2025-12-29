#!/usr/bin/env node

/**
 * Obsidian Knowledge Graph Builder
 * Main CLI Entry Point
 *
 * Transforms unstructured text files into an interconnected Obsidian vault
 */

import { program } from 'commander';
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import { join, resolve } from 'path';
import chalk from 'chalk';
import ora from 'ora';

import { loadConfig, validateConfig } from './config.js';
import { loadFiles } from './ingest.js';
import { initializeAI, batchExtract, extractMetadataOffline } from './extract.js';
import { loadSeedOntology } from './ontology.js';
import { generateVault } from './vault.js';

// CLI Configuration
program
  .name('obsidian-builder')
  .description('Transform text files into an interconnected Obsidian knowledge vault')
  .version('1.0.0')
  .option('-i, --input <path>', 'Input directory containing text files', './input')
  .option('-o, --output <path>', 'Output directory for the Obsidian vault', './vault')
  .option('-s, --seed <path>', 'Seed ontology directory', './seed-ontology')
  .option('-c, --config <path>', 'Configuration file path')
  .option('--offline', 'Run in offline mode (no AI, uses heuristics)')
  .option('--dry-run', 'Show what would be processed without making changes')
  .option('--verbose', 'Enable verbose logging')
  .parse();

const options = program.opts();

/**
 * Main execution function
 */
async function main() {
  console.log(chalk.bold.cyan('\n=== Obsidian Knowledge Graph Builder ===\n'));

  // Load configuration
  const config = loadConfig(options.config);

  // Override with CLI options
  config.inputDir = resolve(options.input);
  config.outputDir = resolve(options.output);
  config.seedOntologyDir = resolve(options.seed);
  config.offline = options.offline;
  config.verbose = options.verbose;

  // Validate configuration
  if (!config.offline) {
    const validation = validateConfig(config);
    if (!validation.valid) {
      console.log(chalk.yellow('No API key found. Running in offline mode.'));
      console.log(chalk.dim('Set OPENAI_API_KEY or ANTHROPIC_API_KEY for AI-powered extraction.\n'));
      config.offline = true;
    }
  }

  // Check input directory
  if (!existsSync(config.inputDir)) {
    console.error(chalk.red(`Error: Input directory not found: ${config.inputDir}`));
    console.log(chalk.dim('Create the directory and add .txt or .md files to process.'));
    process.exit(1);
  }

  // Load seed ontology
  const spinner = ora('Loading seed ontology...').start();
  const seedOntology = loadSeedOntology(config.seedOntologyDir);
  spinner.succeed(`Loaded ${seedOntology.concepts.length} concepts, ${seedOntology.entities.length} entities`);

  // Find and load input files
  spinner.start('Scanning input files...');
  const files = await loadFiles(config.inputDir, { minWordCount: 50 });

  if (files.length === 0) {
    spinner.fail('No valid files found in input directory');
    console.log(chalk.dim('Supported formats: .txt, .md, .markdown, .html'));
    process.exit(1);
  }

  spinner.succeed(`Found ${files.length} files to process`);

  // Show file summary
  const totalWords = files.reduce((sum, f) => sum + f.wordCount, 0);
  console.log(chalk.dim(`  Total words: ${totalWords.toLocaleString()}`));

  // Dry run - just show what would be processed
  if (options.dryRun) {
    console.log(chalk.yellow('\n[DRY RUN] Would process these files:\n'));
    for (const file of files.slice(0, 20)) {
      console.log(`  - ${file.filename} (${file.wordCount} words)`);
    }
    if (files.length > 20) {
      console.log(chalk.dim(`  ... and ${files.length - 20} more files`));
    }
    process.exit(0);
  }

  // Extract metadata
  console.log(chalk.cyan('\nExtracting metadata...\n'));
  let extractions;

  if (config.offline) {
    spinner.start('Running offline extraction...');
    extractions = files.map(file => extractMetadataOffline(file, seedOntology));
    spinner.succeed(`Extracted metadata from ${extractions.length} files (offline mode)`);
  } else {
    initializeAI(config);
    spinner.start('Extracting with AI...');

    extractions = await batchExtract(files, seedOntology, config, (progress) => {
      spinner.text = `Processing ${progress.processed}/${progress.total} files...`;
      if (config.verbose) {
        console.log(chalk.dim(`  Current: ${progress.current.join(', ')}`));
      }
    });

    spinner.succeed(`Extracted metadata from ${extractions.length} files`);
  }

  // Generate the vault
  console.log(chalk.cyan('\nGenerating Obsidian vault...\n'));
  spinner.start('Creating vault structure...');

  const stats = generateVault(extractions, config.outputDir, config);

  spinner.succeed('Vault generated successfully!');

  // Summary
  console.log(chalk.green('\n=== Build Complete ===\n'));
  console.log(`  ${chalk.bold('Articles:')} ${stats.articles}`);
  console.log(`  ${chalk.bold('Concepts:')} ${stats.concepts}`);
  console.log(`  ${chalk.bold('Entities:')} ${stats.entities}`);
  console.log(`  ${chalk.bold('Total Words:')} ${stats.totalWords.toLocaleString()}`);

  console.log(chalk.cyan(`\nVault location: ${chalk.bold(config.outputDir)}`));
  console.log(chalk.dim('\nOpen this folder in Obsidian to explore your knowledge graph.'));

  // Save extraction data for reference
  const extractionDataPath = join(config.outputDir, '_extraction-data.json');
  writeFileSync(extractionDataPath, JSON.stringify(extractions, null, 2));
  console.log(chalk.dim(`Extraction data saved to: ${extractionDataPath}`));
}

// Run
main().catch(error => {
  console.error(chalk.red('\nError:'), error.message);
  if (options.verbose) {
    console.error(error.stack);
  }
  process.exit(1);
});
