use chrono::NaiveDateTime;
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Employee {
    pub id: Uuid,
    pub company_id: Uuid,
    pub user_id: Option<Uuid>,
    pub wallet_address: String,
    pub name: String,
    pub salary_amount: Decimal,
    pub salary_currency: String,
    pub created_at: NaiveDateTime,
}

#[derive(Debug, Deserialize)]
pub struct CreateEmployeeRequest {
    pub wallet_address: String,
    pub name: String,
    pub salary_amount: Decimal,
    pub salary_currency: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateEmployeeRequest {
    pub wallet_address: Option<String>,
    pub name: Option<String>,
    pub salary_amount: Option<Decimal>,
    pub salary_currency: Option<String>,
}
