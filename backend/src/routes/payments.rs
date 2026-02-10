use axum::{
    extract::{Query, State},
    routing::get,
    Json, Router,
};
use serde::Deserialize;
use uuid::Uuid;

use crate::{
    error::AppError,
    middleware::AuthClaims,
    models::PayrollEntry,
    AppState,
};

pub fn router() -> Router<AppState> {
    Router::new().route("/", get(list_payments))
}

#[derive(Debug, Deserialize)]
struct PaymentQuery {
    employee_id: Option<Uuid>,
    payroll_id: Option<Uuid>,
}

async fn list_payments(
    State(state): State<AppState>,
    claims: AuthClaims,
    Query(query): Query<PaymentQuery>,
) -> Result<Json<Vec<PayrollEntry>>, AppError> {
    let entries = if let Some(employee_id) = query.employee_id {
        sqlx::query_as::<_, PayrollEntry>(
            "SELECT pe.* FROM payroll_entries pe
             JOIN payrolls p ON pe.payroll_id = p.id
             WHERE pe.employee_id = $1
             ORDER BY p.scheduled_at DESC",
        )
        .bind(employee_id)
        .fetch_all(&state.db)
        .await?
    } else if let Some(payroll_id) = query.payroll_id {
        let company_id = claims
            .company_id
            .ok_or_else(|| AppError::BadRequest("No company associated".into()))?;

        sqlx::query_as::<_, PayrollEntry>(
            "SELECT pe.* FROM payroll_entries pe
             JOIN payrolls p ON pe.payroll_id = p.id
             WHERE pe.payroll_id = $1 AND p.company_id = $2",
        )
        .bind(payroll_id)
        .bind(company_id)
        .fetch_all(&state.db)
        .await?
    } else {
        let company_id = claims
            .company_id
            .ok_or_else(|| AppError::BadRequest("No company associated".into()))?;

        sqlx::query_as::<_, PayrollEntry>(
            "SELECT pe.* FROM payroll_entries pe
             JOIN payrolls p ON pe.payroll_id = p.id
             WHERE p.company_id = $1
             ORDER BY p.scheduled_at DESC
             LIMIT 100",
        )
        .bind(company_id)
        .fetch_all(&state.db)
        .await?
    };

    Ok(Json(entries))
}
