import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // The third parameter '' allows loading all variables, not just those prefixed with VITE_
  const env = loadEnv(mode, (process as any).cwd(), '');
  
  // Priority: 
  // 1. Variable from .env file (via loadEnv)
  // 2. System environment variable (process.env)
  const apiKey = env.API_KEY || process.env.API_KEY;

  return {
    plugins: [react()],
    define: {
      // Direct replacement for process.env.API_KEY in the source code
      'process.env.API_KEY': JSON.stringify(apiKey),
    },
    // Optional: Also expose via import.meta.env
    envPrefix: ['VITE_', 'API_'],
  };
});