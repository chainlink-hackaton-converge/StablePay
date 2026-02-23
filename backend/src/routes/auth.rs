use axum::{Json, Router, extract::State, routing::post};
use jsonwebtoken::{EncodingKey, Header, encode};
use serde::Deserialize;
use uuid::Uuid;

use crate::{
    AppState,
    error::AppError,
    middleware::AuthClaims,
    models::{AuthResponse, CreateUserRequest, User},
};

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/register", post(register))
        .route("/login", post(login))
}

#[derive(Debug, Deserialize)]
struct LoginRequest {
    wallet_address: String,
}

async fn register(
    State(state): State<AppState>,
    Json(req): Json<CreateUserRequest>,
) -> Result<Json<AuthResponse>, AppError> {
    // Check if wallet already exists
    let existing = sqlx::query_as::<_, User>("SELECT * FROM users WHERE wallet_address = $1")
        .bind(&req.wallet_address)
        .fetch_optional(&state.db)
        .await?;

    if existing.is_some() {
        return Err(AppError::Conflict(
            "Wallet address already registered".into(),
        ));
    }

    let role = req.role.unwrap_or_else(|| "employer".into());

    let user = sqlx::query_as::<_, User>(
        "INSERT INTO users (wallet_address, role) VALUES ($1, $2) RETURNING *",
    )
    .bind(&req.wallet_address)
    .bind(&role)
    .fetch_one(&state.db)
    .await?;

    let token = create_token(&user, None, &state.jwt_secret)?;

    Ok(Json(AuthResponse { token, user }))
}

async fn login(
    State(state): State<AppState>,
    Json(req): Json<LoginRequest>,
) -> Result<Json<AuthResponse>, AppError> {
    let user = sqlx::query_as::<_, User>("SELECT * FROM users WHERE wallet_address = $1")
        .bind(&req.wallet_address)
        .fetch_optional(&state.db)
        .await?
        .ok_or_else(|| AppError::NotFound("User not found".into()))?;

    // Get company if employer
    let company_id = if user.role == "employer" {
        sqlx::query_scalar::<_, Uuid>("SELECT id FROM companies WHERE owner_id = $1")
            .bind(user.id)
            .fetch_optional(&state.db)
            .await?
    } else {
        None
    };

    let token = create_token(&user, company_id, &state.jwt_secret)?;

    Ok(Json(AuthResponse { token, user }))
}

fn create_token(user: &User, company_id: Option<Uuid>, secret: &str) -> Result<String, AppError> {
    let claims = AuthClaims {
        sub: user.id,
        wallet: user.wallet_address.clone(),
        role: user.role.clone(),
        company_id,
        exp: (chrono::Utc::now() + chrono::Duration::hours(24)).timestamp() as usize,
    };

    let token = encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(secret.as_bytes()),
    )?;

    Ok(token)
}
