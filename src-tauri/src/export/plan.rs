use crate::error::UserFacingError;
use crate::models::{ExportItem, MergeRequest, MergeWarning, OptimizeOptions};
use crate::optimize;
use crate::vo::ImageFit;

pub(super) struct ExportPlan {
    pub(super) image_fit: ImageFit,
    pub(super) warnings: Vec<MergeWarning>,
    pub(super) should_optimize_images: bool,
}

pub(super) fn resolve_image_fit(
    options: Option<&OptimizeOptions>,
) -> (ImageFit, Option<MergeWarning>) {
    let Some(value) = options.and_then(|value| value.image_fit.as_deref()) else {
        return (ImageFit::Fit, None);
    };

    match ImageFit::parse(value) {
        Some(image_fit) => (image_fit, None),
        None => (
            ImageFit::Fit,
            Some(MergeWarning {
                code: "unknown_image_fit_defaulted".to_string(),
                meta: Some(serde_json::json!({ "value": value, "defaultedTo": "fit" })),
            }),
        ),
    }
}

fn has_pdf_sources(pages: &[ExportItem]) -> bool {
    pages
        .iter()
        .any(|page| matches!(page, ExportItem::Pdf { .. }))
}

pub(super) fn should_optimize_images(pages: &[ExportItem], options: &OptimizeOptions) -> bool {
    has_pdf_sources(pages) && optimize::has_optimization_work(options)
}

pub(super) fn prepare_export_plan(req: &MergeRequest) -> anyhow::Result<ExportPlan> {
    if req.pages.is_empty() {
        return Err(anyhow::Error::new(UserFacingError::new(
            "no_documents_to_merge",
        )));
    }

    let (image_fit, warning) = resolve_image_fit(req.optimize.as_ref());
    let mut warnings = Vec::new();
    if let Some(warning) = warning {
        warnings.push(warning);
    }

    Ok(ExportPlan {
        image_fit,
        warnings,
        should_optimize_images: req
            .optimize
            .as_ref()
            .is_some_and(|options| should_optimize_images(&req.pages, options)),
    })
}
