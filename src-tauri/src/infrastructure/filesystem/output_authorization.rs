use std::collections::HashSet;
use std::sync::{Arc, Mutex, MutexGuard};

/// One-shot output paths granted by a native save dialog.
///
/// The authorization is deliberately scoped to an exact path string and consumed before an
/// export starts.  Keeping this state in filesystem infrastructure lets future export workflows
/// share the same boundary without depending on a command adapter.
#[derive(Clone, Default)]
pub(crate) struct OutputPathAuthorizations {
    paths: Arc<Mutex<HashSet<String>>>,
}

/// Exact directories selected through the native batch destination picker.
#[derive(Clone, Default)]
pub(crate) struct BatchDestinationAuthorizations {
    paths: Arc<Mutex<HashSet<String>>>,
}

impl BatchDestinationAuthorizations {
    fn paths(&self) -> MutexGuard<'_, HashSet<String>> {
        self.paths
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner())
    }

    pub(crate) fn authorize(&self, path: String) {
        self.paths().insert(path);
    }

    pub(crate) fn contains(&self, path: &str) -> bool {
        self.paths().contains(path)
    }
}

impl OutputPathAuthorizations {
    fn paths(&self) -> MutexGuard<'_, HashSet<String>> {
        self.paths
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner())
    }

    pub(crate) fn authorize(&self, path: String) {
        self.paths().insert(path);
    }

    pub(crate) fn consume(&self, path: &str) -> bool {
        self.paths().remove(path)
    }
}

#[cfg(test)]
mod tests {
    use super::{BatchDestinationAuthorizations, OutputPathAuthorizations};

    #[test]
    fn output_path_authorizations_are_single_use() {
        let authorizations = OutputPathAuthorizations::default();
        authorizations.authorize("/tmp/export.pdf".to_string());

        assert!(authorizations.consume("/tmp/export.pdf"));
        assert!(!authorizations.consume("/tmp/export.pdf"));
    }

    #[test]
    fn batch_destination_authorization_survives_reruns() {
        let authorizations = BatchDestinationAuthorizations::default();
        authorizations.authorize("/tmp/batch".to_string());

        assert!(authorizations.contains("/tmp/batch"));
        assert!(authorizations.contains("/tmp/batch"));
    }
}
