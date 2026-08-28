use crate::modules::sources::{DocKind, RegisteredSource, SourceLookup};
use crate::shared::error::{UserFacingError, UserFacingErrorCode};

use super::contracts::{
    CompositionOutputFormat, CompositionRegions, ExportRegion, PageCompositionExportRequest,
    PageCompositionResult, PreviewLayoutRequest, PreviewRegionInput, PreviewSource,
    PreviewSourceKind,
};
use super::geometry::preview_layout;
use super::pdf_export::compose_pdf;
use super::ports::PageCompositionOutputWriter;
use super::progress::{emit, ProgressSink};
use super::raster_export::compose_jpeg;

fn source_error(file_id: &str, code: UserFacingErrorCode) -> anyhow::Error {
    anyhow::Error::new(UserFacingError::with_meta(
        code,
        serde_json::json!({ "fileId": file_id }),
    ))
}

fn resolve_image<R: SourceLookup>(registry: &R, file_id: &str) -> anyhow::Result<RegisteredSource> {
    let source = registry
        .get(file_id)
        .ok_or_else(|| source_error(file_id, UserFacingErrorCode::SourceNotFound))?;
    if source.kind != DocKind::Image {
        return Err(source_error(
            file_id,
            UserFacingErrorCode::InvalidExportItemKind,
        ));
    }
    Ok(source)
}

fn preview_input(region: &ExportRegion) -> PreviewRegionInput {
    PreviewRegionInput {
        source: Some(PreviewSource {
            file_id: region.file_id.clone(),
            kind: PreviewSourceKind::Image,
        }),
        rotation: region.rotation,
    }
}

struct ResolvedSources {
    top: RegisteredSource,
    bottom: RegisteredSource,
}

fn resolve_sources<R: SourceLookup>(
    registry: &R,
    request: &PageCompositionExportRequest,
) -> anyhow::Result<ResolvedSources> {
    Ok(ResolvedSources {
        top: resolve_image(registry, &request.regions.top.file_id)?,
        bottom: resolve_image(registry, &request.regions.bottom.file_id)?,
    })
}

fn resolve_layout<R: SourceLookup>(
    registry: &R,
    request: &PageCompositionExportRequest,
) -> anyhow::Result<super::contracts::CompositionPreviewLayout> {
    preview_layout(
        registry,
        &PreviewLayoutRequest {
            layout: request.layout,
            regions: CompositionRegions {
                top: preview_input(&request.regions.top),
                bottom: preview_input(&request.regions.bottom),
            },
        },
    )
}

enum ComposedOutput {
    Pdf(Box<lopdf::Document>),
    Jpeg(Vec<u8>),
}

fn compose_output(
    request: &PageCompositionExportRequest,
    sources: &ResolvedSources,
    layout: &super::contracts::CompositionPreviewLayout,
) -> anyhow::Result<ComposedOutput> {
    match request.output_format {
        CompositionOutputFormat::Pdf => Ok(ComposedOutput::Pdf(Box::new(compose_pdf(
            layout,
            &sources.top.original_path,
            request.regions.top.rotation,
            &sources.bottom.original_path,
            request.regions.bottom.rotation,
            request.optimization,
        )?))),
        CompositionOutputFormat::Jpeg => Ok(ComposedOutput::Jpeg(compose_jpeg(
            layout,
            &sources.top.original_path,
            request.regions.top.rotation,
            &sources.bottom.original_path,
            request.regions.bottom.rotation,
            request.optimization,
        )?)),
    }
}

fn write_output(
    writer: &dyn PageCompositionOutputWriter,
    output_path: &str,
    output: ComposedOutput,
) -> anyhow::Result<()> {
    match output {
        ComposedOutput::Pdf(mut document) => writer.write_pdf(output_path, &mut document),
        ComposedOutput::Jpeg(bytes) => writer.write_bytes(output_path, &bytes),
    }
}

pub(crate) fn export_page_composition<R: SourceLookup>(
    sink: &dyn ProgressSink,
    registry: &R,
    writer: &dyn PageCompositionOutputWriter,
    request: PageCompositionExportRequest,
) -> anyhow::Result<PageCompositionResult> {
    emit(sink, "validating", 0);
    let sources = resolve_sources(registry, &request)?;
    let layout = resolve_layout(registry, &request)?;
    emit(sink, "validating", 20);
    emit(sink, "composing", 35);
    let output = compose_output(&request, &sources, &layout)?;
    emit(sink, "composing", 75);
    emit(sink, "saving", 85);
    write_output(writer, &request.output_path, output)?;
    emit(sink, "saving", 100);
    Ok(PageCompositionResult { page_count: 1 })
}
