const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://zdgptafwxowdxmfzwktu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpkZ3B0YWZ3eG93ZHhtZnp3a3R1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3NTIwNDYsImV4cCI6MjA4MDMyODA0Nn0.TjHd3pzrXk1Q4CDZWtmVTBlGik5TYDMrQS9BJEI4pEw';

const supabase = createClient(supabaseUrl, supabaseKey);

const mapping = {
    'smash_winner': '스매시',
    'net_kill': '네트 킬',
    'push_winner': '푸시',
    'drive_winner': '드라이브',
    'drop_winner': '드롭',
    'hairpin_winner': '헤어핀',
    'clear_winner': '클리어',
    'unforced_error': '판단 미스',
    'opponent_winner': '상대 공격성공',
    'service_error': '서비스 실수',
    'net_error': '네트 걸림',
    'out': '라인 아웃',
    'receive_error': '푸시 피습'
};

async function migrate() {
    console.log('Fetching all logs to check point_type...');
    const { data: logs, error } = await supabase
        .from('bd_point_logs')
        .select('id, point_type');

    if (error) {
        console.error('Fetch error:', error);
        return;
    }

    console.log(`Found ${logs.length} logs. Mapping to Korean...`);

    let updatedCount = 0;
    for (const log of logs) {
        const koreanName = mapping[log.point_type];
        if (koreanName) {
            const { error: upErr } = await supabase
                .from('bd_point_logs')
                .update({ point_type: koreanName })
                .eq('id', log.id);

            if (upErr) {
                console.error(`Update error for ${log.id}:`, upErr);
            } else {
                updatedCount++;
            }
        }
    }

    console.log(`Migration complete. Updated ${updatedCount} logs.`);
}

migrate();
