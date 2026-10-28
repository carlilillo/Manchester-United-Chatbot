import { App } from './App';
import { TooltipProvider } from '@/components/ui/tooltip/TooltipProvider';
import '@/index.css';
import React from 'react';
import { createRoot } from 'react-dom/client';

// Mount only after the static HTML (including crawlable metadata) has loaded.
const root = document.getElementById('root');

if (!root) throw new Error('The application root element is missing.');

createRoot(root).render(
  <React.StrictMode>
    <TooltipProvider>
      <App />
    </TooltipProvider>
  </React.StrictMode>,
);
