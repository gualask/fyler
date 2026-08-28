use super::support::*;
use super::*;

#[test]
fn identical_successful_request_is_idempotent_without_rereading_source() {
    let filesystem = MemoryFileSystem::with_destination("destination");
    filesystem.put("source/photo.png", png(5));
    let session = BatchCompressionSession::default();
    let request = request(
        &[("photo", "source/photo.png")],
        StandaloneImageOutputMode::ConvertToJpeg,
    );
    let first = compress_batch(&session, &filesystem, request.clone()).unwrap();
    filesystem
        .state
        .lock()
        .unwrap()
        .files
        .remove(Path::new("source/photo.png"));

    let second = compress_batch(&session, &filesystem, request).unwrap();

    assert_eq!(second, first);
}

#[test]
fn changing_destination_is_not_treated_as_an_idempotent_rerun() {
    let filesystem = MemoryFileSystem::with_destination("destination");
    filesystem.add_destination("other-destination");
    filesystem.put("source/photo.png", png(9));
    let session = BatchCompressionSession::default();
    let first = compress_batch(
        &session,
        &filesystem,
        request(
            &[("photo", "source/photo.png")],
            StandaloneImageOutputMode::ConvertToJpeg,
        ),
    )
    .unwrap();
    let mut second_request = request(
        &[("photo", "source/photo.png")],
        StandaloneImageOutputMode::ConvertToJpeg,
    );
    second_request.destination_path = "other-destination".to_string();

    let second = compress_batch(&session, &filesystem, second_request).unwrap();

    assert_eq!(
        second.files[0].output_path.as_deref(),
        Some("other-destination/photo.jpg")
    );
    assert!(filesystem.get("other-destination/photo.jpg").is_some());
    assert!(filesystem
        .get(first.files[0].output_path.as_deref().unwrap())
        .is_some());
}

#[test]
fn failed_rerun_preserves_prior_successful_output() {
    let filesystem = MemoryFileSystem::with_destination("destination");
    filesystem.put("source/photo.png", png(6));
    let session = BatchCompressionSession::default();
    let initial = compress_batch(
        &session,
        &filesystem,
        request(
            &[("photo", "source/photo.png")],
            StandaloneImageOutputMode::ConvertToJpeg,
        ),
    )
    .unwrap();
    let output = initial.files[0].output_path.clone().unwrap();
    let successful_bytes = filesystem.get(&output).unwrap();
    filesystem
        .state
        .lock()
        .unwrap()
        .files
        .remove(Path::new("source/photo.png"));

    let rerun = compress_batch(
        &session,
        &filesystem,
        request(
            &[("photo", "source/photo.png")],
            StandaloneImageOutputMode::KeepSourceFormat,
        ),
    )
    .unwrap();

    assert_eq!(rerun.files[0].status, BatchFileStatus::Failed);
    assert_eq!(filesystem.get(&output).unwrap(), successful_bytes);
}

#[test]
fn extension_change_commits_new_output_before_removing_old_owned_output() {
    let filesystem = MemoryFileSystem::with_destination("destination");
    filesystem.put("source/photo.png", png(7));
    let session = BatchCompressionSession::default();
    let first = compress_batch(
        &session,
        &filesystem,
        request(
            &[("photo", "source/photo.png")],
            StandaloneImageOutputMode::KeepSourceFormat,
        ),
    )
    .unwrap();
    assert_eq!(
        first.files[0].output_path.as_deref(),
        Some("destination/photo.png")
    );

    let second = compress_batch(
        &session,
        &filesystem,
        request(
            &[("photo", "source/photo.png")],
            StandaloneImageOutputMode::ConvertToJpeg,
        ),
    )
    .unwrap();

    assert_eq!(
        second.files[0].output_path.as_deref(),
        Some("destination/photo.jpg")
    );
    assert!(filesystem.get("destination/photo.jpg").is_some());
    assert!(filesystem.get("destination/photo.png").is_none());
}
