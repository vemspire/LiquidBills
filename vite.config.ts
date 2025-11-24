import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Zmiana na '/' jest konieczna dla PWA hostowanego na Vercel/Netlify.
  // './' jest potrzebne tylko dla Capacitor/Cordova (budowanie .ipa).
  // Jeśli chcesz PWA, musi być '/'
  base: '/',
});