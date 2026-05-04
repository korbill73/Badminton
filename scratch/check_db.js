import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Find .env file
const envPath = 'c:/Work/Badminton Performance Analytics System/.env.local';
const envConfig = dotenv.parse(fs.readFileSync(envPath));

const supabase = createClient(envConfig.NEXT_PUBLIC_SUPABASE_URL, envConfig.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function check() {
  const { data, error } = await supabase.from('pro_notes').select('*').limit(1);
  console.log('Sample Data:', data);
  console.log('Error (if any):', error);
}

check();
