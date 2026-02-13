-- Manipula Platform Database Initialization Script
-- PostgreSQL 15+

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create custom types
DO $$ BEGIN
    CREATE TYPE project_phase AS ENUM (
        'specification',
        'backend_development',
        'frontend_development',
        'qa_testing',
        'deployment',
        'completed',
        'failed'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE execution_status AS ENUM (
        'pending',
        'running',
        'completed',
        'failed',
        'cancelled',
        'retrying'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE agent_type AS ENUM (
        'idea-spec',
        'backend-gen',
        'frontend-gen',
        'qa-validation',
        'devops'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    api_key VARCHAR(255) UNIQUE,
    tier VARCHAR(50) DEFAULT 'free',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP WITH TIME ZONE
);

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
    id VARCHAR(100) PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    phase project_phase NOT NULL DEFAULT 'specification',
    version INTEGER NOT NULL DEFAULT 1,
    state JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    total_cost_usd DECIMAL(10, 2) DEFAULT 0
);

-- Agent executions table
CREATE TABLE IF NOT EXISTS agent_executions (
    id VARCHAR(100) PRIMARY KEY,
    project_id VARCHAR(100) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    agent_type agent_type NOT NULL,
    status execution_status NOT NULL DEFAULT 'pending',
    input JSONB NOT NULL,
    output JSONB,
    error TEXT,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    retries INTEGER DEFAULT 0,
    cost_usd DECIMAL(10, 2) DEFAULT 0
);

-- Project state versions (for rollback)
CREATE TABLE IF NOT EXISTS project_state_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id VARCHAR(100) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    version INTEGER NOT NULL,
    state JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(project_id, version)
);

-- Artifacts table
CREATE TABLE IF NOT EXISTS artifacts (
    id VARCHAR(100) PRIMARY KEY,
    project_id VARCHAR(100) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    path VARCHAR(500) NOT NULL,
    content TEXT,
    size_bytes INTEGER,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Webhooks table
CREATE TABLE IF NOT EXISTS webhooks (
    id VARCHAR(100) PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    url VARCHAR(500) NOT NULL,
    events TEXT[] NOT NULL,
    secret VARCHAR(255) NOT NULL,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_triggered_at TIMESTAMP WITH TIME ZONE
);

-- Webhook deliveries table
CREATE TABLE IF NOT EXISTS webhook_deliveries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    webhook_id VARCHAR(100) NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
    event VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    response_status INTEGER,
    response_body TEXT,
    delivered_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    success BOOLEAN
);

-- Audit logs table
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    project_id VARCHAR(100) REFERENCES projects(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id VARCHAR(100),
    changes JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- API usage tracking table
CREATE TABLE IF NOT EXISTS api_usage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    endpoint VARCHAR(255) NOT NULL,
    method VARCHAR(10) NOT NULL,
    status_code INTEGER NOT NULL,
    response_time_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_phase ON projects(phase);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_executions_project_id ON agent_executions(project_id);
CREATE INDEX IF NOT EXISTS idx_agent_executions_status ON agent_executions(status);
CREATE INDEX IF NOT EXISTS idx_agent_executions_agent_type ON agent_executions(agent_type);
CREATE INDEX IF NOT EXISTS idx_project_state_versions_project_id ON project_state_versions(project_id, version DESC);
CREATE INDEX IF NOT EXISTS idx_artifacts_project_id ON artifacts(project_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_user_id ON webhooks(user_id);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_webhook_id ON webhook_deliveries(webhook_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_project_id ON audit_logs(project_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_usage_user_id ON api_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_created_at ON api_usage(created_at DESC);

-- Create full-text search index for projects
CREATE INDEX IF NOT EXISTS idx_projects_search ON projects USING gin(
    to_tsvector('english', name || ' ' || COALESCE(description, ''))
);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_projects_updated_at ON projects;
CREATE TRIGGER update_projects_updated_at
    BEFORE UPDATE ON projects
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to save project state version on update
CREATE OR REPLACE FUNCTION save_project_state_version()
RETURNS TRIGGER AS $$
BEGIN
    -- Only save if state actually changed
    IF NEW.state IS DISTINCT FROM OLD.state THEN
        INSERT INTO project_state_versions (project_id, version, state)
        VALUES (NEW.id, NEW.version, NEW.state);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-save state versions
DROP TRIGGER IF EXISTS save_project_state_version_trigger ON projects;
CREATE TRIGGER save_project_state_version_trigger
    AFTER UPDATE ON projects
    FOR EACH ROW
    EXECUTE FUNCTION save_project_state_version();

-- Insert default admin user (password: admin123 - CHANGE IN PRODUCTION!)
-- Password hash for 'admin123' using bcrypt
INSERT INTO users (email, name, password_hash, api_key, tier)
VALUES (
    'admin@manipula.dev',
    'Admin User',
    '$2b$10$rKzE5Y7VQq3VF9vx.XK3N.8YvZ/dJpqVZxqEf5LX6lZQHYKMKCMNK',
    'mani_dev_' || substring(md5(random()::text) from 1 for 32),
    'enterprise'
)
ON CONFLICT (email) DO NOTHING;

-- Grant necessary permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO manipula;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO manipula;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO manipula;

-- Create view for project statistics
CREATE OR REPLACE VIEW project_statistics AS
SELECT 
    p.id,
    p.name,
    p.phase,
    p.created_at,
    p.total_cost_usd,
    COUNT(ae.id) as total_executions,
    COUNT(CASE WHEN ae.status = 'completed' THEN 1 END) as completed_executions,
    COUNT(CASE WHEN ae.status = 'failed' THEN 1 END) as failed_executions,
    AVG(EXTRACT(EPOCH FROM (ae.completed_at - ae.started_at))/60) as avg_execution_time_minutes
FROM projects p
LEFT JOIN agent_executions ae ON p.id = ae.project_id
GROUP BY p.id, p.name, p.phase, p.created_at, p.total_cost_usd;

COMMENT ON DATABASE manipula IS 'Manipula Platform - Agentic AI for Software Development';
