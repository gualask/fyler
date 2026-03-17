mod analysis;
mod candidate;
mod plan;
mod raster;
mod rewrite;

use lopdf::{Document as PdfDoc, Object, ObjectId};

use crate::models::OptimizeOptions;

use self::analysis::analyze_image_usages;
use self::candidate::{discover_candidate, CandidateSkipReason, ImageCandidate};
use self::plan::{build_passthrough_plan, build_plan, should_keep_original, usages_for};
use self::raster::DecodedRaster;
use self::rewrite::rewrite_stream;

#[derive(Debug, Default, Clone, Copy, PartialEq, Eq)]
pub struct OptimizationSummary {
    pub scanned: usize,
    pub optimized: usize,
    pub skipped_unsupported: usize,
    pub skipped_risky: usize,
    pub failed_non_fatal: usize,
}

enum CandidateDecision {
    Optimize(ImageCandidate),
    Skip(CandidateSkipReason),
}

fn can_optimize(opts: &OptimizeOptions) -> bool {
    opts.jpeg_quality.is_some() || opts.target_dpi.is_some()
}

pub fn has_optimization_work(opts: &OptimizeOptions) -> bool {
    can_optimize(opts)
}

fn classify_object(object_id: ObjectId, obj: &Object) -> Option<CandidateDecision> {
    discover_candidate(object_id, obj).map(|result| match result {
        Ok(candidate) => CandidateDecision::Optimize(candidate),
        Err(reason) => CandidateDecision::Skip(reason),
    })
}

fn apply_candidate(
    obj: &mut Object,
    candidate: &ImageCandidate,
    usages: &std::collections::HashMap<ObjectId, Vec<analysis::ImageUsage>>,
    opts: &OptimizeOptions,
) -> anyhow::Result<bool> {
    let usage_slice = usages_for(usages, candidate);
    let plan = build_plan(candidate, usage_slice, opts)
        .or_else(|| build_passthrough_plan(candidate, opts));
    let Some(plan) = plan else {
        return Ok(false);
    };

    let stream = obj.as_stream_mut()?;
    let original_stream = stream.clone();
    let raster = DecodedRaster::decode(stream, candidate)?;
    let raster = raster.resize(plan.resize_to)?;
    let rewritten_size = rewrite_stream(stream, raster, plan.output_encoding)?;
    if should_keep_original(candidate.original_size, rewritten_size) {
        *stream = original_stream;
        return Ok(false);
    }

    Ok(true)
}

pub fn optimize_images(
    doc: &mut PdfDoc,
    opts: &OptimizeOptions,
) -> anyhow::Result<OptimizationSummary> {
    if !can_optimize(opts) {
        return Ok(OptimizationSummary::default());
    }

    let usages = analyze_image_usages(doc);
    let mut summary = OptimizationSummary::default();
    let object_ids: Vec<_> = doc.objects.keys().copied().collect();

    for object_id in object_ids {
        let Some(decision) = doc
            .objects
            .get(&object_id)
            .and_then(|obj| classify_object(object_id, obj))
        else {
            continue;
        };

        summary.scanned += 1;
        match decision {
            CandidateDecision::Skip(CandidateSkipReason::Unsupported) => {
                summary.skipped_unsupported += 1;
            }
            CandidateDecision::Skip(CandidateSkipReason::Risky) => {
                summary.skipped_risky += 1;
            }
            CandidateDecision::Optimize(candidate) => {
                let Some(obj) = doc.objects.get_mut(&object_id) else {
                    summary.failed_non_fatal += 1;
                    continue;
                };

                match apply_candidate(obj, &candidate, &usages, opts) {
                    Ok(true) => summary.optimized += 1,
                    Ok(false) => {}
                    Err(_) => summary.failed_non_fatal += 1,
                }
            }
        }
    }

    Ok(summary)
}

pub fn cleanup_document(doc: &mut PdfDoc) {
    doc.prune_objects();
    doc.renumber_objects();
}

pub fn save_document(doc: &mut PdfDoc, file: &mut std::fs::File) -> anyhow::Result<()> {
    doc.compress();
    doc.save_to(file)?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use anyhow::Result;
    use jpeg_encoder::{ColorType, Encoder};
    use lopdf::{
        content::Content, content::Operation, dictionary, Dictionary, Document as PdfDoc, Object,
        Stream,
    };
    use std::fs::{self, File};
    use std::path::PathBuf;
    use std::time::{SystemTime, UNIX_EPOCH};

    use super::{cleanup_document, optimize_images, save_document};
    use crate::models::OptimizeOptions;

    fn image_stream(
        color_space: &[u8],
        width: u32,
        height: u32,
        content: Vec<u8>,
        filter: Option<&[u8]>,
        extra_dict: Dictionary,
    ) -> Stream {
        let mut dict = dictionary! {
            "Type" => "XObject",
            "Subtype" => "Image",
            "Width" => width as i64,
            "Height" => height as i64,
            "BitsPerComponent" => 8,
            "ColorSpace" => Object::Name(color_space.to_vec()),
        };
        dict.extend(&extra_dict);
        if let Some(filter) = filter {
            dict.set("Filter", Object::Name(filter.to_vec()));
        }
        Stream::new(dict, content)
    }

    fn page_doc(image_stream: Stream, draw_width_pt: f32, draw_height_pt: f32) -> PdfDoc {
        let mut doc = PdfDoc::with_version("1.4");
        let pages_id = doc.new_object_id();
        let image_id = doc.add_object(image_stream);
        let content = Content {
            operations: vec![
                Operation::new("q", vec![]),
                Operation::new(
                    "cm",
                    vec![
                        draw_width_pt.into(),
                        0.into(),
                        0.into(),
                        draw_height_pt.into(),
                        0.into(),
                        0.into(),
                    ],
                ),
                Operation::new("Do", vec![Object::Name(b"Im0".to_vec())]),
                Operation::new("Q", vec![]),
            ],
        };
        let content_id = doc.add_object(Stream::new(dictionary! {}, content.encode().unwrap()));
        let page_id = doc.add_object(dictionary! {
            "Type" => "Page",
            "Parent" => pages_id,
            "Contents" => content_id,
            "MediaBox" => vec![0.into(), 0.into(), draw_width_pt.into(), draw_height_pt.into()],
            "Resources" => dictionary! {
                "XObject" => dictionary! {
                    "Im0" => image_id,
                }
            }
        });
        doc.objects.insert(
            pages_id,
            Object::Dictionary(dictionary! {
                "Type" => "Pages",
                "Count" => 1,
                "Kids" => vec![page_id.into()],
            }),
        );
        let catalog_id = doc.add_object(dictionary! {
            "Type" => "Catalog",
            "Pages" => pages_id,
        });
        doc.trailer.set("Root", catalog_id);
        doc
    }

    fn first_image_stream(doc: &PdfDoc) -> &Stream {
        doc.objects
            .values()
            .find_map(|object| {
                let stream = object.as_stream().ok()?;
                let subtype = stream.dict.get(b"Subtype").ok()?.as_name().ok()?;
                (subtype == b"Image").then_some(stream)
            })
            .expect("stream present")
    }

    fn temp_output_path(label: &str) -> PathBuf {
        std::env::temp_dir().join(format!(
            "fyler-optimize-{}-{}.pdf",
            label,
            SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .expect("clock")
                .as_nanos()
        ))
    }

    fn saved_document_bytes(doc: &mut PdfDoc, label: &str) -> Result<Vec<u8>> {
        let output = temp_output_path(label);
        let mut file = File::create(&output)?;
        save_document(doc, &mut file)?;
        drop(file);
        Ok(fs::read(output)?)
    }

    fn contains_object_stream(bytes: &[u8]) -> bool {
        bytes.windows(7).any(|window| window == b"/ObjStm")
    }

    #[test]
    fn has_optimization_work_detects_target_dpi_only() {
        assert!(super::has_optimization_work(&OptimizeOptions {
            jpeg_quality: None,
            image_fit: None,
            target_dpi: Some(170),
        }));
    }

    #[test]
    fn target_dpi_resizes_based_on_drawn_size() -> Result<()> {
        let mut doc = page_doc(
            image_stream(
                b"DeviceRGB",
                1800,
                1800,
                vec![200; 1800 * 1800 * 3],
                None,
                Dictionary::new(),
            ),
            432.0,
            432.0,
        );

        let summary = optimize_images(
            &mut doc,
            &OptimizeOptions {
                jpeg_quality: None,
                image_fit: None,
                target_dpi: Some(150),
            },
        )?;

        let stream = first_image_stream(&doc);
        assert_eq!(summary.optimized, 1);
        assert_eq!(stream.dict.get(b"Width")?.as_i64()?, 900);
        assert_eq!(stream.dict.get(b"Height")?.as_i64()?, 900);
        assert_eq!(stream.dict.get(b"Filter")?.as_name()?, b"DCTDecode");
        Ok(())
    }

    #[test]
    fn target_dpi_reencodes_large_raw_images_even_without_resize() -> Result<()> {
        let raw = vec![180; 1600 * 900 * 3];
        let original_size = raw.len();
        let mut doc = page_doc(
            image_stream(b"DeviceRGB", 1600, 900, raw, None, Dictionary::new()),
            595.0,
            335.0,
        );

        let summary = optimize_images(
            &mut doc,
            &OptimizeOptions {
                jpeg_quality: None,
                image_fit: None,
                target_dpi: Some(170),
            },
        )?;

        let stream = first_image_stream(&doc);
        assert_eq!(summary.optimized, 1);
        assert_eq!(stream.dict.get(b"Width")?.as_i64()?, 1600);
        assert_eq!(stream.dict.get(b"Height")?.as_i64()?, 900);
        assert_eq!(stream.dict.get(b"Filter")?.as_name()?, b"DCTDecode");
        assert!(stream.content.len() < original_size / 4);
        Ok(())
    }

    #[test]
    fn optimizes_cmyk_jpeg_streams() -> Result<()> {
        let width: u16 = 32;
        let height: u16 = 32;
        let mut jpeg = Vec::new();
        let raw = [0, 255, 255, 0, 255, 0, 255, 0]
            .repeat(usize::from((width * height) / 2));
        Encoder::new(&mut jpeg, 95).encode(&raw, width, height, ColorType::Cmyk)?;

        let mut doc = page_doc(
            image_stream(
                b"DeviceCMYK",
                u32::from(width),
                u32::from(height),
                jpeg,
                Some(b"DCTDecode"),
                Dictionary::new(),
            ),
            72.0,
            72.0,
        );

        let summary = optimize_images(
            &mut doc,
            &OptimizeOptions {
                jpeg_quality: Some(70),
                image_fit: None,
                target_dpi: None,
            },
        )?;

        let stream = first_image_stream(&doc);
        assert_eq!(summary.optimized, 1);
        assert_eq!(stream.dict.get(b"ColorSpace")?.as_name()?, b"DeviceCMYK");
        assert_eq!(stream.dict.get(b"Filter")?.as_name()?, b"DCTDecode");
        assert_eq!(stream.dict.get(b"Width")?.as_i64()?, i64::from(width));
        assert_eq!(stream.dict.get(b"Height")?.as_i64()?, i64::from(height));
        Ok(())
    }

    #[test]
    fn cleanup_preserves_referenced_zero_length_streams() {
        let mut doc = PdfDoc::with_version("1.4");
        let pages_id = doc.new_object_id();
        let contents_id = doc.add_object(Stream::new(dictionary! {}, Vec::new()));
        let page_id = doc.add_object(dictionary! {
            "Type" => "Page",
            "Parent" => pages_id,
            "Contents" => contents_id,
            "MediaBox" => vec![0.into(), 0.into(), 10.into(), 10.into()],
        });
        doc.objects.insert(
            pages_id,
            Object::Dictionary(dictionary! {
                "Type" => "Pages",
                "Count" => 1,
                "Kids" => vec![page_id.into()],
            }),
        );
        let catalog_id = doc.add_object(dictionary! {
            "Type" => "Catalog",
            "Pages" => pages_id,
        });
        doc.trailer.set("Root", catalog_id);

        cleanup_document(&mut doc);

        assert!(doc.objects.contains_key(&contents_id));
        assert!(doc
            .objects
            .get(&contents_id)
            .and_then(|object| object.as_stream().ok())
            .is_some_and(|stream| stream.content.is_empty()));
    }

    #[test]
    fn cleanup_and_save_roundtrip_with_empty_contents_stream() -> Result<()> {
        let mut doc = PdfDoc::with_version("1.4");
        let pages_id = doc.new_object_id();
        let contents_id = doc.add_object(Stream::new(dictionary! {}, Vec::new()));
        let page_id = doc.add_object(dictionary! {
            "Type" => "Page",
            "Parent" => pages_id,
            "Contents" => contents_id,
            "MediaBox" => vec![0.into(), 0.into(), 10.into(), 10.into()],
        });
        doc.objects.insert(
            pages_id,
            Object::Dictionary(dictionary! {
                "Type" => "Pages",
                "Count" => 1,
                "Kids" => vec![page_id.into()],
            }),
        );
        let catalog_id = doc.add_object(dictionary! {
            "Type" => "Catalog",
            "Pages" => pages_id,
        });
        doc.trailer.set("Root", catalog_id);

        cleanup_document(&mut doc);

        let output = temp_output_path("empty-contents-roundtrip");
        let mut file = File::create(&output)?;
        save_document(&mut doc, &mut file)?;
        drop(file);

        let reloaded = PdfDoc::load(&output)?;
        assert_eq!(reloaded.get_pages().len(), 1);
        Ok(())
    }

    #[test]
    fn save_document_roundtrip_uses_classic_writer() -> Result<()> {
        let mut doc = page_doc(
            image_stream(b"DeviceRGB", 2, 2, vec![0; 12], None, Dictionary::new()),
            72.0,
            72.0,
        );
        assert_eq!(doc.version, "1.4");

        let bytes = saved_document_bytes(&mut doc, "classic-writer-roundtrip")?;
        assert!(bytes.starts_with(b"%PDF-1.4"));
        assert!(!contains_object_stream(&bytes));
        Ok(())
    }

    #[test]
    fn optimized_cmyk_jpeg_roundtrip_stays_loadable() -> Result<()> {
        let width: u16 = 32;
        let height: u16 = 32;
        let mut jpeg = Vec::new();
        let raw = [0, 255, 255, 0, 255, 0, 255, 0]
            .repeat(usize::from((width * height) / 2));
        Encoder::new(&mut jpeg, 95).encode(&raw, width, height, ColorType::Cmyk)?;

        let mut doc = page_doc(
            image_stream(
                b"DeviceCMYK",
                u32::from(width),
                u32::from(height),
                jpeg,
                Some(b"DCTDecode"),
                Dictionary::new(),
            ),
            72.0,
            72.0,
        );

        optimize_images(
            &mut doc,
            &OptimizeOptions {
                jpeg_quality: Some(70),
                image_fit: None,
                target_dpi: None,
            },
        )?;
        cleanup_document(&mut doc);

        let output = temp_output_path("cmyk-roundtrip");
        let mut file = File::create(&output)?;
        save_document(&mut doc, &mut file)?;
        drop(file);

        let bytes = fs::read(&output)?;
        assert!(bytes.starts_with(b"%PDF-1.4"));
        assert!(!contains_object_stream(&bytes));

        let reloaded = PdfDoc::load(&output)?;
        assert_eq!(reloaded.get_pages().len(), 1);
        let stream = first_image_stream(&reloaded);
        assert_eq!(stream.dict.get(b"ColorSpace")?.as_name()?, b"DeviceCMYK");
        assert_eq!(stream.dict.get(b"Filter")?.as_name()?, b"DCTDecode");
        assert_eq!(stream.dict.get(b"Width")?.as_i64()?, i64::from(width));
        assert_eq!(stream.dict.get(b"Height")?.as_i64()?, i64::from(height));
        Ok(())
    }
}
