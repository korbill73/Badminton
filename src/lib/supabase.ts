import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// 실제 프로젝트의 스크립트에서 추출한 연결 정보입니다
const DEFAULT_URL = 'https://zdgptafwxowdxmfzwktu.supabase.co';
const DEFAULT_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpkZ3B0YWZ3eG93ZHhtZnp3a3R1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3NTIwNDYsImV4cCI6MjA4MDMyODA0Nn0.TjHd3pzrXk1Q4CDZWtmVTBlGik5TYDMrQS9BJEI4pEw';

export const supabase = createClient(
    supabaseUrl || DEFAULT_URL,
    supabaseAnonKey || DEFAULT_KEY
);
