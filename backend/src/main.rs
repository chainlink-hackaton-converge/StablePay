mod config;
mod error;
mod middleware;
mod models;
mod routes;

use axum::Router;
use sqlx::postgres::PgPoolOptions;
use tower_http::cors::CorsLayer;
use tracing_subscriber::EnvFilter;

#[derive(Clone)]
pub struct AppState {
    pub db: sqlx::PgPool,
    pub jwt_secret: String,
    pub cre_webhook_secret: Option<String>,
}

#[tokio::main]
async fn main() {
    dotenvy::dotenv().ok();

    tracing_subscriber::fmt()
        .with_env_filter(EnvFilter::try_from_default_env().unwrap_or_else(|_| "info".into()))
        .init();

    let config = config::Config::from_env();

    let pool = PgPoolOptions::new()
        .max_connections(10)
        .connect(&config.database_url)
        .await
        .expect("Failed to connect to database");

    // Run migrations
    sqlx::migrate!("./migrations")
        .run(&pool)
        .await
        .expect("Failed to run migrations");

    tracing::info!("Database connected and migrations applied");

    let state = AppState {
        db: pool,
        jwt_secret: config.jwt_secret,
        cre_webhook_secret: config.cre_webhook_secret,
    };

    let app = Router::new()
        .nest("/api/auth", routes::auth::router())
        .nest("/api/companies", routes::companies::router())
        .nest("/api/employees", routes::employees::router())
        .nest("/api/payrolls", routes::payrolls::router())
        .nest("/api/invoices", routes::invoices::router())
        .nest("/api/payments", routes::payments::router())
        .layer(CorsLayer::permissive())
        .with_state(state);

    let addr = format!("0.0.0.0:{}", config.port);
    tracing::info!("Starting server on {}", addr);

    let listener = tokio::net::TcpListener::bind(&addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
