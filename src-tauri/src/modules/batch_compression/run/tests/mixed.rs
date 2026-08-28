use super::support::*;
use super::*;

#[derive(Default)]
struct CollectedProgress(std::sync::Mutex<Vec<String>>);

impl BatchProgressSink for CollectedProgress {
    fn file_completed(&self, result: &crate::modules::batch_compression::BatchFileResult) {
        self.0.lock().unwrap().push(result.source_id.clone());
    }
}

#[test]
fn reports_each_file_as_it_completes() {
    let filesystem = MemoryFileSystem::with_destination("destination");
    filesystem.put("source/photo.png", png(8));
    filesystem.put("source/archive.gif", b"gif".to_vec());
    let progress = CollectedProgress::default();

    let result = compress_batch_with_progress(
        &progress,
        &BatchCompressionSession::default(),
        &filesystem,
        request(
            &[("photo", "source/photo.png"), ("gif", "source/archive.gif")],
            StandaloneImageOutputMode::ConvertToJpeg,
        ),
    )
    .unwrap();

    let mut completed = progress.0.into_inner().unwrap();
    completed.sort();
    assert_eq!(completed, vec!["gif", "photo"]);
    assert_eq!(result.files.len(), 2);
}

#[test]
fn unsupported_input_isolated_from_supported_file() {
    let filesystem = MemoryFileSystem::with_destination("destination");
    filesystem.put("source/photo.png", png(8));
    filesystem.put("source/archive.gif", b"gif".to_vec());

    let result = compress_batch(
        &BatchCompressionSession::default(),
        &filesystem,
        request(
            &[("gif", "source/archive.gif"), ("photo", "source/photo.png")],
            StandaloneImageOutputMode::ConvertToJpeg,
        ),
    )
    .unwrap();

    assert_eq!(result.files[0].status, BatchFileStatus::Skipped);
    assert_eq!(
        result.files[0].skip_reason,
        Some(BatchSkipReason::UnsupportedFormat)
    );
    assert_eq!(result.files[1].status, BatchFileStatus::Compressed);
}

#[test]
fn signed_pdf_is_skipped_without_stopping_a_mixed_batch() {
    let filesystem = MemoryFileSystem::with_destination("destination");
    filesystem.put("source/signed.pdf", pdf(true));
    let plain_pdf = pdf(false);
    filesystem.put("source/plain.pdf", plain_pdf.clone());
    filesystem.put("source/photo.png", png(10));

    let result = compress_batch(
        &BatchCompressionSession::default(),
        &filesystem,
        request(
            &[
                ("signed", "source/signed.pdf"),
                ("plain", "source/plain.pdf"),
                ("photo", "source/photo.png"),
            ],
            StandaloneImageOutputMode::ConvertToJpeg,
        ),
    )
    .unwrap();

    assert_eq!(result.files[0].status, BatchFileStatus::Skipped);
    assert_eq!(
        result.files[0].skip_reason,
        Some(BatchSkipReason::DigitallySignedPdf)
    );
    assert!(result.files[0].output_path.is_none());
    assert_eq!(result.files[1].status, BatchFileStatus::AlreadyOptimized);
    assert_eq!(filesystem.get("destination/plain.pdf").unwrap(), plain_pdf);
    assert_eq!(result.files[2].status, BatchFileStatus::Compressed);
    assert_eq!(result.summary.skipped, 1);
    assert_eq!(result.summary.compressed, 1);
    assert_eq!(result.summary.already_optimized, 1);
}
