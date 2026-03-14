import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    // Replaces process.env.API_KEY with the value found in the build environment
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY),
  },
});