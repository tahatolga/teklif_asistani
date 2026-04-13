use serde::Serialize;
use thiserror::Error;

#[derive(Debug, Error, Serialize)]
#[serde(tag = "kind", rename_all = "snake_case")]
pub enum AppError {
    #[error("{entity} not found: {id}")]
    NotFound { entity: String, id: String },

    #[error("validation failed on {field}: {message}")]
    Validation { field: String, message: String },

    #[error("conflict: {message}")]
    Conflict { message: String },

    #[error("io error: {message}")]
    Io { message: String },

    #[error("corrupt file at {path}: {reason}")]
    Corrupt { path: String, reason: String },
}

impl From<std::io::Error> for AppError {
    fn from(err: std::io::Error) -> Self {
        AppError::Io { message: err.to_string() }
    }
}

impl From<serde_json::Error> for AppError {
    fn from(err: serde_json::Error) -> Self {
        AppError::Corrupt { path: String::new(), reason: err.to_string() }
    }
}

pub type AppResult<T> = Result<T, AppError>;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn serializes_not_found_with_tag() {
        let err = AppError::NotFound { entity: "customer".into(), id: "abc".into() };
        let json = serde_json::to_string(&err).unwrap();
        assert!(json.contains("\"kind\":\"not_found\""));
        assert!(json.contains("\"entity\":\"customer\""));
    }

    #[test]
    fn from_io_maps_to_io_variant() {
        let io_err = std::io::Error::new(std::io::ErrorKind::Other, "boom");
        let err: AppError = io_err.into();
        assert!(matches!(err, AppError::Io { .. }));
    }
}
