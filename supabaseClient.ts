import { createClient } from '@supabase/supabase-js';

// W wersji mobilnej (.ipa) nie mamy dostępu do zmiennych środowiskowych Netlify w czasie rzeczywistym.
// Klucze zostały wpisane bezpośrednio, aby zapewnić połączenie z bazą z poziomu telefonu.

const supabaseUrl = 'https://vwxkvnvlwugcqppwctff.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ3eGt2bnZsd3VnY3FwcHdjdGZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM4MTI4NjksImV4cCI6MjA3OTM4ODg2OX0.TKZsrQgMsr7B2VLtesd8eZcj9bqd-XgJ2KRv270n7Jo';

export const isSupabaseConfigured = true;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);