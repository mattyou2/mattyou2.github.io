-- ============================================================
-- MIJNWINKEL — Supabase Database Setup
-- Voer dit uit in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================


-- ===== 1. PRODUCTEN TABEL =====
CREATE TABLE IF NOT EXISTS products (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  description TEXT,
  price       NUMERIC(10,2) NOT NULL DEFAULT 0,
  category    TEXT,
  image_url   TEXT,
  stock       INTEGER,          -- NULL = onbeperkt
  active      BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-update tijdstempel
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ===== 2. BESTELLINGEN TABEL =====
CREATE TABLE IF NOT EXISTS orders (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name    TEXT NOT NULL,
  customer_email   TEXT NOT NULL,
  customer_address TEXT,
  items            JSONB NOT NULL DEFAULT '[]',
  total            NUMERIC(10,2) NOT NULL DEFAULT 0,
  status           TEXT NOT NULL DEFAULT 'nieuw',
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ===== 3. INSTELLINGEN TABEL =====
CREATE TABLE IF NOT EXISTS settings (
  id          INTEGER PRIMARY KEY DEFAULT 1,
  store_name  TEXT DEFAULT 'MijnWinkel',
  description TEXT,
  email       TEXT,
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Eerste rij invoegen
INSERT INTO settings (id, store_name) VALUES (1, 'MijnWinkel')
ON CONFLICT (id) DO NOTHING;


-- ============================================================
-- ROW LEVEL SECURITY (RLS) — BEVEILIGING
-- Dit zorgt dat klanten NIET kunnen bewerken/verwijderen
-- ============================================================

-- Zet RLS aan
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders   ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;


-- ===== PRODUCTEN POLICIES =====

-- Iedereen kan actieve producten LEZEN
CREATE POLICY "Producten publiek lezen"
  ON products FOR SELECT
  USING (active = true);

-- Alleen ingelogde beheerder kan ALLES zien (ook inactieve)
CREATE POLICY "Beheerder leest alle producten"
  ON products FOR SELECT
  TO authenticated
  USING (true);

-- Alleen ingelogde beheerder kan producten TOEVOEGEN
CREATE POLICY "Beheerder voegt producten toe"
  ON products FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Alleen ingelogde beheerder kan producten BEWERKEN
CREATE POLICY "Beheerder bewerkt producten"
  ON products FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Alleen ingelogde beheerder kan producten VERWIJDEREN
CREATE POLICY "Beheerder verwijdert producten"
  ON products FOR DELETE
  TO authenticated
  USING (true);


-- ===== BESTELLINGEN POLICIES =====

-- Iedereen (klant) kan een bestelling PLAATSEN
CREATE POLICY "Klant plaatst bestelling"
  ON orders FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Alleen ingelogde beheerder kan bestellingen LEZEN
CREATE POLICY "Beheerder leest bestellingen"
  ON orders FOR SELECT
  TO authenticated
  USING (true);

-- Alleen ingelogde beheerder kan bestellingen BIJWERKEN (status wijzigen)
CREATE POLICY "Beheerder bewerkt bestelling"
  ON orders FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);


-- ===== INSTELLINGEN POLICIES =====

-- Iedereen kan instellingen LEZEN (winkelnam etc.)
CREATE POLICY "Instellingen publiek lezen"
  ON settings FOR SELECT
  USING (true);

-- Alleen ingelogde beheerder kan instellingen BEWERKEN
CREATE POLICY "Beheerder bewerkt instellingen"
  ON settings FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);


-- ============================================================
-- REALTIME — live product updates
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE products;


-- ============================================================
-- VOORBEELDDATA — Verwijder dit na testen!
-- ============================================================
INSERT INTO products (name, description, price, category, active) VALUES
  ('Voorbeeld Product 1', 'Dit is een beschrijving van het eerste product.', 29.99, 'Kleding', true),
  ('Voorbeeld Product 2', 'Een geweldig product met veel kwaliteit.', 49.95, 'Elektronica', true),
  ('Voorbeeld Product 3', 'Beschrijving van het derde product.', 14.50, 'Accessoires', true);
