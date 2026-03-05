-- 1. 포인트 카테고리 관리를 위한 테이블 생성
CREATE TABLE IF NOT EXISTS bd_point_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('winner', 'loss')),
  category_group TEXT NOT NULL CHECK (category_group IN ('offensive', 'tactical', 'error', 'others')),
  is_default BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. 기존 하드코딩된 기본 기술들을 초기 데이터로 삽입 (중복 방지)
INSERT INTO bd_point_categories (name, type, category_group, is_default, display_order)
VALUES
  ('스매시', 'winner', 'offensive', true, 1),
  ('네트킬', 'winner', 'offensive', true, 2),
  ('푸시', 'winner', 'offensive', true, 3),
  ('드라이브', 'winner', 'tactical', true, 4),
  ('드롭', 'winner', 'tactical', true, 5),
  ('헤어핀', 'winner', 'tactical', true, 6),
  ('클리어', 'winner', 'tactical', true, 7),
  ('범실', 'loss', 'error', true, 8),
  ('아웃', 'loss', 'error', true, 9),
  ('네트', 'loss', 'error', true, 10),
  ('서브폴트', 'loss', 'error', true, 11),
  ('리시브불안', 'loss', 'others', true, 12),
  ('상대득점', 'loss', 'others', true, 13)
ON CONFLICT (id) DO NOTHING;

-- 3. RLS (Row Level Security) 설정 (모든 사용자 읽기/쓰기 허용 - 필요시 수정 가능)
ALTER TABLE bd_point_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access" ON bd_point_categories
  FOR SELECT USING (true);

CREATE POLICY "Allow public insert access" ON bd_point_categories
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update access" ON bd_point_categories
  FOR UPDATE USING (true);

CREATE POLICY "Allow public delete access" ON bd_point_categories
  FOR DELETE USING (true);
