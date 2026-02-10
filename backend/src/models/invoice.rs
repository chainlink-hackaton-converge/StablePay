use chrono::NaiveDateTime;
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Invoice {
    pub id: Uuid,
    pub company_id: Uuid,
    pub payer_address: String,
    pub payee_address: String,
    pub total_amount_usdc: Decimal,
    pub description: Option<String>,
    pub status: String,
    pub escrow_address: Option<String>,
    pub created_at: NaiveDateTime,
}

#[derive(Debug, Deserialize)]
pub struct CreateInvoiceRequest {
    pub payer_address: String,
    pub payee_address: String,
    pub total_amount_usdc: Decimal,
    pub description: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateInvoiceStatusRequest {
    pub status: String,
    pub escrow_address: Option<String>,
}
