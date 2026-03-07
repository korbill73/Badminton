const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://zdgptafwxowdxmfzwktu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpkZ3B0YWZ3eG93ZHhtZnp3a3R1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3NTIwNDYsImV4cCI6MjA4MDMyODA0Nn0.TjHd3pzrXk1Q4CDZWtmVTBlGik5TYDMrQS9BJEI4pEw';

const supabase = createClient(supabaseUrl, supabaseKey);

const categories = [
    // 내 득점 (Winners)
    { name: '스매시', type: 'winner', category_group: 'offensive', is_default: true, display_order: 1 },
    { name: '네트 킬', type: 'winner', category_group: 'offensive', is_default: true, display_order: 2 },
    { name: '푸시', type: 'winner', category_group: 'offensive', is_default: true, display_order: 3 },
    { name: '드라이브', type: 'winner', category_group: 'offensive', is_default: true, display_order: 4 },
    { name: '드롭', type: 'winner', category_group: 'tactical', is_default: true, display_order: 5 },
    { name: '헤어핀', type: 'winner', category_group: 'tactical', is_default: true, display_order: 6 },
    { name: '클리어', type: 'winner', category_group: 'tactical', is_default: true, display_order: 7 },
    { name: '서비스 에이스', type: 'winner', category_group: 'tactical', is_default: true, display_order: 8 },
    { name: '상대 범실', type: 'winner', category_group: 'others', is_default: true, display_order: 9 },

    // 내 실점 (Losses) - 기술적 범실 (My Errors)
    { name: '서비스 실수', type: 'loss', category_group: 'error', is_default: true, display_order: 10 },
    { name: '스매시 실수', type: 'loss', category_group: 'error', is_default: true, display_order: 11 },
    { name: '드롭 실수', type: 'loss', category_group: 'error', is_default: true, display_order: 12 },
    { name: '드라이브 실수', type: 'loss', category_group: 'error', is_default: true, display_order: 13 },
    { name: '헤어핀 실수', type: 'loss', category_group: 'error', is_default: true, display_order: 14 },
    { name: '푸시/킬 실수', type: 'loss', category_group: 'error', is_default: true, display_order: 15 },
    { name: '클리어 실수', type: 'loss', category_group: 'error', is_default: true, display_order: 16 },
    { name: '라인 아웃', type: 'loss', category_group: 'error', is_default: true, display_order: 17 },
    { name: '네트 걸림', type: 'loss', category_group: 'error', is_default: true, display_order: 18 },

    // 내 실점 (Losses) - 전술적/수비 실점 (Defensive/Tactical Losses)
    { name: '판단 미스', type: 'loss', category_group: 'tactical', is_default: true, display_order: 19 },
    { name: '스매시 피습', type: 'loss', category_group: 'others', is_default: true, display_order: 20 },
    { name: '드라이브 피습', type: 'loss', category_group: 'others', is_default: true, display_order: 21 },
    { name: '드롭/푸시 피습', type: 'loss', category_group: 'others', is_default: true, display_order: 22 },
    { name: '상대 공격성공', type: 'loss', category_group: 'others', is_default: true, display_order: 23 }
];

async function seed() {
    console.log('Cleaning up existing categories...');
    const { error: delErr } = await supabase
        .from('bd_point_categories')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (delErr) {
        console.error('Delete error:', delErr);
        return;
    }

    console.log('Inserting professional categories...');
    const { error: insErr } = await supabase
        .from('bd_point_categories')
        .insert(categories);

    if (insErr) {
        console.error('Insert error:', insErr);
        return;
    }

    console.log('Successfully seeded categories.');
}

seed();
