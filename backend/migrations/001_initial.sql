CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_address VARCHAR(42) UNIQUE NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'employer',
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL REFERENCES users(id),
    name VARCHAR(255) NOT NULL,
    vault_address VARCHAR(42),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id),
    user_id UUID REFERENCES users(id),
    wallet_address VARCHAR(42) NOT NULL,
    name VARCHAR(255) NOT NULL,
    salary_amount DECIMAL(18,2) NOT NULL,
    salary_currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE payrolls (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id),
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    total_amount_usdc DECIMAL(18,6),
    fx_rates JSONB,
    scheduled_at TIMESTAMP NOT NULL,
    executed_at TIMESTAMP,
    tx_hash VARCHAR(66),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE payroll_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payroll_id UUID NOT NULL REFERENCES payrolls(id),
    employee_id UUID NOT NULL REFERENCES employees(id),
    amount_local DECIMAL(18,2) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    amount_usdc DECIMAL(18,6),
    fx_rate DECIMAL(18,6),
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
);

CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id),
    payer_address VARCHAR(42) NOT NULL,
    payee_address VARCHAR(42) NOT NULL,
    total_amount_usdc DECIMAL(18,6) NOT NULL,
    description TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'draft',
    escrow_address VARCHAR(42),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE fx_rate_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    base_currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    target_currency VARCHAR(3) NOT NULL,
    rate DECIMAL(18,6) NOT NULL,
    source VARCHAR(100) NOT NULL,
    fetched_at TIMESTAMP NOT NULL DEFAULT NOW()
);
