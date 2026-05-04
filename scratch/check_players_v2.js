const { createClient } = require('@supabase/supabase-js');

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
            // Try to check bd_tournaments too
            const { data: tData } = await supabase.from('bd_tournaments').select('*').limit(1);
            if (tData && tData.length > 0) console.log("Tournament Columns:", Object.keys(tData[0]));
        }
    } catch (e) {
        console.error("Exception:", e.message);
    }
}
check();
