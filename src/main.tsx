import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles.css';
import './enhancements.css';
import './pages.css';
import './performance.css';
import './oscilloscope.css';
import './expanded-studio.css';
import './project-tools.css';

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
