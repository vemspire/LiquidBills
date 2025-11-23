import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Kluczowe dla aplikacji mobilnych (Capacitor):
  // Ustawienie base na './' sprawia, że ścieżki do plików są względne.
  // Bez tego aplikacja na iPhonie pokaże biały ekran.
  base: './',
});