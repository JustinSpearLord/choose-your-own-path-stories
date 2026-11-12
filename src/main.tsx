import '@fontsource/ibm-plex-sans/latin-400.css';
import '@fontsource/ibm-plex-sans/latin-500.css';
import '@fontsource/ibm-plex-sans/latin-600.css';
import '@fontsource/literata/latin-400.css';
import '@fontsource/literata/latin-500.css';
import '@fontsource/pixelify-sans/latin-500.css';
import '@fontsource/pixelify-sans/latin-700.css';
import './ui/app-theme/tokens.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router';
import { registerSW } from 'virtual:pwa-register';
import { router } from './routes';

// Precache the app shell so it opens offline after the first load.
registerSW({ immediate: true });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
