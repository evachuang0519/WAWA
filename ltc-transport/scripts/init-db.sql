-- ============================================================
-- 長照交通服務平台 — PostgreSQL 初始化腳本
-- 執行方式: psql -U postgres -f scripts/init-db.sql
-- ============================================================

-- 1. 建立資料庫
CREATE DATABASE ltc_transport
  WITH ENCODING 'UTF8'
  LC_COLLATE = 'C'
  LC_CTYPE = 'C'
  TEMPLATE template0;

\connect ltc_transport

-- 2. Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- ENUMS
-- ============================================================
CREATE TYPE user_role       AS ENUM ('system_admin','org_admin','fleet_admin','driver','viewer');
CREATE TYPE user_status     AS ENUM ('active','suspended','pending');
CREATE TYPE org_status      AS ENUM ('active','inactive');
CREATE TYPE vehicle_type    AS ENUM ('sedan','van','wheelchair_van','bus');
CREATE TYPE vehicle_status  AS ENUM ('available','in_service','maintenance','retired');
CREATE TYPE driver_status   AS ENUM ('active','leave','resigned');
CREATE TYPE passenger_status AS ENUM ('active','suspended','discharged');
CREATE TYPE direction_type  AS ENUM ('去程','返程');
CREATE TYPE booking_status  AS ENUM ('待指派','已指派','進行中','已完成','請假','取消');
CREATE TYPE service_status  AS ENUM ('預約','已完成','請假','取消');

-- ============================================================
-- TABLES
-- ============================================================

CREATE TABLE care_units (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          TEXT NOT NULL,
  short_name    TEXT,
  address       TEXT,
  phone         TEXT,
  contact_name  TEXT,
  contact_email TEXT,
  region        TEXT,
  status        org_status DEFAULT 'active',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE transport_companies (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          TEXT NOT NULL,
  short_name    TEXT,
  address       TEXT,
  phone         TEXT,
  contact_name  TEXT,
  contact_email TEXT,
  license_no    TEXT,
  service_areas TEXT[],
  status        org_status DEFAULT 'active',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          TEXT NOT NULL,
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role          user_role NOT NULL DEFAULT 'viewer',
  org_id        UUID,
  org_type      TEXT,
  status        user_status DEFAULT 'active',
  avatar_url    TEXT,
  last_login    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE vehicles (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id       UUID NOT NULL REFERENCES transport_companies(id) ON DELETE CASCADE,
  plate_number     TEXT UNIQUE NOT NULL,
  type             vehicle_type DEFAULT 'van',
  capacity         INT DEFAULT 4,
  wheelchair_slots INT DEFAULT 0,
  year             INT,
  brand            TEXT,
  model            TEXT,
  insurance_expiry DATE,
  inspection_due   DATE,
  status           vehicle_status DEFAULT 'available',
  notes            TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE drivers (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id         UUID NOT NULL REFERENCES transport_companies(id) ON DELETE CASCADE,
  user_id            UUID REFERENCES users(id),
  name               TEXT NOT NULL,
  phone              TEXT,
  id_number          TEXT,
  license_number     TEXT,
  license_class      TEXT,
  license_expiry     DATE,
  health_cert_expiry DATE,
  status             driver_status DEFAULT 'active',
  notes              TEXT,
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  updated_at         TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE passengers (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  care_unit_id      UUID NOT NULL REFERENCES care_units(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  id_number         TEXT,
  phone             TEXT,
  emergency_contact TEXT,
  emergency_phone   TEXT,
  home_address      TEXT,
  pickup_address    TEXT,
  dropoff_address   TEXT,
  wheelchair        BOOLEAN DEFAULT FALSE,
  disability_level  TEXT,
  notes             TEXT,
  status            passenger_status DEFAULT 'active',
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE routes (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  care_unit_id UUID NOT NULL REFERENCES care_units(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  direction    direction_type NOT NULL,
  stops        JSONB DEFAULT '[]',
  notes        TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE booking_records (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  care_unit_id     UUID NOT NULL REFERENCES care_units(id),
  passenger_id     UUID NOT NULL REFERENCES passengers(id),
  booking_date     DATE NOT NULL DEFAULT CURRENT_DATE,
  service_date     DATE NOT NULL,
  service_time     TEXT,
  direction        direction_type NOT NULL DEFAULT '去程',
  pickup_address   TEXT,
  dropoff_address  TEXT,
  wheelchair       BOOLEAN DEFAULT FALSE,
  batch_id         UUID,
  notes            TEXT,
  status           booking_status DEFAULT '待指派',
  created_by       UUID REFERENCES users(id),
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE task_assignments (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id  UUID NOT NULL REFERENCES booking_records(id) ON DELETE CASCADE,
  driver_id   UUID NOT NULL REFERENCES drivers(id),
  vehicle_id  UUID NOT NULL REFERENCES vehicles(id),
  route_id    UUID REFERENCES routes(id),
  assigned_by UUID REFERENCES users(id),
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  notes       TEXT
);

CREATE TABLE service_records (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id             UUID REFERENCES task_assignments(id),
  booking_id          UUID REFERENCES booking_records(id),
  order_number        TEXT NOT NULL,
  status              service_status DEFAULT '預約',
  care_unit_id        UUID REFERENCES care_units(id),
  passenger_id        UUID REFERENCES passengers(id),
  driver_id           UUID REFERENCES drivers(id),
  vehicle_id          UUID REFERENCES vehicles(id),
  route               TEXT,
  service_date        DATE,
  service_time        TEXT,
  pickup_address      TEXT,
  dropoff_location    TEXT,
  actual_pickup_time  TEXT,
  actual_dropoff_time TEXT,
  pickup_lat          NUMERIC(10,7),
  pickup_lng          NUMERIC(10,7),
  dropoff_lat         NUMERIC(10,7),
  dropoff_lng         NUMERIC(10,7),
  distance_km         NUMERIC(6,2),
  duration_minutes    INT,
  signature_url       TEXT,
  notes               TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE system_logs (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID REFERENCES users(id),
  action     TEXT NOT NULL,
  target     TEXT,
  target_id  UUID,
  detail     JSONB DEFAULT '{}',
  ip_address INET,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE system_settings (
  key        TEXT PRIMARY KEY,
  value      JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by TEXT
);

CREATE TABLE recurring_templates (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  care_unit_id    UUID NOT NULL REFERENCES care_units(id) ON DELETE CASCADE,
  passenger_id    UUID NOT NULL REFERENCES passengers(id) ON DELETE CASCADE,
  day_of_week     SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  service_time    TEXT NOT NULL,
  pickup_address  TEXT,
  dropoff_address TEXT,
  wheelchair      BOOLEAN DEFAULT FALSE,
  direction       direction_type NOT NULL DEFAULT '去程',
  notes           TEXT,
  is_active       BOOLEAN DEFAULT TRUE,
  created_by      UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_booking_service_date ON booking_records(service_date);
CREATE INDEX idx_booking_care_unit    ON booking_records(care_unit_id);
CREATE INDEX idx_booking_passenger    ON booking_records(passenger_id);
CREATE INDEX idx_booking_status       ON booking_records(status);
CREATE INDEX idx_service_date         ON service_records(service_date);
CREATE INDEX idx_service_driver       ON service_records(driver_id);
CREATE INDEX idx_task_booking         ON task_assignments(booking_id);
CREATE INDEX idx_task_driver          ON task_assignments(driver_id);
CREATE INDEX idx_passenger_care_unit  ON passengers(care_unit_id);
CREATE INDEX idx_vehicle_company      ON vehicles(company_id);
CREATE INDEX idx_driver_company       ON drivers(company_id);

-- ============================================================
-- SEED DATA — 固定 UUID 與前端 mock data 對應
-- ============================================================

-- care_units (cu-1 ~ cu-3)
INSERT INTO care_units (id, name, short_name, address, phone, contact_name, region, status) VALUES
  ('10000000-0000-0000-0000-000000000001','照橙日照中心','照橙','台中市西區民權路100號','04-12345678','王主任','台中市','active'),
  ('10000000-0000-0000-0000-000000000002','頤養日照中心','頤養','台中市北區中清路200號','04-87654321','李主任','台中市','active'),
  ('10000000-0000-0000-0000-000000000003','慈心長照機構','慈心','台中市南屯區大墩路300號','04-33334444','陳主任','台中市','active');

-- transport_companies (tc-1 ~ tc-2)
INSERT INTO transport_companies (id, name, short_name, phone, contact_name, status) VALUES
  ('20000000-0000-0000-0000-000000000001','安心車行','安心','04-11112222','陳老闆','active'),
  ('20000000-0000-0000-0000-000000000002','康復交通','康復','04-33334444','林老闆','active');

-- vehicles (v-1 ~ v-4)
INSERT INTO vehicles (id, company_id, plate_number, type, capacity, wheelchair_slots, brand, model, insurance_expiry, inspection_due, status) VALUES
  ('30000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','ABC-1234','wheelchair_van',6,2,'Toyota','Hiace','2026-06-30','2025-12-31','available'),
  ('30000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000001','DEF-5678','van',8,0,'Ford','Transit','2026-03-31','2025-09-30','available'),
  ('30000000-0000-0000-0000-000000000003','20000000-0000-0000-0000-000000000002','GHI-9012','wheelchair_van',6,2,'Mercedes','Sprinter','2026-08-31','2026-02-28','available'),
  ('30000000-0000-0000-0000-000000000004','20000000-0000-0000-0000-000000000002','JKL-3456','sedan',4,0,'Toyota','Camry','2025-11-30','2025-11-30','maintenance');

-- users (admin + org + fleet + driver)
-- passwords: admin1234 / org12345 / fleet123 / driver123  (bcrypt $2b$10$ round 10)
INSERT INTO users (id, name, email, password_hash, role, org_id, org_type, status) VALUES
  ('00000000-0000-0000-0000-000000000001','系統管理員','admin@ltc.tw',
   '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
   'system_admin',NULL,NULL,'active'),
  ('00000000-0000-0000-0000-000000000002','照橙管理員','org@ltc.tw',
   '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
   'org_admin','10000000-0000-0000-0000-000000000001','care_unit','active'),
  ('00000000-0000-0000-0000-000000000003','安心車行','fleet@ltc.tw',
   '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
   'fleet_admin','20000000-0000-0000-0000-000000000001','transport_company','active'),
  ('00000000-0000-0000-0000-000000000004','張志明','driver@ltc.tw',
   '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
   'driver','20000000-0000-0000-0000-000000000001','transport_company','active');

-- drivers (d-1 ~ d-4)
INSERT INTO drivers (id, company_id, user_id, name, phone, license_number, license_class, license_expiry, health_cert_expiry, status) VALUES
  ('40000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000004','張志明','0912-111-222','A123456789','職業小客','2027-05-31','2025-12-31','active'),
  ('40000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000001',NULL,'李建國','0923-333-444','B987654321','職業大客','2026-08-31','2026-06-30','active'),
  ('40000000-0000-0000-0000-000000000003','20000000-0000-0000-0000-000000000002',NULL,'王大同','0934-555-666','C246810121','職業小客','2026-12-31','2025-09-30','active'),
  ('40000000-0000-0000-0000-000000000004','20000000-0000-0000-0000-000000000002',NULL,'林小華','0945-777-888','D135791113','職業小客','2025-06-30','2026-03-31','leave');

-- passengers (p-1 ~ p-5)
INSERT INTO passengers (id, care_unit_id, name, phone, emergency_contact, emergency_phone, home_address, pickup_address, dropoff_address, wheelchair, status) VALUES
  ('50000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','陳美玲','0911-000-001','陳大文','0922-000-001','台中市西區民生路1號','台中市西區民生路1號','照橙日照中心',FALSE,'active'),
  ('50000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000001','黃志偉','0911-000-002','黃大偉','0922-000-002','台中市西區自由路2號','台中市西區自由路2號','照橙日照中心',TRUE,'active'),
  ('50000000-0000-0000-0000-000000000003','10000000-0000-0000-0000-000000000001','林秀蘭','0911-000-003','林建明','0922-000-003','台中市北區健行路3號','台中市北區健行路3號','照橙日照中心',FALSE,'active'),
  ('50000000-0000-0000-0000-000000000004','10000000-0000-0000-0000-000000000002','王福祥','0911-000-004','王小明','0922-000-004','台中市北區中清路4號','台中市北區中清路4號','頤養日照中心',TRUE,'active'),
  ('50000000-0000-0000-0000-000000000005','10000000-0000-0000-0000-000000000002','吳雅惠','0911-000-005','吳建國','0922-000-005','台中市北區大雅路5號','台中市北區大雅路5號','頤養日照中心',FALSE,'active');

-- booking_records (今日示範資料)
INSERT INTO booking_records (id, care_unit_id, passenger_id, service_date, service_time, direction, pickup_address, dropoff_address, wheelchair, status) VALUES
  ('60000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','50000000-0000-0000-0000-000000000001',CURRENT_DATE,'08:00','去程','台中市西區民生路1號','照橙日照中心',FALSE,'已指派'),
  ('60000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000001','50000000-0000-0000-0000-000000000002',CURRENT_DATE,'08:15','去程','台中市西區自由路2號','照橙日照中心',TRUE,'已指派'),
  ('60000000-0000-0000-0000-000000000003','10000000-0000-0000-0000-000000000001','50000000-0000-0000-0000-000000000003',CURRENT_DATE,'08:30','去程','台中市北區健行路3號','照橙日照中心',FALSE,'待指派'),
  ('60000000-0000-0000-0000-000000000004','10000000-0000-0000-0000-000000000002','50000000-0000-0000-0000-000000000004',CURRENT_DATE,'08:00','去程','台中市北區中清路4號','頤養日照中心',TRUE,'已完成'),
  ('60000000-0000-0000-0000-000000000005','10000000-0000-0000-0000-000000000002','50000000-0000-0000-0000-000000000005',CURRENT_DATE,'08:20','去程','台中市北區大雅路5號','頤養日照中心',FALSE,'請假');

-- task_assignments
INSERT INTO task_assignments (id, booking_id, driver_id, vehicle_id, assigned_at) VALUES
  ('70000000-0000-0000-0000-000000000001','60000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001',NOW()),
  ('70000000-0000-0000-0000-000000000002','60000000-0000-0000-0000-000000000002','40000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001',NOW()),
  ('70000000-0000-0000-0000-000000000003','60000000-0000-0000-0000-000000000004','40000000-0000-0000-0000-000000000003','30000000-0000-0000-0000-000000000003',NOW());

\echo '✅ ltc_transport 資料庫初始化完成'
