pub struct Config {
    pub database_url: String,
    pub jwt_secret: String,
    pub port: u16,
}

impl Config {
    pub fn from_env() -> Self {
        Self {
            database_url: std::env::var("DATABASE_URL")
                .expect("DATABASE_URL must be set"),
            jwt_secret: std::env::var("JWT_SECRET")
                .unwrap_or_else(|_| "dev-secret-change-in-production".into()),
            port: std::env::var("BACKEND_PORT")
                .unwrap_or_else(|_| "3001".into())
                .parse()
                .expect("BACKEND_PORT must be a valid port number"),
        }
    }
}
