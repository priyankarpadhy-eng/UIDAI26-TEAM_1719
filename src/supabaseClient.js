import { createClient } from '@supabase/supabase-js';

// Load environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let supabaseInstance;

if (supabaseUrl && supabaseAnonKey) {
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
} else {
    console.warn("Supabase credentials missing! Check your .env file. Running in Local Mode.");
    // Mock client to prevent crashes
    supabaseInstance = {
        from: () => ({
            select: async () => ({ error: { message: "Supabase credentials missing" }, data: null }),
            upsert: async () => ({ error: { message: "Supabase credentials missing" }, data: null }),
            insert: async () => ({ error: { message: "Supabase credentials missing" }, data: null }),
        }),
    };
}

export const supabase = supabaseInstance;
