use chrono::NaiveDateTime;
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Payroll {
    pub id: Uuid,
    pub company_id: Uuid,
    pub status: String,
    pub total_amount_usdc: Option<Decimal>,
    pub fx_rates: Option<serde_json::Value>,
    pub scheduled_at: NaiveDateTime,
    pub executed_at: Option<NaiveDateTime>,
    pub tx_hash: Option<String>,
    pub created_at: NaiveDateTime,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct PayrollEntry {
    pub id: Uuid,
    pub payroll_id: Uuid,
    pub employee_id: Uuid,
    pub amount_local: Decimal,
    pub currency: String,
    pub amount_usdc: Option<Decimal>,
    pub fx_rate: Option<Decimal>,
    pub status: String,
}

#[derive(Debug, Deserialize)]
pub struct CreatePayrollRequest {
    pub scheduled_at: NaiveDateTime,
    pub employee_ids: Vec<Uuid>,
}

#[derive(Debug, Serialize)]
pub struct PayrollWithEntries {
    #[serde(flatten)]
    pub payroll: Payroll,
    pub entries: Vec<PayrollEntry>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct PayrollDecision {
    pub id: Uuid,
    pub payroll_id: Uuid,
    pub decision: String,
    pub reason: String,
    pub spread_bps: Option<i32>,
    pub max_deviation_bps: Option<i32>,
    pub consensus_rate: Option<f64>,
    pub quote_currency: Option<String>,
    pub source_rates: Option<serde_json::Value>,
    pub metadata: Option<serde_json::Value>,
    pub decided_at: NaiveDateTime,
    pub created_at: NaiveDateTime,
}

#[derive(Debug, Deserialize)]
pub struct CreatePayrollDecisionRequest {
    pub decision: String,
    pub reason: String,
    pub spread_bps: Option<i32>,
    pub max_deviation_bps: Option<i32>,
    pub consensus_rate: Option<f64>,
    pub quote_currency: Option<String>,
    pub source_rates: Option<serde_json::Value>,
    pub metadata: Option<serde_json::Value>,
    pub decided_at: Option<NaiveDateTime>,
}

#[derive(Debug, Serialize)]
pub struct CrePendingPayrollsResponse {
    pub payroll_ids: Vec<Uuid>,
}
