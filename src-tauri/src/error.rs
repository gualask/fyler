#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error(transparent)]
    Anyhow(#[from] anyhow::Error),
}

impl serde::Serialize for AppError {
    fn serialize<S: serde::Serializer>(&self, s: S) -> Result<S::Ok, S::Error> {
        s.serialize_str(&self.to_string())
    }
}
