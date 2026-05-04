
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function check() {
    const { data } = await supabase.from('bd_point_logs')
        .select('id, current_score, video_timestamp, created_at')
        .eq('match_id', 'f7b31607-4cf7-48fc-a043-140b0bc57806')
        .eq('set_number', 1)
        .order('created_at', { ascending: true });
    
    console.log(JSON.stringify(data, null, 2));
}
check();
