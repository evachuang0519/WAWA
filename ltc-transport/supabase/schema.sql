-- ============================================================
-- 長照交通服務平台 Database Schema
-- PostgreSQL / Supabase
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis"; -- For POINT type (optional)

-- ============================================================
-- 1. ENUMS
-- ============================================================
CREATE TYPE user_role AS ENUM ('system_admin', 'org_admin', 'fleet_admin', 'driver', 'viewer');
CREATE TYPE user_status AS ENUM ('active', 'suspended', 'pending');
CREATE TYPE org_status AS ENUM ('active', 'inactive');
CREATE TYPE vehicle_type AS ENUM ('sedan', 'van', 'wheelchair_van', 'bus');
CREATE TYPE vehicle_status AS ENUM ('available', 'in_service', 'maintenance', 'retired');
CREATE TYPE driver_status AS ENUM ('active', 'leave', 'resigned');
CREATE TYPE passenger_status AS ENUM ('active', 'suspended', 'discharged');
CREATE TYPE direction_type AS ENUM ('去程', '回程');
CREATE TYPE booking_status AS ENUM ('待指派', '已指派', '進行中', '已完成', '請假', '取消');
CREATE TYPE service_status AS ENUM ('預約', '已完成', '請假', '取消');

-- ============================================================
-- 2. care_units — 長照單位
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

-- ============================================================
-- 3. transport_companies — 車行
-- ============================================================
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

-- ============================================================
-- 4. users — 帳號
-- ============================================================
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          TEXT NOT NULL,
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role          user_role NOT NULL DEFAULT 'viewer',
  org_id        UUID,  -- FK to care_units OR transport_companies depending on role
  org_type      TEXT,  -- 'care_unit' | 'transport_company'
  status        user_status DEFAULT 'pending',
  avatar_url    TEXT,
  last_login    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 5. vehicles — 車輛
-- ============================================================
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

-- ============================================================
-- 6. drivers — 駕駛
-- ============================================================
CREATE TABLE drivers (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id         UUID NOT NULL REFERENCES transport_companies(id) ON DELETE CASCADE,
  user_id            UUID REFERENCES users(id),  -- linked login account
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

-- ============================================================
-- 7. passengers — 乘客/個案
-- ============================================================
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

-- ============================================================
-- 8. routes — 路線
-- ============================================================
CREATE TABLE routes (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  care_unit_id UUID NOT NULL REFERENCES care_units(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  direction    direction_type NOT NULL,
  stops        JSONB DEFAULT '[]',  -- [{order, name, address, lat, lng}]
  notes        TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 9. booking_records — 訂車紀錄
-- ============================================================
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
  recurrence_rule  TEXT,   -- RRULE string for recurring bookings
  batch_id         UUID,   -- groups batch-created bookings
  notes            TEXT,
  status           booking_status DEFAULT '待指派',
  created_by       UUID REFERENCES users(id),
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 10. task_assignments — 任務指派
-- ============================================================
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

-- ============================================================
-- 11. service_records — 服務明細表
-- ============================================================
CREATE TABLE service_records (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id             UUID REFERENCES task_assignments(id),
  booking_id          UUID REFERENCES booking_records(id),
  order_number        TEXT NOT NULL,       -- 訂單編號(Task ID)
  status              service_status DEFAULT '預約',  -- 訂單狀態
  care_unit_id        UUID REFERENCES care_units(id),
  passenger_id        UUID REFERENCES passengers(id),
  driver_id           UUID REFERENCES drivers(id),
  vehicle_id          UUID REFERENCES vehicles(id),
  route               TEXT,                -- 路線
  service_date        DATE,                -- 搭乘日期
  service_time        TEXT,                -- 搭乘時間
  pickup_address      TEXT,                -- 上車地址
  dropoff_location    TEXT,                -- 下車地點
  actual_pickup_time  TIMETZ,              -- 上車時間
  actual_dropoff_time TIMETZ,              -- 下車時間
  pickup_lat          NUMERIC(10,7),       -- 上車座標緯度
  pickup_lng          NUMERIC(10,7),       -- 上車座標經度
  dropoff_lat         NUMERIC(10,7),       -- 下車座標緯度
  dropoff_lng         NUMERIC(10,7),       -- 下車座標經度
  distance_km         NUMERIC(6,2),        -- 運輸距離(公里)
  duration_minutes    INT,                 -- 運輸時間(分鐘)
  signature_url       TEXT,                -- 簽名圖片 URL
  notes               TEXT,                -- 備註
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 12. system_logs — 操作日誌
-- ============================================================
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

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_booking_service_date   ON booking_records(service_date);
CREATE INDEX idx_booking_care_unit      ON booking_records(care_unit_id);
CREATE INDEX idx_booking_passenger      ON booking_records(passenger_id);
CREATE INDEX idx_booking_status         ON booking_records(status);
CREATE INDEX idx_service_date           ON service_records(service_date);
CREATE INDEX idx_service_care_unit      ON service_records(care_unit_id);
CREATE INDEX idx_service_driver         ON service_records(driver_id);
CREATE INDEX idx_task_booking           ON task_assignments(booking_id);
CREATE INDEX idx_task_driver            ON task_assignments(driver_id);
CREATE INDEX idx_passenger_care_unit    ON passengers(care_unit_id);
CREATE INDEX idx_vehicle_company        ON vehicles(company_id);
CREATE INDEX idx_driver_company         ON drivers(company_id);
CREATE INDEX idx_logs_user              ON system_logs(user_id);
CREATE INDEX idx_logs_created           ON system_logs(created_at);

-- ============================================================
-- SEED DATA — Demo
-- ============================================================
INSERT INTO care_units (id, name, short_name, address, phone, contact_name, region) VALUES
  ('11111111-0000-0000-0000-000000000001', '照橙日照中心', '照橙', '台中市西區民權路100號', '04-12345678', '王主任', '台中市'),
  ('11111111-0000-0000-0000-000000000002', '頤養日照中心', '頤養', '台中市北區中清路200號', '04-87654321', '李主任', '台中市');

INSERT INTO transport_companies (id, name, short_name, phone, contact_name) VALUES
  ('22222222-0000-0000-0000-000000000001', '安心車行', '安心', '04-11112222', '陳老闆'),
  ('22222222-0000-0000-0000-000000000002', '康復交通', '康復', '04-33334444', '林老闆');

-- Admin user (password: admin1234)
INSERT INTO users (id, name, email, password_hash, role, status) VALUES
  ('00000000-0000-0000-0000-000000000001', '系統管理員', 'admin@ltc.tw',
   '$2b$10$rOzXnLYm3mDqGXq1e5wXuO8WcXpY6ZaF9eN3bVm2kJ4hR7tS0aUyi',
   'system_admin', 'active');
