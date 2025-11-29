import * as esbuild from 'esbuild';
import { cpSync, existsSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const watch = process.argv.includes('--watch');

// Ensure dist directory exists
if (!existsSync('dist')) {
  mkdirSync('dist', { recursive: true });
}

// Copy static assets to dist
const staticAssets = [
  'index.html',
  'uPlot.iife.min.js',
  'uPlot.min.css',
  'PIDKiln_vars.json',
];

const staticDirs = [
  'icons',
];

for (const file of staticAssets) {
  if (existsSync(file)) {
    cpSync(file, join('dist', file));
  }
}

for (const dir of staticDirs) {
  if (existsSync(dir)) {
    cpSync(dir, join('dist', dir), { recursive: true });
  }
}

// esbuild configuration
const config = {
  entryPoints: ['src/main.ts'],
  bundle: true,
  outfile: 'dist/app.js',
  sourcemap: true,
  minify: !watch,
  target: ['es2020'],
  format: 'iife',
  logLevel: 'info',
};

if (watch) {
  const ctx = await esbuild.context(config);
  await ctx.watch();
  console.log('Watching for changes...');
} else {
  await esbuild.build(config);
  console.log('Build complete.');
}

