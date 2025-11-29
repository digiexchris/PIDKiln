// Hash-based router

import { chart } from './state.js';
import { initChart } from './chart/dashboard.js';
import { loadProgramList } from './views/programs.js';
import { loadLogsList } from './views/logs.js';
import { loadPreferences } from './views/preferences.js';
import { loadDebugInfo } from './views/debug.js';
import { loadAboutInfo } from './views/about.js';

export function navigate() {
  const hash = window.location.hash.slice(2) || '';
  const viewId = hash.split('/')[0] || 'dashboard';

  // Update views
  document.querySelectorAll<HTMLElement>('.view').forEach(v => v.classList.remove('active'));
  const view = document.getElementById(`view-${viewId}`);
  if (view) view.classList.add('active');

  // Update nav (don't highlight for editor)
  document.querySelectorAll<HTMLElement>('.nav-item').forEach(n => {
    const href = n.getAttribute('href');
    n.classList.toggle('active',
      href === `#/${hash}` ||
      (hash === '' && href === '#/') ||
      (viewId === 'editor' && href === '#/programs'),
    );
  });

  // Load data for view
  if (viewId === 'programs') loadProgramList();
  if (viewId === 'logs') loadLogsList();
  if (viewId === 'preferences') loadPreferences();
  if (viewId === 'debug') loadDebugInfo();
  if (viewId === 'about') loadAboutInfo();
  if (viewId === 'dashboard' || viewId === '') {
    if (!chart) {
      window.setTimeout(initChart, 100);
    }
  }
}

export function initRouter() {
  window.addEventListener('hashchange', navigate);
}

