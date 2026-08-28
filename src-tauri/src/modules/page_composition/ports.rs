use lopdf::Document as PdfDoc;

use crate::modules::sources::SourceFile;

pub(crate) trait GeneratedRasterStore: Send + Sync {
    fn register_generated_raster(&self, jpeg_bytes: &[u8]) -> anyhow::Result<SourceFile>;
}

pub(crate) trait PageCompositionOutputWriter: Send + Sync {
    fn write_pdf(&self, output_path: &str, document: &mut PdfDoc) -> anyhow::Result<()>;
    fn write_bytes(&self, output_path: &str, bytes: &[u8]) -> anyhow::Result<()>;
}
