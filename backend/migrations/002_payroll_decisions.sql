CREATE TABLE payroll_decisions (
    id UUID PRIMARY KEY DEFAULT uuidv7(),
    payroll_id UUID NOT NULL REFERENCES payrolls(id) ON DELETE CASCADE,
    decision VARCHAR(20) NOT NULL CHECK (decision IN ('accepted', 'blocked')),
    reason TEXT NOT NULL,
    spread_bps INTEGER,
    max_deviation_bps INTEGER,
    consensus_rate DOUBLE PRECISION,
    quote_currency VARCHAR(3),
    source_rates JSONB,
    metadata JSONB,
    decided_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payroll_decisions_payroll_id_decided_at
    ON payroll_decisions (payroll_id, decided_at DESC);
