use std::sync::{Arc, Barrier};
use std::thread;

use super::super::{RegisteredSource, SourceRegistry};
use crate::vo::DocKind;

fn registered_source(path: &str) -> RegisteredSource {
    RegisteredSource {
        original_path: path.to_string(),
        kind: DocKind::Image,
        password: None,
    }
}

#[test]
fn concurrent_path_reservations_have_exactly_one_winner() {
    const WORKERS: usize = 8;
    let registry = SourceRegistry::default();
    let barrier = Arc::new(Barrier::new(WORKERS));
    let handles = (0..WORKERS)
        .map(|_| {
            let registry = registry.clone();
            let barrier = barrier.clone();
            thread::spawn(move || {
                barrier.wait();
                registry.reserve_import_paths(["/tmp/shared-source.png".to_string()])
            })
        })
        .collect::<Vec<_>>();

    let winners = handles
        .into_iter()
        .map(|handle| handle.join().expect("reservation worker"))
        .filter(|paths| !paths.is_empty())
        .count();

    assert_eq!(winners, 1);
    registry.cancel_import_paths(&["/tmp/shared-source.png".to_string()]);
}

#[test]
fn replacing_a_path_cannot_leave_an_orphan_that_breaks_dedupe() {
    let registry = SourceRegistry::default();
    let path = "/tmp/replaced-source.png";
    registry.insert_one("first".to_string(), registered_source(path));
    registry.insert_one("second".to_string(), registered_source(path));

    assert!(registry.get("first").is_none());
    assert!(registry.get("second").is_some());
    registry.remove_many(&["first".to_string()]);
    assert!(registry.contains_original_path(path));
}
