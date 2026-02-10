use axum::{
    extract::{Path, State},
    routing::get,
    Json, Router,
};
use uuid::Uuid;

use crate::{
    error::AppError,
    middleware::AuthClaims,
    models::{CreateInvoiceRequest, Invoice, UpdateInvoiceStatusRequest},
    AppState,
};

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/", get(list_invoices).post(create_invoice))
        .route("/{id}", get(get_invoice).put(update_invoice))
}

async fn list_invoices(
    State(state): State<AppState>,
    claims: AuthClaims,
) -> Result<Json<Vec<Invoice>>, AppError> {
    let company_id = claims
        .company_id
        .ok_or_else(|| AppError::BadRequest("No company associated".into()))?;

    let invoices = sqlx::query_as::<_, Invoice>(
        "SELECT * FROM invoices WHERE company_id = $1 ORDER BY created_at DESC",
    )
    .bind(company_id)
    .fetch_all(&state.db)
    .await?;

    Ok(Json(invoices))
}

async fn create_invoice(
    State(state): State<AppState>,
    claims: AuthClaims,
    Json(req): Json<CreateInvoiceRequest>,
) -> Result<Json<Invoice>, AppError> {
    let company_id = claims
        .company_id
        .ok_or_else(|| AppError::BadRequest("No company associated".into()))?;

    let invoice = sqlx::query_as::<_, Invoice>(
        "INSERT INTO invoices (company_id, payer_address, payee_address, total_amount_usdc, description)
         VALUES ($1, $2, $3, $4, $5) RETURNING *",
    )
    .bind(company_id)
    .bind(&req.payer_address)
    .bind(&req.payee_address)
    .bind(&req.total_amount_usdc)
    .bind(&req.description)
    .fetch_one(&state.db)
    .await?;

    Ok(Json(invoice))
}

async fn get_invoice(
    State(state): State<AppState>,
    claims: AuthClaims,
    Path(id): Path<Uuid>,
) -> Result<Json<Invoice>, AppError> {
    let company_id = claims
        .company_id
        .ok_or_else(|| AppError::BadRequest("No company associated".into()))?;

    let invoice = sqlx::query_as::<_, Invoice>(
        "SELECT * FROM invoices WHERE id = $1 AND company_id = $2",
    )
    .bind(id)
    .bind(company_id)
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::NotFound("Invoice not found".into()))?;

    Ok(Json(invoice))
}

async fn update_invoice(
    State(state): State<AppState>,
    claims: AuthClaims,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateInvoiceStatusRequest>,
) -> Result<Json<Invoice>, AppError> {
    let company_id = claims
        .company_id
        .ok_or_else(|| AppError::BadRequest("No company associated".into()))?;

    // Verify ownership
    let _existing = sqlx::query_as::<_, Invoice>(
        "SELECT * FROM invoices WHERE id = $1 AND company_id = $2",
    )
    .bind(id)
    .bind(company_id)
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::NotFound("Invoice not found".into()))?;

    let invoice = sqlx::query_as::<_, Invoice>(
        "UPDATE invoices SET status = $1, escrow_address = COALESCE($2, escrow_address) WHERE id = $3 RETURNING *",
    )
    .bind(&req.status)
    .bind(&req.escrow_address)
    .bind(id)
    .fetch_one(&state.db)
    .await?;

    Ok(Json(invoice))
}
