use axum::{
    extract::{Path, State},
    routing::get,
    Json, Router,
};
use uuid::Uuid;

use crate::{
    error::AppError,
    middleware::AuthClaims,
    models::{Company, CreateCompanyRequest, UpdateCompanyRequest},
    AppState,
};

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/", get(list_companies).post(create_company))
        .route("/{id}", get(get_company).put(update_company))
}

async fn list_companies(
    State(state): State<AppState>,
    claims: AuthClaims,
) -> Result<Json<Vec<Company>>, AppError> {
    let companies = sqlx::query_as::<_, Company>(
        "SELECT * FROM companies WHERE owner_id = $1 ORDER BY created_at DESC",
    )
    .bind(claims.sub)
    .fetch_all(&state.db)
    .await?;

    Ok(Json(companies))
}

async fn create_company(
    State(state): State<AppState>,
    claims: AuthClaims,
    Json(req): Json<CreateCompanyRequest>,
) -> Result<Json<Company>, AppError> {
    let company = sqlx::query_as::<_, Company>(
        "INSERT INTO companies (owner_id, name, vault_address) VALUES ($1, $2, $3) RETURNING *",
    )
    .bind(claims.sub)
    .bind(&req.name)
    .bind(&req.vault_address)
    .fetch_one(&state.db)
    .await?;

    Ok(Json(company))
}

async fn get_company(
    State(state): State<AppState>,
    claims: AuthClaims,
    Path(id): Path<Uuid>,
) -> Result<Json<Company>, AppError> {
    let company = sqlx::query_as::<_, Company>(
        "SELECT * FROM companies WHERE id = $1 AND owner_id = $2",
    )
    .bind(id)
    .bind(claims.sub)
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::NotFound("Company not found".into()))?;

    Ok(Json(company))
}

async fn update_company(
    State(state): State<AppState>,
    claims: AuthClaims,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateCompanyRequest>,
) -> Result<Json<Company>, AppError> {
    // Verify ownership
    let existing = sqlx::query_as::<_, Company>(
        "SELECT * FROM companies WHERE id = $1 AND owner_id = $2",
    )
    .bind(id)
    .bind(claims.sub)
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::NotFound("Company not found".into()))?;

    let name = req.name.unwrap_or(existing.name);
    let vault_address = req.vault_address.or(existing.vault_address);

    let company = sqlx::query_as::<_, Company>(
        "UPDATE companies SET name = $1, vault_address = $2 WHERE id = $3 RETURNING *",
    )
    .bind(&name)
    .bind(&vault_address)
    .bind(id)
    .fetch_one(&state.db)
    .await?;

    Ok(Json(company))
}
