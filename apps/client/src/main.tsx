import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { TooltipProvider } from '@/components/ui/tooltip';
import './index.css';
document.documentElement.classList.add('dark');

createRoot(document.getElementById('root')!).render(<React.StrictMode><TooltipProvider><App /></TooltipProvider></React.StrictMode>);
