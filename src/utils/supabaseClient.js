import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export let supabase = null;

if (supabaseUrl && supabaseAnonKey) {
  try {
    // Si l'URL n'a pas de protocole, on la formate comme sous-domaine Supabase standard
    const resolvedUrl = (supabaseUrl.startsWith('http://') || supabaseUrl.startsWith('https://'))
      ? supabaseUrl
      : `https://${supabaseUrl}.supabase.co`;

    supabase = createClient(resolvedUrl, supabaseAnonKey);
    console.log("⚡ Supabase Client connecté à :", resolvedUrl);
  } catch (err) {
    console.error("❌ Échec d'initialisation du client Supabase :", err);
  }
} else {
  console.warn(
    "⚠️ Les variables d'environnement Supabase (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY) sont manquantes. Le simulateur local reste actif."
  );
}
