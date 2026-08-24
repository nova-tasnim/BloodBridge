import React from 'react';

import ReactDOM from
  'react-dom/client';

import './index.css';
import './theme.css';

import 'leaflet/dist/leaflet.css';

import App from './App';

import {
  initializeI18n
} from './i18n';

async function bootstrap() {
  try {
    await initializeI18n();
  } catch (err) {
    console.error(
      'i18n initialization failed:',
      err
    );
  }

  ReactDOM
    .createRoot(
      document.getElementById(
        'root'
      )
    )
    .render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
}

bootstrap();