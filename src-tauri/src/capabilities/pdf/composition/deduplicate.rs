use std::collections::{HashMap, HashSet};
use std::hash::{Hash, Hasher};

use lopdf::{Dictionary, Document as PdfDoc, Object, ObjectId, Stream};

const MIN_IMAGE_STREAM_BYTES: usize = 64 * 1024;

fn contains_indirect_reference(object: &Object) -> bool {
    match object {
        Object::Reference(_) => true,
        Object::Array(items) => items.iter().any(contains_indirect_reference),
        Object::Dictionary(dictionary) => dictionary
            .iter()
            .any(|(_, value)| contains_indirect_reference(value)),
        Object::Stream(stream) => dictionary_contains_indirect_reference(&stream.dict),
        _ => false,
    }
}

fn dictionary_contains_indirect_reference(dictionary: &Dictionary) -> bool {
    dictionary
        .iter()
        .any(|(_, value)| contains_indirect_reference(value))
}

fn is_eligible_image(stream: &Stream) -> bool {
    stream.content.len() >= MIN_IMAGE_STREAM_BYTES
        && stream
            .dict
            .get(b"Subtype")
            .ok()
            .and_then(|value| value.as_name().ok())
            == Some(b"Image".as_slice())
        && !stream.dict.has(b"Mask")
        && !stream.dict.has(b"SMask")
        && !stream.dict.has(b"ImageMask")
        && !dictionary_contains_indirect_reference(&stream.dict)
}

fn content_fingerprint(content: &[u8]) -> u64 {
    let mut hasher = std::collections::hash_map::DefaultHasher::new();
    content.hash(&mut hasher);
    hasher.finish()
}

fn same_serialized_image(left: &Stream, right: &Stream) -> bool {
    left.content == right.content && left.dict == right.dict
}

fn eligible_image_candidates(document: &mut PdfDoc) -> Vec<(ObjectId, u64)> {
    let reachable = document
        .traverse_objects(|_| {})
        .into_iter()
        .collect::<HashSet<_>>();
    document
        .objects
        .iter()
        .filter_map(|(object_id, object)| {
            let stream = object.as_stream().ok()?;
            (reachable.contains(object_id) && is_eligible_image(stream))
                .then_some((*object_id, content_fingerprint(&stream.content)))
        })
        .collect()
}

fn duplicate_replacements(
    document: &PdfDoc,
    candidates: Vec<(ObjectId, u64)>,
) -> HashMap<ObjectId, ObjectId> {
    let mut canonical_by_fingerprint: HashMap<u64, Vec<ObjectId>> = HashMap::new();
    let mut replacements = HashMap::new();

    for (candidate_id, fingerprint) in candidates {
        let canonical_ids = canonical_by_fingerprint.entry(fingerprint).or_default();
        let candidate = document.objects[&candidate_id]
            .as_stream()
            .expect("eligible candidate must remain an image stream");
        let duplicate_of = canonical_ids.iter().copied().find(|canonical_id| {
            document.objects[canonical_id]
                .as_stream()
                .is_ok_and(|canonical| same_serialized_image(candidate, canonical))
        });

        if let Some(canonical_id) = duplicate_of {
            replacements.insert(candidate_id, canonical_id);
        } else {
            canonical_ids.push(candidate_id);
        }
    }

    replacements
}

fn apply_replacements(document: &mut PdfDoc, replacements: &HashMap<ObjectId, ObjectId>) {
    document.traverse_objects(|object| {
        let Object::Reference(object_id) = object else {
            return;
        };
        let Some(canonical_id) = replacements.get(object_id) else {
            return;
        };
        *object_id = *canonical_id;
    });
    for duplicate_id in replacements.keys() {
        document.objects.remove(duplicate_id);
    }
}

/// Shares byte-for-byte identical large image XObjects in an already composed PDF.
///
/// Hashes only select possible matches. Images are merged only after their encoded bytes and
/// complete direct dictionaries compare equal. Masked images and dictionaries containing
/// indirect references are deliberately excluded.
pub(crate) fn deduplicate_large_image_streams(document: &mut PdfDoc) -> usize {
    let candidates = eligible_image_candidates(document);
    let replacements = duplicate_replacements(document, candidates);
    if replacements.is_empty() {
        return 0;
    }
    apply_replacements(document, &replacements);
    replacements.len()
}

#[cfg(test)]
mod tests {
    use lopdf::{dictionary, Dictionary, Document as PdfDoc, Object, ObjectId, Stream};

    use crate::capabilities::pdf::image_embedding::QuarterTurn;

    use super::{deduplicate_large_image_streams, MIN_IMAGE_STREAM_BYTES};
    use crate::capabilities::pdf::composition::PdfComposer;

    fn image_stream(content: Vec<u8>, color_space: &[u8]) -> Stream {
        Stream::new(
            dictionary! {
                "Type" => "XObject",
                "Subtype" => "Image",
                "Width" => 256,
                "Height" => 256,
                "BitsPerComponent" => 8,
                "ColorSpace" => Object::Name(color_space.to_vec()),
                "Filter" => "DCTDecode",
            },
            content,
        )
    }

    fn document_with_images(streams: Vec<Stream>) -> (PdfDoc, Vec<ObjectId>, Vec<ObjectId>) {
        let mut document = PdfDoc::with_version("1.4");
        let pages_id = document.new_object_id();
        let image_ids = streams
            .into_iter()
            .map(|stream| document.add_object(stream))
            .collect::<Vec<_>>();
        let mut page_ids = Vec::new();
        for (index, image_id) in image_ids.iter().copied().enumerate() {
            let mut xobjects = Dictionary::new();
            xobjects.set(format!("Im{index}").into_bytes(), image_id);
            let page_id = document.add_object(dictionary! {
                "Type" => "Page",
                "Parent" => pages_id,
                "MediaBox" => vec![0.into(), 0.into(), 612.into(), 792.into()],
                "Resources" => dictionary! {
                    "XObject" => xobjects,
                },
            });
            page_ids.push(page_id);
        }
        document.objects.insert(
            pages_id,
            Object::Dictionary(dictionary! {
                "Type" => "Pages",
                "Count" => page_ids.len() as i64,
                "Kids" => page_ids.iter().copied().map(Object::Reference).collect::<Vec<_>>(),
            }),
        );
        let catalog_id = document.add_object(dictionary! {
            "Type" => "Catalog",
            "Pages" => pages_id,
        });
        document.trailer.set("Root", catalog_id);
        (document, image_ids, page_ids)
    }

    fn page_image_reference(document: &PdfDoc, page_id: ObjectId) -> anyhow::Result<ObjectId> {
        let resources = document
            .get_dictionary(page_id)?
            .get(b"Resources")?
            .as_dict()?;
        let xobjects = resources.get(b"XObject")?.as_dict()?;
        xobjects
            .iter()
            .next()
            .expect("one image resource")
            .1
            .as_reference()
            .map_err(anyhow::Error::from)
    }

    #[test]
    fn shares_exact_large_images_and_rewrites_page_references() -> anyhow::Result<()> {
        let bytes = vec![73; MIN_IMAGE_STREAM_BYTES];
        let (mut document, image_ids, page_ids) = document_with_images(vec![
            image_stream(bytes.clone(), b"DeviceRGB"),
            image_stream(bytes, b"DeviceRGB"),
        ]);

        assert_eq!(deduplicate_large_image_streams(&mut document), 1);
        assert!(document.objects.contains_key(&image_ids[0]));
        assert!(!document.objects.contains_key(&image_ids[1]));
        assert_eq!(page_image_reference(&document, page_ids[0])?, image_ids[0]);
        assert_eq!(page_image_reference(&document, page_ids[1])?, image_ids[0]);
        Ok(())
    }

    #[test]
    fn shares_identical_images_copied_from_distinct_pdf_sources() -> anyhow::Result<()> {
        let bytes = vec![97; MIN_IMAGE_STREAM_BYTES];
        let (source_a, _, _) =
            document_with_images(vec![image_stream(bytes.clone(), b"DeviceRGB")]);
        let (source_b, _, _) = document_with_images(vec![image_stream(bytes, b"DeviceRGB")]);
        let mut composer = PdfComposer::new();
        composer.push_pdf_page(
            &source_a,
            &mut std::collections::HashMap::new(),
            1,
            QuarterTurn::Identity,
        )?;
        composer.push_pdf_page(
            &source_b,
            &mut std::collections::HashMap::new(),
            1,
            QuarterTurn::Identity,
        )?;
        let mut merged = composer.finish()?;

        assert_eq!(deduplicate_large_image_streams(&mut merged), 1);
        let page_ids = merged.get_pages().into_values().collect::<Vec<_>>();
        assert_eq!(page_ids.len(), 2);
        assert_eq!(
            page_image_reference(&merged, page_ids[0])?,
            page_image_reference(&merged, page_ids[1])?
        );
        Ok(())
    }

    #[test]
    fn hash_match_does_not_merge_different_dictionaries() {
        let bytes = vec![73; MIN_IMAGE_STREAM_BYTES];
        let (mut document, image_ids, _) = document_with_images(vec![
            image_stream(bytes.clone(), b"DeviceRGB"),
            image_stream(bytes, b"DeviceGray"),
        ]);

        assert_eq!(deduplicate_large_image_streams(&mut document), 0);
        assert!(image_ids
            .iter()
            .all(|object_id| document.objects.contains_key(object_id)));
    }

    #[test]
    fn leaves_small_or_masked_images_independent() {
        let small = vec![19; MIN_IMAGE_STREAM_BYTES - 1];
        let mut masked_a = image_stream(vec![41; MIN_IMAGE_STREAM_BYTES], b"DeviceRGB");
        masked_a.dict.set("Mask", vec![0.into(), 255.into()]);
        let masked_b = masked_a.clone();
        let (mut document, image_ids, _) = document_with_images(vec![
            image_stream(small.clone(), b"DeviceRGB"),
            image_stream(small, b"DeviceRGB"),
            masked_a,
            masked_b,
        ]);

        assert_eq!(deduplicate_large_image_streams(&mut document), 0);
        assert!(image_ids
            .iter()
            .all(|object_id| document.objects.contains_key(object_id)));
    }

    #[test]
    fn leaves_images_with_indirect_dictionary_values_independent() {
        let bytes = vec![83; MIN_IMAGE_STREAM_BYTES];
        let (mut document, image_ids, _) = document_with_images(vec![
            image_stream(bytes.clone(), b"DeviceRGB"),
            image_stream(bytes, b"DeviceRGB"),
        ]);
        let color_space_id = document.add_object(Object::Name(b"DeviceRGB".to_vec()));
        for image_id in &image_ids {
            document
                .objects
                .get_mut(image_id)
                .expect("image")
                .as_stream_mut()
                .expect("stream")
                .dict
                .set("ColorSpace", color_space_id);
        }

        assert_eq!(deduplicate_large_image_streams(&mut document), 0);
        assert!(image_ids
            .iter()
            .all(|object_id| document.objects.contains_key(object_id)));
    }
}
