use serde::Serialize;

/// Versioned progress payload shared by workflow-owned operation transports.
///
/// The event name is stable across workflows; `operation` and `phase` keep the payload
/// extensible without making one workflow depend on another workflow's phase vocabulary.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct OperationProgressEnvelope {
    pub(crate) version: u8,
    pub(crate) operation: &'static str,
    pub(crate) phase: &'static str,
    pub(crate) percentage: u8,
}

pub(crate) const OPERATION_PROGRESS_EVENT: &str = "operation-progress";

impl OperationProgressEnvelope {
    pub(crate) const VERSION: u8 = 1;

    pub(crate) const fn merge(phase: &'static str, percentage: u8) -> Self {
        Self {
            version: Self::VERSION,
            operation: "merge",
            phase,
            percentage,
        }
    }

    pub(crate) const fn page_composition(phase: &'static str, percentage: u8) -> Self {
        Self {
            version: Self::VERSION,
            operation: "page-composition",
            phase,
            percentage,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::OperationProgressEnvelope;

    #[test]
    fn serializes_the_versioned_merge_envelope() {
        let payload = OperationProgressEnvelope::merge("merging-pages", 42);

        assert_eq!(
            serde_json::to_value(payload).expect("progress envelope should serialize"),
            serde_json::json!({
                "version": 1,
                "operation": "merge",
                "phase": "merging-pages",
                "percentage": 42,
            })
        );
    }

    #[test]
    fn serializes_page_composition_without_merge_phases() {
        let payload = OperationProgressEnvelope::page_composition("composing", 55);
        assert_eq!(
            serde_json::to_value(payload).unwrap(),
            serde_json::json!({
                "version": 1,
                "operation": "page-composition",
                "phase": "composing",
                "percentage": 55,
            })
        );
    }
}
