use lopdf::Document as PdfDoc;

/// Consumer-owned port for final PDF serialization and destination replacement.
///
/// Merge owns when a document is ready to save and the output-path contract. The concrete
/// filesystem adapter owns temporary-file creation and atomic replacement.
pub(crate) trait OutputWriter: Send + Sync {
    fn write(&self, output_path: &str, document: &mut PdfDoc) -> anyhow::Result<()>;
}
