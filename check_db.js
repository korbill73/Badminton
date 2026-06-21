const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://zdgptafwxowdxmfzwktu.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpkZ3B0YWZ3eG93ZHhtZnp3a3R1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3NTIwNDYsImV4cCI6MjA4MDMyODA0Nn0.TjHd3pzrXk1Q4CDZWtmVTBlGik5TYDMrQS9BJEI4pEw'
);

async function check() {
  const { data: players, error } = await supabase
    .from('bd_players')
    .select('*')
    .eq('name', '박준서');

  if (error) {
    console.error(error);
  } else {
    console.log(players);
  }
}

check();
