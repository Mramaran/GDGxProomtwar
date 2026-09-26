import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createAiClient } from './ai/client';
import App from './App';
import { firebaseConfig, missingFirebaseKeys } from './config';
import { createFirebaseGenerator } from './lib/firebase';
import { createRateLimiter } from './lib/rateLimiter';
import './styles.css';

const AI_CALLS_PER_MINUTE = 12;

// Created once, outside React, so StrictMode's double render cannot initialise Firebase twice.
const client =
  missingFirebaseKeys(firebaseConfig).length === 0
    ? createAiClient(createFirebaseGenerator(), createRateLimiter(AI_CALLS_PER_MINUTE, 60_000))
    : null;

const root = document.getElementById('root');
if (!root) throw new Error('Root element #root not found');

createRoot(root).render(
  <StrictMode>
    <App client={client} />
  </StrictMode>,
);
