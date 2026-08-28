use std::collections::HashSet;
use std::path::{Path, PathBuf};

use crate::capabilities::raster_compression::standalone::StandaloneImageOutputMode;
use crate::modules::batch_compression::session::RelevantSettings;
use crate::modules::batch_compression::{
    BatchCompressionRequest, BatchCompressionSession, BatchCompressionSettings, BatchFileResult,
    BatchFileSystem, BatchSkipReason, OutputCommitMode,
};

use super::processing::skipped_result;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(super) enum SourceKind {
    Pdf,
    Image { source_extension: ImageExtension },
    Unsupported,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(super) enum ImageExtension {
    Jpeg,
    Png,
    WebP,
    Bmp,
}

impl ImageExtension {
    fn from_path(path: &Path) -> Option<Self> {
        match path
            .extension()?
            .to_string_lossy()
            .to_ascii_lowercase()
            .as_str()
        {
            "jpg" | "jpeg" => Some(Self::Jpeg),
            "png" => Some(Self::Png),
            "webp" => Some(Self::WebP),
            "bmp" => Some(Self::Bmp),
            _ => None,
        }
    }
}

#[derive(Clone)]
pub(super) struct WorkPlan {
    pub(super) source_id: String,
    pub(super) source_path: String,
    pub(super) kind: SourceKind,
    pub(super) settings: RelevantSettings,
    pub(super) output_slots: Vec<OutputSlot>,
    pub(super) previous_output: Option<PathBuf>,
    pub(super) request_settings: BatchCompressionSettings,
}

#[derive(Clone)]
pub(super) struct OutputSlot {
    pub(super) path: PathBuf,
    pub(super) mode: OutputCommitMode,
}

pub(super) enum PlannedItem {
    Ready(WorkPlan),
    Immediate {
        result: BatchFileResult,
        settings: RelevantSettings,
        record: bool,
    },
}

pub(super) fn plan_run<F: BatchFileSystem>(
    session: &BatchCompressionSession,
    filesystem: &F,
    request: &BatchCompressionRequest,
) -> Vec<PlannedItem> {
    let destination = Path::new(&request.destination_path);
    let mut reserved_names = session
        .owned_outputs()
        .into_iter()
        .filter(|path| path.parent() == Some(destination))
        .filter_map(|path| normalized_file_name(&path))
        .collect::<HashSet<_>>();

    request
        .files
        .iter()
        .map(|file| {
            let source_path = Path::new(&file.source_path);
            let kind = classify_source(source_path);
            let settings = relevant_settings(kind, request.settings);
            if let Some(result) =
                session.cached_result(&file.source_id, &file.source_path, settings, destination)
            {
                return PlannedItem::Immediate {
                    result,
                    settings,
                    record: false,
                };
            }
            if kind == SourceKind::Unsupported {
                return PlannedItem::Immediate {
                    result: skipped_result(
                        &file.source_id,
                        &file.source_path,
                        BatchSkipReason::UnsupportedFormat,
                        None,
                    ),
                    settings,
                    record: true,
                };
            }

            let previous_output = session.owned_output(&file.source_id);
            let output_slots =
                desired_extensions(kind, request.settings.image_output_mode, source_path)
                    .into_iter()
                    .map(|desired_extension| {
                        let can_replace = previous_output.as_ref().is_some_and(|previous| {
                            previous.parent() == Some(destination)
                                && extension_matches(previous, &desired_extension)
                        });
                        let path = if can_replace {
                            previous_output.clone().expect("checked owned output")
                        } else {
                            allocate_output(
                                filesystem,
                                destination,
                                source_path,
                                &desired_extension,
                                &mut reserved_names,
                            )
                        };
                        if let Some(name) = normalized_file_name(&path) {
                            reserved_names.insert(name);
                        }
                        OutputSlot {
                            path,
                            mode: if can_replace {
                                OutputCommitMode::ReplaceOwned
                            } else {
                                OutputCommitMode::CreateNew
                            },
                        }
                    })
                    .collect();
            PlannedItem::Ready(WorkPlan {
                source_id: file.source_id.clone(),
                source_path: file.source_path.clone(),
                kind,
                settings,
                output_slots,
                previous_output,
                request_settings: request.settings,
            })
        })
        .collect()
}
fn classify_source(path: &Path) -> SourceKind {
    if path
        .extension()
        .is_some_and(|extension| extension.eq_ignore_ascii_case("pdf"))
    {
        SourceKind::Pdf
    } else if let Some(source_extension) = ImageExtension::from_path(path) {
        SourceKind::Image { source_extension }
    } else {
        SourceKind::Unsupported
    }
}

fn relevant_settings(kind: SourceKind, settings: BatchCompressionSettings) -> RelevantSettings {
    match kind {
        SourceKind::Pdf => RelevantSettings::pdf(settings),
        SourceKind::Image { source_extension } => {
            let jpeg_output = outputs_jpeg(source_extension, settings.image_output_mode);
            let background_relevant = jpeg_output
                && matches!(source_extension, ImageExtension::Png | ImageExtension::WebP);
            RelevantSettings::image(settings, jpeg_output, background_relevant)
        }
        SourceKind::Unsupported => RelevantSettings::Unsupported,
    }
}

fn outputs_jpeg(extension: ImageExtension, mode: StandaloneImageOutputMode) -> bool {
    match mode {
        StandaloneImageOutputMode::ConvertToJpeg => true,
        StandaloneImageOutputMode::KeepSourceFormat => extension == ImageExtension::Jpeg,
    }
}

fn desired_extensions(
    kind: SourceKind,
    mode: StandaloneImageOutputMode,
    source: &Path,
) -> Vec<String> {
    let source_extension_text = source
        .extension()
        .map(|extension| extension.to_string_lossy().to_ascii_lowercase())
        .unwrap_or_default();
    match kind {
        SourceKind::Pdf => vec!["pdf".to_string()],
        SourceKind::Image { source_extension } => match mode {
            StandaloneImageOutputMode::ConvertToJpeg
                if source_extension == ImageExtension::Jpeg =>
            {
                vec![source_extension_text]
            }
            StandaloneImageOutputMode::ConvertToJpeg => vec!["jpg".to_string()],
            StandaloneImageOutputMode::KeepSourceFormat => {
                vec![source_extension_text]
            }
        },
        SourceKind::Unsupported => vec![source_extension_text],
    }
}

fn allocate_output<F: BatchFileSystem>(
    filesystem: &F,
    destination: &Path,
    source: &Path,
    desired_extension: &str,
    reserved_names: &mut HashSet<String>,
) -> PathBuf {
    let source_name = source.file_name().unwrap_or_default().to_string_lossy();
    let stem = source
        .file_stem()
        .filter(|stem| !stem.is_empty())
        .unwrap_or_else(|| std::ffi::OsStr::new("output"))
        .to_string_lossy();
    let extension = desired_extension;
    let source_extension = source
        .extension()
        .map(|value| value.to_string_lossy().to_ascii_lowercase())
        .unwrap_or_default();
    let initial_name = if source_extension == desired_extension {
        source_name.to_string()
    } else {
        format!("{stem}.{extension}")
    };
    for suffix in 1usize.. {
        let file_name = if suffix == 1 {
            initial_name.clone()
        } else {
            format!("{stem}-{suffix}.{extension}")
        };
        let candidate = destination.join(&file_name);
        if !reserved_names.contains(&file_name.to_ascii_lowercase())
            && !filesystem.exists(&candidate)
        {
            reserved_names.insert(file_name.to_ascii_lowercase());
            return candidate;
        }
    }
    unreachable!("progressive output suffixes are unbounded")
}

fn normalized_file_name(path: &Path) -> Option<String> {
    path.file_name()
        .map(|name| name.to_string_lossy().to_ascii_lowercase())
}

fn extension_matches(path: &Path, desired: &str) -> bool {
    path.extension()
        .is_some_and(|extension| extension.eq_ignore_ascii_case(desired))
}
