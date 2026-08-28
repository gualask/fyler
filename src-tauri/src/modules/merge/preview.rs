use crate::capabilities::pdf::image_embedding::{
    image_export_preview_layout as capability_image_export_preview_layout,
    ImageExportPreviewLayout, ImageFit as CapabilityImageFit, QuarterTurn as CapabilityQuarterTurn,
};
use crate::modules::sources::{DocKind, SourceLookup};
use crate::shared::error::{UserFacingError, UserFacingErrorCode};

use super::{ImageFit, QuarterTurn};

fn image_fit_for_capability(image_fit: ImageFit) -> CapabilityImageFit {
    match image_fit {
        ImageFit::Fit => CapabilityImageFit::Fit,
        ImageFit::Contain => CapabilityImageFit::Contain,
        ImageFit::Cover => CapabilityImageFit::Cover,
    }
}

fn quarter_turn_for_capability(quarter_turn: QuarterTurn) -> CapabilityQuarterTurn {
    match quarter_turn {
        QuarterTurn::Identity => CapabilityQuarterTurn::Identity,
        QuarterTurn::Clockwise90 => CapabilityQuarterTurn::Clockwise90,
        QuarterTurn::HalfTurn => CapabilityQuarterTurn::HalfTurn,
        QuarterTurn::Clockwise270 => CapabilityQuarterTurn::Clockwise270,
    }
}

/// Computes the merge image preview layout after resolving and validating the workflow source.
pub(crate) fn image_export_preview_layout<R: SourceLookup>(
    file_id: &str,
    image_fit: ImageFit,
    quarter_turns: QuarterTurn,
    registry: &R,
) -> anyhow::Result<ImageExportPreviewLayout> {
    let source = registry.get(file_id).ok_or_else(|| {
        anyhow::Error::new(UserFacingError::new(UserFacingErrorCode::SourceNotFound))
    })?;
    if source.kind != DocKind::Image {
        return Err(anyhow::Error::new(UserFacingError::new(
            UserFacingErrorCode::InvalidExportItemKind,
        )));
    }

    capability_image_export_preview_layout(
        &source.original_path,
        image_fit_for_capability(image_fit),
        quarter_turn_for_capability(quarter_turns),
    )
}
