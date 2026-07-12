-- ============================================
-- 店舗向けAI接客支援システム 初期マイグレーション
-- ============================================

-- ① 店舗マスター
CREATE TABLE stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_code VARCHAR(10) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  area VARCHAR(50)
);
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can view stores" ON stores FOR SELECT USING (true);

-- ② スタッフ
CREATE TABLE staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES stores(id),
  employee_code VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(50) NOT NULL,
  role VARCHAR(20) DEFAULT 'staff'
);
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can view own profile" ON staff FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Staff can update own profile" ON staff FOR UPDATE USING (auth.uid() = id);

-- ③ 顧客受付（メインテーブル）
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_number VARCHAR(50) UNIQUE NOT NULL,
  store_id UUID REFERENCES stores(id),
  staff_id UUID REFERENCES staff(id),
  carrier VARCHAR(50),
  internet_service VARCHAR(100),
  monthly_fee INTEGER,
  family_members INTEGER,
  contract_years VARCHAR(20),
  housing_type VARCHAR(20),
  free_text TEXT,
  status VARCHAR(20) DEFAULT 'surveying',
  ai_result JSONB,
  staff_memo TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can view own store customers" ON customers
  FOR SELECT USING (store_id IN (SELECT store_id FROM staff WHERE id = auth.uid()));
CREATE POLICY "Staff can update own store customers" ON customers
  FOR UPDATE USING (store_id IN (SELECT store_id FROM staff WHERE id = auth.uid()));
CREATE POLICY "Anyone can insert customers" ON customers
  FOR INSERT WITH CHECK (true);

-- ④ テストデータ
INSERT INTO stores (store_code, name, area) VALUES ('012', '見附店', '新潟');
