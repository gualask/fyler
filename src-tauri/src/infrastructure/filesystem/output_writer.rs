use lopdf::Document as PdfDoc;

use crate::capabilities::pdf::optimization;
use crate::modules::merge::OutputWriter;
use crate::modules::page_composition::PageCompositionOutputWriter;

use super::atomic_output::write_atomically;

/// Filesystem implementation of merge's output writer port.
///
/// Serialization happens into a sibling temporary file and the destination is replaced only
/// after the complete PDF has been written successfully.
#[derive(Clone, Copy, Default)]
pub(crate) struct AtomicOutputWriter;

impl OutputWriter for AtomicOutputWriter {
    fn write(&self, output_path: &str, document: &mut PdfDoc) -> anyhow::Result<()> {
        write_atomically(output_path, |file| {
            optimization::save_document(document, file)
        })
    }
}

impl PageCompositionOutputWriter for AtomicOutputWriter {
    fn write_pdf(&self, output_path: &str, document: &mut PdfDoc) -> anyhow::Result<()> {
        write_atomically(output_path, |file| {
            optimization::save_document(document, file)
        })
    }

    fn write_bytes(&self, output_path: &str, bytes: &[u8]) -> anyhow::Result<()> {
        write_atomically(output_path, |file| {
            use std::io::Write;
            file.write_all(bytes)?;
            Ok(())
        })
    }
}

#[cfg(test)]
mod tests {
    use std::fs;

    use super::{AtomicOutputWriter, OutputWriter};
    use crate::modules::page_composition::PageCompositionOutputWriter;

    #[test]
    fn writer_serializes_through_atomic_output() {
        let path = std::env::temp_dir().join(format!(
            "fyler-atomic-output-port-{}.txt",
            uuid::Uuid::new_v4()
        ));
        fs::write(&path, b"old").expect("create destination");

        let writer = AtomicOutputWriter;
        let mut document = lopdf::Document::new();
        let result = writer.write(path.to_str().expect("utf8 path"), &mut document);

        result.expect("serialize document");
        let bytes = fs::read(&path).expect("read destination");
        assert_ne!(bytes, b"old");
        lopdf::Document::load_mem(&bytes).expect("written PDF should be readable");
        let _ = fs::remove_file(path);
    }

    #[test]
    fn page_composition_writer_persists_encoded_bytes_atomically() {
        let path = std::env::temp_dir().join(format!(
            "fyler-atomic-page-composition-{}.jpg",
            uuid::Uuid::new_v4()
        ));
        fs::write(&path, b"old").expect("create destination");

        PageCompositionOutputWriter::write_bytes(
            &AtomicOutputWriter,
            path.to_str().expect("utf8 path"),
            b"jpeg-bytes",
        )
        .expect("write bytes");

        assert_eq!(fs::read(&path).expect("read destination"), b"jpeg-bytes");
        let _ = fs::remove_file(path);
    }
}
