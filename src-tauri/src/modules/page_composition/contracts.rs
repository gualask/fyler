use serde::de::Error as _;
use serde::{Deserialize, Deserializer, Serialize, Serializer};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum CompositionLayout {
    #[serde(rename = "a4-stacked-halves")]
    A4StackedHalves,
    #[serde(rename = "a4-side-by-side-halves")]
    A4SideBySideHalves,
}

#[derive(Debug, Clone, Copy, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum CompositionOutputFormat {
    #[default]
    Pdf,
    Jpeg,
}

#[derive(Debug, Clone, Copy, Default, PartialEq, Eq)]
pub enum QuarterTurn {
    #[default]
    Identity,
    Clockwise90,
    HalfTurn,
    Clockwise270,
}

impl QuarterTurn {
    pub const fn as_u8(self) -> u8 {
        match self {
            Self::Identity => 0,
            Self::Clockwise90 => 1,
            Self::HalfTurn => 2,
            Self::Clockwise270 => 3,
        }
    }

    pub const fn swaps_dimensions(self) -> bool {
        matches!(self, Self::Clockwise90 | Self::Clockwise270)
    }
}

impl Serialize for QuarterTurn {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        serializer.serialize_u8(self.as_u8())
    }
}

impl<'de> Deserialize<'de> for QuarterTurn {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: Deserializer<'de>,
    {
        match u8::deserialize(deserializer)? {
            0 => Ok(Self::Identity),
            1 => Ok(Self::Clockwise90),
            2 => Ok(Self::HalfTurn),
            3 => Ok(Self::Clockwise270),
            value => Err(D::Error::custom(format!(
                "quarter turn must be between 0 and 3, got {value}"
            ))),
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum PreviewSourceKind {
    Image,
    PdfPageRaster,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PreviewSource {
    pub file_id: String,
    pub kind: PreviewSourceKind,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PreviewRegionInput {
    pub source: Option<PreviewSource>,
    pub rotation: QuarterTurn,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CompositionRegions<T> {
    pub top: T,
    pub bottom: T,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PreviewLayoutRequest {
    pub layout: CompositionLayout,
    pub regions: CompositionRegions<PreviewRegionInput>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportRegion {
    pub file_id: String,
    pub rotation: QuarterTurn,
}

#[derive(Debug, Clone, Copy, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImageOptimizationOptions {
    pub preset: Option<crate::capabilities::raster_compression::CompressionPreset>,
    pub jpeg_quality: Option<u8>,
    pub target_dpi: Option<u16>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PageCompositionExportRequest {
    pub output_path: String,
    pub output_format: CompositionOutputFormat,
    pub layout: CompositionLayout,
    pub regions: CompositionRegions<ExportRegion>,
    pub optimization: ImageOptimizationOptions,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PageCompositionResult {
    pub page_count: u8,
}

#[derive(Debug, Clone, Copy, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Rect {
    pub x_pt: f64,
    pub y_pt: f64,
    pub width_pt: f64,
    pub height_pt: f64,
}

#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RegionPreviewLayout {
    pub region_rect: Rect,
    pub draw_rect: Option<Rect>,
    pub rotation: QuarterTurn,
    pub clip_rect: Option<Rect>,
    pub effective_dpi: Option<f64>,
    pub quality_warning: bool,
}

#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CompositionPreviewLayout {
    pub layout: CompositionLayout,
    pub page_rect: Rect,
    pub regions: CompositionRegions<RegionPreviewLayout>,
}

#[cfg(test)]
mod tests {
    use super::{
        CompositionLayout, CompositionOutputFormat, ImageOptimizationOptions, QuarterTurn,
    };
    use crate::capabilities::raster_compression::CompressionPreset;

    #[test]
    fn contract_serializes_layout_and_rotation() {
        assert_eq!(
            serde_json::to_value(CompositionLayout::A4StackedHalves).unwrap(),
            "a4-stacked-halves"
        );
        assert_eq!(
            serde_json::to_value(CompositionLayout::A4SideBySideHalves).unwrap(),
            "a4-side-by-side-halves"
        );
        assert_eq!(serde_json::to_value(QuarterTurn::Clockwise270).unwrap(), 3);
        assert_eq!(
            serde_json::to_value(CompositionOutputFormat::Jpeg).unwrap(),
            "jpeg"
        );
        assert!(serde_json::from_value::<QuarterTurn>(serde_json::json!(4)).is_err());
    }

    #[test]
    fn optimization_contract_deserializes_named_profile() {
        let options: ImageOptimizationOptions =
            serde_json::from_value(serde_json::json!({ "preset": "compact" }))
                .expect("named profile should deserialize");
        assert_eq!(options.preset, Some(CompressionPreset::Compact));
    }
}
