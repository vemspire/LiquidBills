
import { createClient } from '@supabase/supabase-js';

// Funkcja pomocnicza do bezpiecznego pobierania zmiennych środowiskowych
// Zapobiega błędowi "Cannot read properties of undefined" jeśli import.meta.env nie istnieje
const getEnv = (key: string) => {
  try {
    // @ts-ignore
    return import.meta.env?.[key] || '';
  } catch (e) {
    return '';
  }
};

const supabaseUrl = getEnv('VITE_SUPABASE_URL');
const supabaseAnonKey = getEnv('VITE_SUPABASE_ANON_KEY');

// Aby aplikacja nie "wybuchła" (White Screen of Death) przy starcie, jeśli brakuje kluczy:
// 1. Sprawdzamy czy zmienne są puste.
// 2. Jeśli tak, podajemy "fake" URL, który przejdzie walidację konstruktora, ale zapytanie sieciowe zwróci błąd (który obsłużymy w UI).
// Dzięki temu moduł eksportuje obiekt, a App.tsx może się wyrenderować.

const validUrl = supabaseUrl && supabaseUrl.startsWith('http') 
  ? supabaseUrl 
  : 'https://placeholder.supabase.co';

const validKey = supabaseAnonKey || 'placeholder-key';

export const isSupabaseConfigured = !!supabaseUrl && !!supabaseAnonKey;

export const supabase = createClient(validUrl, validKey);
