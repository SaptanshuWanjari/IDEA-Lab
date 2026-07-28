-- PravahOS PostgreSQL schema for Supabase
-- Run this in the Supabase SQL Editor or via psql to set up the backend tables.

-- Enable UUID extension if not already enabled.
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(320) NOT NULL UNIQUE,
    hashed_password VARCHAR(128) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'department_manager',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);

-- Departments
CREATE TABLE IF NOT EXISTS departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE
);

-- Regulations
CREATE TABLE IF NOT EXISTS regulations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(500),
    source_pdf_url TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'Draft',
    summary TEXT,
    effective_date DATE,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- MAPs (Measurable Action Points)
CREATE TABLE IF NOT EXISTS maps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    regulation_id UUID NOT NULL REFERENCES regulations(id) ON DELETE CASCADE,
    owner_department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    deadline TIMESTAMPTZ,
    status VARCHAR(50) NOT NULL DEFAULT 'Pending',
    approval_state VARCHAR(50) NOT NULL DEFAULT 'Draft',
    confidence FLOAT,
    reasoning TEXT,
    source_clauses TEXT[],
    evidence_required TEXT,
    estimated_days INTEGER DEFAULT 7,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_maps_regulation_id ON maps (regulation_id);
CREATE INDEX IF NOT EXISTS idx_maps_owner_department_id ON maps (owner_department_id);

-- MAP Dependencies
CREATE TABLE IF NOT EXISTS map_dependencies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    map_id UUID NOT NULL REFERENCES maps(id) ON DELETE CASCADE,
    depends_on_map_id UUID NOT NULL REFERENCES maps(id) ON DELETE CASCADE,
    CHECK (map_id != depends_on_map_id)
);

CREATE INDEX IF NOT EXISTS idx_map_dependencies_map_id ON map_dependencies (map_id);
CREATE INDEX IF NOT EXISTS idx_map_dependencies_depends_on_map_id ON map_dependencies (depends_on_map_id);

-- Evidence
CREATE TABLE IF NOT EXISTS evidence (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    map_id UUID NOT NULL REFERENCES maps(id) ON DELETE CASCADE,
    file_url TEXT NOT NULL,
    file_name VARCHAR(500) NOT NULL,
    uploaded_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_evidence_map_id ON evidence (map_id);

-- Audit Log
CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    regulation_id UUID REFERENCES regulations(id) ON DELETE SET NULL,
    map_id UUID REFERENCES maps(id) ON DELETE SET NULL,
    actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(200) NOT NULL,
    payload JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_regulation_id ON audit_log (regulation_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_map_id ON audit_log (map_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_actor_id ON audit_log (actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log (created_at);

-- Seed default departments
INSERT INTO departments (name) VALUES
    ('Compliance'),
    ('Risk'),
    ('IT'),
    ('Operations'),
    ('Audit')
ON CONFLICT (name) DO NOTHING;

-- Trigger function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to tables with TimestampMixin
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'tr_users_updated_at') THEN
        CREATE TRIGGER tr_users_updated_at
        BEFORE UPDATE ON users
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'tr_regulations_updated_at') THEN
        CREATE TRIGGER tr_regulations_updated_at
        BEFORE UPDATE ON regulations
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'tr_maps_updated_at') THEN
        CREATE TRIGGER tr_maps_updated_at
        BEFORE UPDATE ON maps
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'tr_evidence_updated_at') THEN
        CREATE TRIGGER tr_evidence_updated_at
        BEFORE UPDATE ON evidence
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'tr_audit_log_updated_at') THEN
        CREATE TRIGGER tr_audit_log_updated_at
        BEFORE UPDATE ON audit_log
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;
