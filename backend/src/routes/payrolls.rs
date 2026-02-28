use axum::{
    Json, Router,
    extract::{Path, Query, State},
    http::HeaderMap,
    routing::{get, post},
};
use uuid::Uuid;

use crate::{
    AppState,
    error::AppError,
    middleware::AuthClaims,
    models::{
        CreatePayrollDecisionRequest, CreatePayrollRequest, CrePendingPayrollsResponse, Employee,
        Payroll, PayrollDecision, PayrollEntry, PayrollWithEntries,
    },
};

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/", get(list_payrolls).post(create_payroll))
        .route("/cre/pending", get(list_pending_payrolls_for_cre))
        .route("/{id}", get(get_payroll))
        .route("/{id}/execute", post(update_payroll_status))
        .route("/{id}/decision", post(create_payroll_decision))
        .route("/{id}/decisions", get(list_payroll_decisions))
}

async fn list_payrolls(
    State(state): State<AppState>,
    claims: AuthClaims,
) -> Result<Json<Vec<Payroll>>, AppError> {
    let company_id = claims
        .company_id
        .ok_or_else(|| AppError::BadRequest("No company associated".into()))?;

    let payrolls = sqlx::query_as::<_, Payroll>(
        "SELECT * FROM payrolls WHERE company_id = $1 ORDER BY scheduled_at DESC",
    )
    .bind(company_id)
    .fetch_all(&state.db)
    .await?;

    Ok(Json(payrolls))
}

async fn create_payroll(
    State(state): State<AppState>,
    claims: AuthClaims,
    Json(req): Json<CreatePayrollRequest>,
) -> Result<Json<PayrollWithEntries>, AppError> {
    let company_id = claims
        .company_id
        .ok_or_else(|| AppError::BadRequest("No company associated".into()))?;

    // Start a transaction
    let mut tx = state.db.begin().await?;

    // Create the payroll
    let payroll = sqlx::query_as::<_, Payroll>(
        "INSERT INTO payrolls (company_id, status, scheduled_at) VALUES ($1, 'pending', $2) RETURNING *",
    )
    .bind(company_id)
    .bind(req.scheduled_at)
    .fetch_one(&mut *tx)
    .await?;

    // Create payroll entries for each employee
    let mut entries = Vec::new();
    for employee_id in &req.employee_ids {
        let employee = sqlx::query_as::<_, Employee>(
            "SELECT * FROM employees WHERE id = $1 AND company_id = $2",
        )
        .bind(employee_id)
        .bind(company_id)
        .fetch_optional(&mut *tx)
        .await?
        .ok_or_else(|| AppError::NotFound(format!("Employee {} not found", employee_id)))?;

        let entry = sqlx::query_as::<_, PayrollEntry>(
            "INSERT INTO payroll_entries (payroll_id, employee_id, amount_local, currency, status)
             VALUES ($1, $2, $3, $4, 'pending') RETURNING *",
        )
        .bind(payroll.id)
        .bind(employee.id)
        .bind(employee.salary_amount)
        .bind(&employee.salary_currency)
        .fetch_one(&mut *tx)
        .await?;

        entries.push(entry);
    }

    tx.commit().await?;

    Ok(Json(PayrollWithEntries { payroll, entries }))
}

async fn get_payroll(
    State(state): State<AppState>,
    claims: AuthClaims,
    Path(id): Path<Uuid>,
) -> Result<Json<PayrollWithEntries>, AppError> {
    let company_id = claims
        .company_id
        .ok_or_else(|| AppError::BadRequest("No company associated".into()))?;

    let payroll =
        sqlx::query_as::<_, Payroll>("SELECT * FROM payrolls WHERE id = $1 AND company_id = $2")
            .bind(id)
            .bind(company_id)
            .fetch_optional(&state.db)
            .await?
            .ok_or_else(|| AppError::NotFound("Payroll not found".into()))?;

    let entries =
        sqlx::query_as::<_, PayrollEntry>("SELECT * FROM payroll_entries WHERE payroll_id = $1")
            .bind(id)
            .fetch_all(&state.db)
            .await?;

    Ok(Json(PayrollWithEntries { payroll, entries }))
}

#[derive(serde::Deserialize)]
struct UpdatePayrollStatusRequest {
    status: String,
    tx_hash: Option<String>,
    total_amount_usdc: Option<rust_decimal::Decimal>,
    fx_rates: Option<serde_json::Value>,
}

async fn update_payroll_status(
    State(state): State<AppState>,
    claims: AuthClaims,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdatePayrollStatusRequest>,
) -> Result<Json<Payroll>, AppError> {
    let company_id = claims
        .company_id
        .ok_or_else(|| AppError::BadRequest("No company associated".into()))?;

    // Verify the payroll belongs to the company
    let _existing =
        sqlx::query_as::<_, Payroll>("SELECT * FROM payrolls WHERE id = $1 AND company_id = $2")
            .bind(id)
            .bind(company_id)
            .fetch_optional(&state.db)
            .await?
            .ok_or_else(|| AppError::NotFound("Payroll not found".into()))?;

    let executed_at = if req.status == "completed" {
        Some(chrono::Utc::now().naive_utc())
    } else {
        None
    };

    let payroll = sqlx::query_as::<_, Payroll>(
        "UPDATE payrolls SET status = $1, tx_hash = $2, total_amount_usdc = $3, fx_rates = $4, executed_at = $5
         WHERE id = $6 RETURNING *",
    )
    .bind(&req.status)
    .bind(&req.tx_hash)
    .bind(&req.total_amount_usdc)
    .bind(&req.fx_rates)
    .bind(executed_at)
    .bind(id)
    .fetch_one(&state.db)
    .await?;

    Ok(Json(payroll))
}

#[derive(serde::Deserialize)]
struct CrePendingQuery {
    limit: Option<i64>,
}

async fn list_pending_payrolls_for_cre(
    State(state): State<AppState>,
    headers: HeaderMap,
    Query(query): Query<CrePendingQuery>,
) -> Result<Json<CrePendingPayrollsResponse>, AppError> {
    verify_cre_webhook_secret(&state, &headers)?;

    let limit = query.limit.unwrap_or(25).clamp(1, 200);
    let payroll_ids = sqlx::query_scalar::<_, Uuid>(
        "SELECT id FROM payrolls WHERE status = 'pending' ORDER BY scheduled_at ASC LIMIT $1",
    )
    .bind(limit)
    .fetch_all(&state.db)
    .await?;

    Ok(Json(CrePendingPayrollsResponse { payroll_ids }))
}

async fn create_payroll_decision(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(id): Path<Uuid>,
    Json(req): Json<CreatePayrollDecisionRequest>,
) -> Result<Json<PayrollDecision>, AppError> {
    verify_cre_webhook_secret(&state, &headers)?;

    let normalized_decision = req.decision.trim().to_lowercase();
    if normalized_decision != "accepted" && normalized_decision != "blocked" {
        return Err(AppError::BadRequest(
            "decision must be either 'accepted' or 'blocked'".into(),
        ));
    }

    let reason = req.reason.trim();
    if reason.is_empty() {
        return Err(AppError::BadRequest("reason is required".into()));
    }

    let payroll_exists = sqlx::query_scalar::<_, bool>(
        "SELECT EXISTS (SELECT 1 FROM payrolls WHERE id = $1)",
    )
    .bind(id)
    .fetch_one(&state.db)
    .await?;
    if !payroll_exists {
        return Err(AppError::NotFound("Payroll not found".into()));
    }

    let decision = sqlx::query_as::<_, PayrollDecision>(
        "INSERT INTO payroll_decisions (
            payroll_id, decision, reason, spread_bps, max_deviation_bps, consensus_rate,
            quote_currency, source_rates, metadata, decided_at
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING *",
    )
    .bind(id)
    .bind(&normalized_decision)
    .bind(reason)
    .bind(req.spread_bps)
    .bind(req.max_deviation_bps)
    .bind(req.consensus_rate)
    .bind(req.quote_currency.as_deref())
    .bind(req.source_rates)
    .bind(req.metadata)
    .bind(req.decided_at.unwrap_or_else(|| chrono::Utc::now().naive_utc()))
    .fetch_one(&state.db)
    .await?;

    Ok(Json(decision))
}

async fn list_payroll_decisions(
    State(state): State<AppState>,
    claims: AuthClaims,
    Path(id): Path<Uuid>,
) -> Result<Json<Vec<PayrollDecision>>, AppError> {
    let company_id = claims
        .company_id
        .ok_or_else(|| AppError::BadRequest("No company associated".into()))?;

    let payroll_exists = sqlx::query_scalar::<_, bool>(
        "SELECT EXISTS (SELECT 1 FROM payrolls WHERE id = $1 AND company_id = $2)",
    )
    .bind(id)
    .bind(company_id)
    .fetch_one(&state.db)
    .await?;
    if !payroll_exists {
        return Err(AppError::NotFound("Payroll not found".into()));
    }

    let decisions = sqlx::query_as::<_, PayrollDecision>(
        "SELECT * FROM payroll_decisions WHERE payroll_id = $1 ORDER BY decided_at DESC",
    )
    .bind(id)
    .fetch_all(&state.db)
    .await?;

    Ok(Json(decisions))
}

fn verify_cre_webhook_secret(state: &AppState, headers: &HeaderMap) -> Result<(), AppError> {
    let configured_secret = state
        .cre_webhook_secret
        .as_deref()
        .ok_or_else(|| AppError::Unauthorized("CRE webhook secret is not configured".into()))?;

    let provided_secret = headers
        .get("x-cre-webhook-secret")
        .and_then(|v| v.to_str().ok())
        .map(str::trim)
        .ok_or_else(|| AppError::Unauthorized("Missing x-cre-webhook-secret header".into()))?;

    if provided_secret != configured_secret {
        return Err(AppError::Unauthorized(
            "Invalid x-cre-webhook-secret header".into(),
        ));
    }

    Ok(())
}
