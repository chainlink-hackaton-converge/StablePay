use axum::{
    extract::{Path, State},
    routing::get,
    Json, Router,
};
use uuid::Uuid;

use crate::{
    error::AppError,
    middleware::AuthClaims,
    models::{CreateEmployeeRequest, Employee, UpdateEmployeeRequest},
    AppState,
};

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/", get(list_employees).post(create_employee))
        .route("/{id}", get(get_employee).put(update_employee).delete(delete_employee))
}

async fn list_employees(
    State(state): State<AppState>,
    claims: AuthClaims,
) -> Result<Json<Vec<Employee>>, AppError> {
    let company_id = claims
        .company_id
        .ok_or_else(|| AppError::BadRequest("No company associated".into()))?;

    let employees = sqlx::query_as::<_, Employee>(
        "SELECT * FROM employees WHERE company_id = $1 ORDER BY name ASC",
    )
    .bind(company_id)
    .fetch_all(&state.db)
    .await?;

    Ok(Json(employees))
}

async fn create_employee(
    State(state): State<AppState>,
    claims: AuthClaims,
    Json(req): Json<CreateEmployeeRequest>,
) -> Result<Json<Employee>, AppError> {
    let company_id = claims
        .company_id
        .ok_or_else(|| AppError::BadRequest("No company associated".into()))?;

    let currency = req.salary_currency.unwrap_or_else(|| "USD".into());
    let linked_user_id = sqlx::query_scalar::<_, Uuid>(
        "SELECT id FROM users WHERE LOWER(wallet_address) = LOWER($1)",
    )
    .bind(&req.wallet_address)
    .fetch_optional(&state.db)
    .await?;

    let employee = sqlx::query_as::<_, Employee>(
        "INSERT INTO employees (company_id, user_id, wallet_address, name, salary_amount, salary_currency)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
    )
    .bind(company_id)
    .bind(linked_user_id)
    .bind(&req.wallet_address)
    .bind(&req.name)
    .bind(&req.salary_amount)
    .bind(&currency)
    .fetch_one(&state.db)
    .await?;

    Ok(Json(employee))
}

async fn get_employee(
    State(state): State<AppState>,
    claims: AuthClaims,
    Path(id): Path<Uuid>,
) -> Result<Json<Employee>, AppError> {
    let company_id = claims
        .company_id
        .ok_or_else(|| AppError::BadRequest("No company associated".into()))?;

    let employee = sqlx::query_as::<_, Employee>(
        "SELECT * FROM employees WHERE id = $1 AND company_id = $2",
    )
    .bind(id)
    .bind(company_id)
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::NotFound("Employee not found".into()))?;

    Ok(Json(employee))
}

async fn update_employee(
    State(state): State<AppState>,
    claims: AuthClaims,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateEmployeeRequest>,
) -> Result<Json<Employee>, AppError> {
    let company_id = claims
        .company_id
        .ok_or_else(|| AppError::BadRequest("No company associated".into()))?;

    let existing = sqlx::query_as::<_, Employee>(
        "SELECT * FROM employees WHERE id = $1 AND company_id = $2",
    )
    .bind(id)
    .bind(company_id)
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::NotFound("Employee not found".into()))?;

    let name = req.name.unwrap_or(existing.name);
    let wallet = req.wallet_address.unwrap_or(existing.wallet_address);
    let salary = req.salary_amount.unwrap_or(existing.salary_amount);
    let currency = req.salary_currency.unwrap_or(existing.salary_currency);

    let employee = sqlx::query_as::<_, Employee>(
        "UPDATE employees SET name = $1, wallet_address = $2, salary_amount = $3, salary_currency = $4
         WHERE id = $5 RETURNING *",
    )
    .bind(&name)
    .bind(&wallet)
    .bind(&salary)
    .bind(&currency)
    .bind(id)
    .fetch_one(&state.db)
    .await?;

    Ok(Json(employee))
}

async fn delete_employee(
    State(state): State<AppState>,
    claims: AuthClaims,
    Path(id): Path<Uuid>,
) -> Result<Json<serde_json::Value>, AppError> {
    let company_id = claims
        .company_id
        .ok_or_else(|| AppError::BadRequest("No company associated".into()))?;

    let result = sqlx::query("DELETE FROM employees WHERE id = $1 AND company_id = $2")
        .bind(id)
        .bind(company_id)
        .execute(&state.db)
        .await?;

    if result.rows_affected() == 0 {
        return Err(AppError::NotFound("Employee not found".into()));
    }

    Ok(Json(serde_json::json!({ "deleted": true })))
}
