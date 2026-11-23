import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles/globals.css';
import './styles/components.css';

// Apply theme on load
const applyTheme = () => {
  const savedTheme = localStorage.getItem('voidtest-theme') || 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);
};

applyTheme();

// Listen for theme changes from settings
window.addEventListener('storage', (e) => {
  if (e.key === 'voidtest-theme') {
    applyTheme();
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);