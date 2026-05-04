
import { createClient } from '@supabase/supabase-js';

const DEFAULT_URL = 'https://zdgptafwxowdxmfzwktu.supabase.co';
const DEFAULT_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpkZ3B0YWZ3eG93ZHhtZnp3a3R1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3NTIwNDYsImV4cCI6MjA4MDMyODA0Nn0.TjHd3pzrXk1Q4CDZWtmVTBlGik5TYDMrQS9BJEI4pEw';

const supabase = createClient(DEFAULT_URL, DEFAULT_KEY);

async function checkSchema() {
    try {
        const { data: bdm } = await supabase.from('bd_matches').select('*').limit(1);
        console.log("bd_matches columns:", Object.keys(bdm?.[0] || {}));
        
        const { data: prom } = await supabase.from('pro_matches').select('*').limit(1);
        console.log("pro_matches columns:", Object.keys(prom?.[0] || {}));
    } catch (e) {
        console.error(e);
    }
}

checkSchema();
