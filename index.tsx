import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Register the service worker that makes the app installable.
// Registration silently does nothing when the browser has no serviceWorker
// support, and throws on an origin the browser does not fully trust -- which
// includes a self-signed certificate. Failing quietly is correct: the app works
// exactly the same without it, only the "Install app" prompt disappears.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.info('[PWA] Service worker not registered:', err?.message || err);
    });
  });
}
