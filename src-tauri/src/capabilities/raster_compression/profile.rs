use serde::{Deserialize, Serialize};

pub(crate) const AUTOMATIC_LOSSY_QUALITY: u8 = 92;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) enum CompressionPreset {
    Original,
    Light,
    Balanced,
    Compact,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(crate) struct ResolvedPageProfile {
    pub preset: Option<CompressionPreset>,
    pub jpeg_quality: Option<u8>,
    pub target_dpi: Option<u16>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(crate) struct ResolvedStandaloneProfile {
    pub jpeg_quality: u8,
    scale_percent: u32,
    floor: u32,
    cap: u32,
}

impl ResolvedStandaloneProfile {
    pub(crate) fn target_dimensions(self, width: u32, height: u32) -> (u32, u32) {
        let source_long_edge = width.max(height);
        let scaled = source_long_edge.saturating_mul(self.scale_percent) / 100;
        let target_long_edge = source_long_edge.min(self.cap).min(scaled.max(self.floor));

        if target_long_edge == source_long_edge {
            return (width, height);
        }

        if width >= height {
            (
                target_long_edge,
                scale_other_axis(height, width, target_long_edge),
            )
        } else {
            (
                scale_other_axis(width, height, target_long_edge),
                target_long_edge,
            )
        }
    }
}

fn scale_other_axis(axis: u32, source_long_edge: u32, target_long_edge: u32) -> u32 {
    let numerator = u64::from(axis) * u64::from(target_long_edge);
    ((numerator + u64::from(source_long_edge) / 2) / u64::from(source_long_edge)).max(1) as u32
}

pub(crate) fn resolve_standalone_profile(
    preset: CompressionPreset,
    jpeg_quality: Option<u8>,
) -> Option<ResolvedStandaloneProfile> {
    let (scale_percent, floor, cap) = match preset {
        CompressionPreset::Original => return None,
        CompressionPreset::Light => (85, 1_920, 3_840),
        CompressionPreset::Balanced => (70, 1_600, 2_560),
        CompressionPreset::Compact => (60, 1_280, 1_920),
    };

    Some(ResolvedStandaloneProfile {
        jpeg_quality: jpeg_quality
            .unwrap_or(AUTOMATIC_LOSSY_QUALITY)
            .clamp(1, 100),
        scale_percent,
        floor,
        cap,
    })
}

pub(crate) fn resolve_page_profile(
    preset: Option<CompressionPreset>,
    jpeg_quality: Option<u8>,
    target_dpi: Option<u16>,
) -> ResolvedPageProfile {
    match preset {
        Some(CompressionPreset::Original) => ResolvedPageProfile {
            preset,
            jpeg_quality: None,
            target_dpi: None,
        },
        Some(CompressionPreset::Light) => automatic_profile(preset, 220),
        Some(CompressionPreset::Balanced) => automatic_profile(preset, 170),
        Some(CompressionPreset::Compact) => automatic_profile(preset, 120),
        None => ResolvedPageProfile {
            preset: None,
            jpeg_quality: jpeg_quality.map(|quality| quality.clamp(1, 100)),
            target_dpi,
        },
    }
}

fn automatic_profile(preset: Option<CompressionPreset>, target_dpi: u16) -> ResolvedPageProfile {
    ResolvedPageProfile {
        preset,
        jpeg_quality: Some(AUTOMATIC_LOSSY_QUALITY),
        target_dpi: Some(target_dpi),
    }
}

#[cfg(test)]
mod tests {
    use super::{
        resolve_page_profile, resolve_standalone_profile, CompressionPreset,
        AUTOMATIC_LOSSY_QUALITY,
    };

    #[test]
    fn automatic_profiles_have_exact_targets_and_shared_quality() {
        for (preset, target_dpi) in [
            (CompressionPreset::Light, 220),
            (CompressionPreset::Balanced, 170),
            (CompressionPreset::Compact, 120),
        ] {
            let profile = resolve_page_profile(Some(preset), Some(70), Some(72));
            assert_eq!(profile.preset, Some(preset));
            assert_eq!(profile.target_dpi, Some(target_dpi));
            assert_eq!(profile.jpeg_quality, Some(AUTOMATIC_LOSSY_QUALITY));
        }
    }

    #[test]
    fn original_disables_automatic_reencoding() {
        let profile = resolve_page_profile(Some(CompressionPreset::Original), Some(70), Some(72));
        assert_eq!(profile.jpeg_quality, None);
        assert_eq!(profile.target_dpi, None);
    }

    #[test]
    fn missing_preset_preserves_manual_overrides() {
        let profile = resolve_page_profile(None, Some(90), Some(150));
        assert_eq!(profile.jpeg_quality, Some(90));
        assert_eq!(profile.target_dpi, Some(150));
    }

    #[test]
    fn standalone_profiles_have_exact_adaptive_long_edge_mappings() {
        for (preset, source, expected) in [
            (CompressionPreset::Light, (1_000, 500), (1_000, 500)),
            (CompressionPreset::Light, (2_000, 1_000), (1_920, 960)),
            (CompressionPreset::Light, (6_000, 3_000), (3_840, 1_920)),
            (CompressionPreset::Balanced, (4_000, 2_000), (2_560, 1_280)),
            (CompressionPreset::Compact, (1_000, 2_000), (640, 1_280)),
        ] {
            let profile = resolve_standalone_profile(preset, None).expect("batch preset");
            assert_eq!(profile.target_dimensions(source.0, source.1), expected);
            assert_eq!(profile.jpeg_quality, AUTOMATIC_LOSSY_QUALITY);
        }
    }

    #[test]
    fn standalone_profile_never_enlarges_and_honors_manual_jpeg_quality() {
        let profile =
            resolve_standalone_profile(CompressionPreset::Compact, Some(85)).expect("batch preset");

        assert_eq!(profile.target_dimensions(320, 240), (320, 240));
        assert_eq!(profile.jpeg_quality, 85);
        assert!(resolve_standalone_profile(CompressionPreset::Original, None).is_none());
    }
}
