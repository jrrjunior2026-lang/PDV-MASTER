import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import SyncService from './services/syncService';
import OfflineCacheService from './services/offlineCacheService';

// Initialize services
SyncService.init();
OfflineCacheService.init().catch(console.error);

// Register service worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/PDV-MASTER/sw.js')
      .then((registration) => {
        console.log('✅ Service Worker registrado:', registration.scope);
      })
      .catch((error) => {
        console.log('⚠️ Service Worker não registrado:', error);
      });
  });
}

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
