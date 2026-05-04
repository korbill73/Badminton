const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    try {
        const { data, error } = await supabase.from('bd_players').select('*').limit(1);
        if (error) {
            console.error("Error fetching player:", error.message);
            return;
        }
        if (data && data.length > 0) {
            console.log("Columns:", Object.keys(data[0]));
        } else {
            console.log("No players found to check columns.");
        }
    } catch (e) {
        console.error("Exception:", e.message);
    }
}
check();
