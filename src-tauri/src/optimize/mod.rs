mod candidate;
mod raster;
mod rewrite;

use lopdf::{Document as PdfDoc, Object};

use crate::models::OptimizeOptions;

use self::candidate::{discover_candidate, CandidateSkipReason, ImageCandidate};
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
    opts.jpeg_quality.is_some() || opts.max_px.is_some()
}

fn classify_object(obj: &Object) -> Option<CandidateDecision> {
    discover_candidate(obj).map(|result| match result {
        Ok(candidate) => CandidateDecision::Optimize(candidate),
        Err(reason) => CandidateDecision::Skip(reason),
    })
}

fn apply_candidate(
    obj: &mut Object,
    candidate: &ImageCandidate,
    opts: &OptimizeOptions,
) -> anyhow::Result<bool> {
    let stream = obj.as_stream_mut()?;
    let raster = DecodedRaster::decode(stream, candidate)?;
    let transformed = raster.transform(opts);
    rewrite_stream(stream, candidate.color_space, transformed, opts)?;
    Ok(true)
}

pub fn optimize_images(doc: &mut PdfDoc, opts: &OptimizeOptions) -> anyhow::Result<OptimizationSummary> {
    if !can_optimize(opts) {
        return Ok(OptimizationSummary::default());
    }

    let mut summary = OptimizationSummary::default();
    let object_ids: Vec<_> = doc.objects.keys().copied().collect();

    for object_id in object_ids {
        let Some(decision) = doc.objects.get(&object_id).and_then(classify_object) else {
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

                match apply_candidate(obj, &candidate, opts) {
                    Ok(true) => summary.optimized += 1,
                    Ok(false) => summary.skipped_risky += 1,
                    Err(_) => summary.failed_non_fatal += 1,
                }
            }
        }
    }

    Ok(summary)
}

#[cfg(test)]
mod tests {
    use anyhow::Result;
    use lopdf::{dictionary, Dictionary, Document as PdfDoc, Object, Stream};

    use super::optimize_images;
    use crate::models::OptimizeOptions;

    fn image_doc(
        color_space: &[u8],
        width: u32,
        height: u32,
        content: Vec<u8>,
        filter: Option<&[u8]>,
        extra_dict: Dictionary,
    ) -> PdfDoc {
        let mut doc = PdfDoc::with_version("1.4");
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
        let stream = Stream::new(dict, content);
        doc.add_object(stream);
        doc
    }

    fn stream(doc: &PdfDoc) -> &Stream {
        doc.objects
            .values()
            .find_map(|object| object.as_stream().ok())
            .expect("image stream")
    }

    #[test]
    fn optimizes_rgb_flate_streams_to_jpeg() -> Result<()> {
        let raw = vec![
            255, 0, 0, 0, 255, 0,
            0, 0, 255, 255, 255, 0,
        ];
        let mut doc = image_doc(b"DeviceRGB", 2, 2, raw, None, Dictionary::new());
        doc.compress();

        let summary = optimize_images(
            &mut doc,
            &OptimizeOptions {
                jpeg_quality: Some("medium".into()),
                max_px: None,
                image_fit: None,
            },
        )?;

        let stream = stream(&doc);
        assert_eq!(summary.optimized, 1);
        assert_eq!(stream.dict.get(b"Filter")?.as_name()?, b"DCTDecode");
        assert_eq!(stream.dict.get(b"ColorSpace")?.as_name()?, b"DeviceRGB");
        assert!(stream.dict.get(b"DecodeParms").is_err());
        Ok(())
    }

    #[test]
    fn optimizes_gray_streams_conservatively() -> Result<()> {
        let raw = vec![0, 128, 192, 255];
        let mut doc = image_doc(b"DeviceGray", 2, 2, raw, None, Dictionary::new());

        let summary = optimize_images(
            &mut doc,
            &OptimizeOptions {
                jpeg_quality: Some("medium".into()),
                max_px: None,
                image_fit: None,
            },
        )?;

        let stream = stream(&doc);
        assert_eq!(summary.optimized, 1);
        assert_eq!(stream.dict.get(b"ColorSpace")?.as_name()?, b"DeviceGray");
        assert_eq!(stream.dict.get(b"Filter")?.as_name()?, b"DCTDecode");
        Ok(())
    }

    #[test]
    fn skips_unsupported_color_spaces_without_mutation() -> Result<()> {
        let raw = vec![0; 8];
        let mut doc = image_doc(b"DeviceCMYK", 2, 1, raw.clone(), None, Dictionary::new());

        let summary = optimize_images(
            &mut doc,
            &OptimizeOptions {
                jpeg_quality: Some("medium".into()),
                max_px: None,
                image_fit: None,
            },
        )?;

        let stream = stream(&doc);
        assert_eq!(summary.skipped_unsupported, 1);
        assert_eq!(stream.content, raw);
        assert_eq!(stream.dict.get(b"ColorSpace")?.as_name()?, b"DeviceCMYK");
        Ok(())
    }

    #[test]
    fn skips_risky_streams_with_masks() -> Result<()> {
        let raw = vec![255, 0, 0];
        let mut extra = Dictionary::new();
        extra.set("SMask", Object::Reference((99, 0)));
        let mut doc = image_doc(b"DeviceRGB", 1, 1, raw.clone(), None, extra);

        let summary = optimize_images(
            &mut doc,
            &OptimizeOptions {
                jpeg_quality: Some("medium".into()),
                max_px: None,
                image_fit: None,
            },
        )?;

        let stream = stream(&doc);
        assert_eq!(summary.skipped_risky, 1);
        assert_eq!(stream.content, raw);
        Ok(())
    }

    #[test]
    fn skips_streams_with_unsupported_filters() -> Result<()> {
        let raw = vec![0xff, 0xd8, 0xff, 0xd9];
        let mut doc = image_doc(b"DeviceRGB", 1, 1, raw.clone(), Some(b"DCTDecode"), Dictionary::new());

        let summary = optimize_images(
            &mut doc,
            &OptimizeOptions {
                jpeg_quality: Some("medium".into()),
                max_px: None,
                image_fit: None,
            },
        )?;

        let stream = stream(&doc);
        assert_eq!(summary.skipped_unsupported, 1);
        assert_eq!(stream.content, raw);
        assert_eq!(stream.dict.get(b"Filter")?.as_name()?, b"DCTDecode");
        Ok(())
    }

    #[test]
    fn malformed_streams_fail_non_fatally_and_preserve_original_bytes() -> Result<()> {
        let raw = vec![255, 0];
        let mut doc = image_doc(b"DeviceRGB", 1, 1, raw.clone(), None, Dictionary::new());

        let summary = optimize_images(
            &mut doc,
            &OptimizeOptions {
                jpeg_quality: Some("medium".into()),
                max_px: None,
                image_fit: None,
            },
        )?;

        let stream = stream(&doc);
        assert_eq!(summary.failed_non_fatal, 1);
        assert_eq!(stream.content, raw);
        assert!(stream.dict.get(b"Filter").is_err());
        Ok(())
    }
}
