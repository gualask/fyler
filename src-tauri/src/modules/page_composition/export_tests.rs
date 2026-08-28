use std::collections::HashMap;
use std::sync::Mutex;

use super::export_page_composition;
use crate::capabilities::raster_compression::CompressionPreset;
use crate::modules::page_composition::contracts::{
    CompositionLayout, CompositionOutputFormat, CompositionRegions, ExportRegion,
    ImageOptimizationOptions, PageCompositionExportRequest, QuarterTurn,
};
use crate::modules::page_composition::{PageCompositionOutputWriter, ProgressSink};
use crate::modules::sources::{DocKind, ImagePreviewBytes, RegisteredSource, SourceLookup};
use crate::shared::operation_progress::OperationProgressEnvelope;

struct Registry(HashMap<String, RegisteredSource>);

impl SourceLookup for Registry {
    fn get(&self, file_id: &str) -> Option<RegisteredSource> {
        self.0.get(file_id).cloned()
    }

    fn get_image_preview(&self, _file_id: &str) -> Option<ImagePreviewBytes> {
        None
    }
}

struct Writer {
    pdf_pages: Mutex<Option<usize>>,
    bytes: Mutex<Option<Vec<u8>>>,
}

impl Default for Writer {
    fn default() -> Self {
        Self {
            pdf_pages: Mutex::new(None),
            bytes: Mutex::new(None),
        }
    }
}

impl PageCompositionOutputWriter for Writer {
    fn write_pdf(&self, _output_path: &str, document: &mut lopdf::Document) -> anyhow::Result<()> {
        *self.pdf_pages.lock().unwrap() = Some(document.get_pages().len());
        Ok(())
    }

    fn write_bytes(&self, _output_path: &str, bytes: &[u8]) -> anyhow::Result<()> {
        *self.bytes.lock().unwrap() = Some(bytes.to_vec());
        Ok(())
    }
}

#[derive(Default)]
struct Sink(Mutex<Vec<OperationProgressEnvelope>>);

impl ProgressSink for Sink {
    fn emit(&self, progress: OperationProgressEnvelope) {
        self.0.lock().unwrap().push(progress);
    }
}

fn registry_with_fixture(label: &str) -> anyhow::Result<(Registry, std::path::PathBuf)> {
    let path = std::env::temp_dir().join(format!(
        "fyler-page-composition-{label}-{}.png",
        uuid::Uuid::new_v4()
    ));
    image::RgbImage::from_pixel(640, 480, image::Rgb([60, 90, 120])).save(&path)?;
    let source = RegisteredSource {
        original_path: path.to_string_lossy().to_string(),
        kind: DocKind::Image,
        password: None,
    };
    Ok((
        Registry(HashMap::from([
            ("front".to_string(), source.clone()),
            ("back".to_string(), source),
        ])),
        path,
    ))
}

fn request(
    output_format: CompositionOutputFormat,
    output_path: &str,
) -> PageCompositionExportRequest {
    PageCompositionExportRequest {
        output_path: output_path.to_string(),
        output_format,
        layout: CompositionLayout::A4StackedHalves,
        regions: CompositionRegions {
            top: ExportRegion {
                file_id: "front".to_string(),
                rotation: QuarterTurn::Identity,
            },
            bottom: ExportRegion {
                file_id: "back".to_string(),
                rotation: QuarterTurn::Identity,
            },
        },
        optimization: ImageOptimizationOptions {
            preset: Some(CompressionPreset::Light),
            jpeg_quality: Some(92),
            target_dpi: None,
        },
    }
}

#[test]
fn image_combinations_export_exactly_one_page() -> anyhow::Result<()> {
    let (registry, path) = registry_with_fixture("pdf")?;
    let writer = Writer::default();
    let sink = Sink::default();
    let mut request = request(CompositionOutputFormat::Pdf, "/authorized/output.pdf");
    request.regions.bottom.rotation = QuarterTurn::Clockwise90;
    request.optimization.jpeg_quality = None;
    request.optimization.target_dpi = Some(220);

    let result = export_page_composition(&sink, &registry, &writer, request)?;

    assert_eq!(result.page_count, 1);
    assert_eq!(*writer.pdf_pages.lock().unwrap(), Some(1));
    let progress = sink.0.lock().unwrap();
    assert_eq!(progress.first().unwrap().operation, "page-composition");
    assert_eq!(progress.last().unwrap().percentage, 100);
    let _ = std::fs::remove_file(path);
    Ok(())
}

#[test]
fn jpeg_export_composes_one_a4_raster() -> anyhow::Result<()> {
    let (registry, path) = registry_with_fixture("jpeg")?;
    let writer = Writer::default();

    export_page_composition(
        &Sink::default(),
        &registry,
        &writer,
        request(CompositionOutputFormat::Jpeg, "/authorized/output.jpg"),
    )?;

    let bytes = writer.bytes.lock().unwrap().clone().expect("JPEG bytes");
    let image = image::load_from_memory_with_format(&bytes, image::ImageFormat::Jpeg)?;
    assert_eq!((image.width(), image.height()), (1819, 2572));
    let _ = std::fs::remove_file(path);
    Ok(())
}
