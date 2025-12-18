
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // The empty string as third argument allows loading all variables, not just those starting with VITE_
  // Fix: use type assertion to bypass missing property error on Node process object in some environments
  const env = loadEnv(mode, (process as any).cwd(), '');
  
  // Specifically look for API_KEY in order of priority:
  // 1. Vite's loadEnv (picks up .env files)
  // 2. process.env (picks up Vercel/System environment variables)
  const apiKey = env.API_KEY || process.env.API_KEY || "";

  console.log(`--- Build Info ---`);
  console.log(`Mode: ${mode}`);
  console.log(`API_KEY detected in build environment: ${apiKey ? "YES (masked)" : "NO"}`);
  console.log(`------------------`);

  return {
    plugins: [react()],
    define: {
      // This injects the value into the client-side code during the build process
      'process.env.API_KEY': JSON.stringify(apiKey),
    },
    // Ensure the build handles the directory correctly
    base: './',
  };
});
