use super::support::*;
use super::*;

#[test]
fn duplicate_basenames_are_allocated_sequentially_before_work() {
    let filesystem = MemoryFileSystem::with_destination("destination");
    filesystem.put("one/photo.png", png(1));
    filesystem.put("two/photo.png", png(2));

    let result = compress_batch(
        &BatchCompressionSession::default(),
        &filesystem,
        request(
            &[("one", "one/photo.png"), ("two", "two/photo.png")],
            StandaloneImageOutputMode::ConvertToJpeg,
        ),
    )
    .unwrap();

    assert_eq!(
        result.files[0].output_path.as_deref(),
        Some("destination/photo.jpg")
    );
    assert_eq!(
        result.files[1].output_path.as_deref(),
        Some("destination/photo-2.jpg")
    );
    assert_eq!(result.summary.compressed, 2);
}

#[test]
fn preexisting_destination_is_never_overwritten() {
    let filesystem = MemoryFileSystem::with_destination("destination");
    filesystem.put("source/photo.png", png(3));
    filesystem.put("destination/photo.jpg", b"existing".to_vec());

    let result = compress_batch(
        &BatchCompressionSession::default(),
        &filesystem,
        request(
            &[("photo", "source/photo.png")],
            StandaloneImageOutputMode::ConvertToJpeg,
        ),
    )
    .unwrap();

    assert_eq!(
        result.files[0].output_path.as_deref(),
        Some("destination/photo-2.jpg")
    );
    assert_eq!(
        filesystem.get("destination/photo.jpg").unwrap(),
        b"existing"
    );
}

#[test]
fn jpeg_extension_is_retained_when_conversion_is_not_required() {
    let filesystem = MemoryFileSystem::with_destination("destination");
    filesystem.put("source/photo.jpeg", jpeg());

    let result = compress_batch(
        &BatchCompressionSession::default(),
        &filesystem,
        request(
            &[("photo", "source/photo.jpeg")],
            StandaloneImageOutputMode::ConvertToJpeg,
        ),
    )
    .unwrap();

    assert_eq!(
        result.files[0].output_path.as_deref(),
        Some("destination/photo.jpeg")
    );
}

#[test]
fn path_occupied_after_allocation_fails_without_clobbering() {
    let filesystem = MemoryFileSystem::with_destination("destination");
    filesystem.put("source/photo.png", png(4));
    filesystem.occupy_on_create("destination/photo.jpg");

    let result = compress_batch(
        &BatchCompressionSession::default(),
        &filesystem,
        request(
            &[("photo", "source/photo.png")],
            StandaloneImageOutputMode::ConvertToJpeg,
        ),
    )
    .unwrap();

    assert_eq!(result.files[0].status, BatchFileStatus::Failed);
    assert_eq!(
        filesystem.get("destination/photo.jpg").unwrap(),
        b"intruder"
    );
}
