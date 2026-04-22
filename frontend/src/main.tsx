import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { App } from './app/App';
import { AppProviders } from './app/providers';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProviders>
      <App />
      <ToastContainer position="bottom-right" theme="dark" autoClose={3000} />
    </AppProviders>
  </StrictMode>,
);
