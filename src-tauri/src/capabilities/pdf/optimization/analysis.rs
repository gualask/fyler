use std::collections::HashMap;

use lopdf::{content::Content, Document as PdfDoc, ObjectId};
use rayon::prelude::*;

mod resources;
mod transform;
mod walker;

use resources::page_resources;
use transform::AffineTransform;
use walker::walk_operations;

pub(super) const MAX_CONTENT_STREAM_BYTES: usize = 64 * 1024 * 1024;

#[derive(Debug, Clone, Copy, Default)]
/// Observed drawn size for an image, expressed in PDF points.
pub struct ImageUsage {
    pub drawn_width_pt: f32,
    pub drawn_height_pt: f32,
}

/// Collects where and how large each embedded image is drawn across the document.
///
/// The result is used to estimate effective DPI and decide whether a downscale is worthwhile.
pub fn analyze_image_usages(doc: &PdfDoc) -> HashMap<ObjectId, Vec<ImageUsage>> {
    let page_ids: Vec<ObjectId> = doc.get_pages().into_values().collect();
    let per_page_usages: Vec<HashMap<ObjectId, Vec<ImageUsage>>> = page_ids
        .into_par_iter()
        .map(|page_id| analyze_page_image_usages(doc, page_id))
        .collect();

    merge_page_image_usages(per_page_usages)
}

fn analyze_page_image_usages(
    doc: &PdfDoc,
    page_id: ObjectId,
) -> HashMap<ObjectId, Vec<ImageUsage>> {
    let mut usages = HashMap::new();
    let resources = page_resources(doc, page_id);
    let Ok(content_bytes) = doc.get_page_content_with_limit(page_id, MAX_CONTENT_STREAM_BYTES)
    else {
        return usages;
    };
    let Ok(content) = Content::decode(&content_bytes) else {
        return usages;
    };
    let mut active_forms = std::collections::HashSet::new();
    walk_operations(
        doc,
        &resources,
        &content.operations,
        AffineTransform::identity(),
        &mut usages,
        &mut active_forms,
    );
    usages
}

fn merge_page_image_usages(
    per_page_usages: Vec<HashMap<ObjectId, Vec<ImageUsage>>>,
) -> HashMap<ObjectId, Vec<ImageUsage>> {
    let mut merged: HashMap<ObjectId, Vec<ImageUsage>> = HashMap::new();
    for map in per_page_usages {
        for (object_id, mut usages) in map {
            merged.entry(object_id).or_default().append(&mut usages);
        }
    }
    merged
}
