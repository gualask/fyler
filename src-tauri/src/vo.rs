use serde::de::Error as _;
use serde::{Deserialize, Deserializer, Serialize, Serializer};

/// Source document kind supported by the app.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum DocKind {
    Pdf,
    Image,
}

impl DocKind {
    pub fn as_str(self) -> &'static str {
        match self {
            DocKind::Pdf => "pdf",
            DocKind::Image => "image",
        }
    }
}

/// Layout rule for single-image exports.
#[derive(Debug, Clone, Copy, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum ImageFit {
    #[default]
    Fit,
    Contain,
    Cover,
}

/// Rotation expressed in clockwise 90-degree steps and serialized as `0..=3`.
#[derive(Debug, Clone, Copy, Default, PartialEq, Eq)]
pub enum QuarterTurn {
    #[default]
    Identity,
    Clockwise90,
    HalfTurn,
    Clockwise270,
}

impl QuarterTurn {
    pub const fn degrees(self) -> i32 {
        match self {
            Self::Identity => 0,
            Self::Clockwise90 => 90,
            Self::HalfTurn => 180,
            Self::Clockwise270 => 270,
        }
    }

    pub const fn swaps_dimensions(self) -> bool {
        matches!(self, Self::Clockwise90 | Self::Clockwise270)
    }

    const fn as_u8(self) -> u8 {
        match self {
            Self::Identity => 0,
            Self::Clockwise90 => 1,
            Self::HalfTurn => 2,
            Self::Clockwise270 => 3,
        }
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

#[cfg(test)]
mod tests {
    use super::QuarterTurn;

    #[test]
    fn quarter_turn_round_trips_as_a_number() {
        for (value, expected) in [
            (0, QuarterTurn::Identity),
            (1, QuarterTurn::Clockwise90),
            (2, QuarterTurn::HalfTurn),
            (3, QuarterTurn::Clockwise270),
        ] {
            let turn: QuarterTurn = serde_json::from_value(serde_json::json!(value))
                .expect("valid quarter turn should deserialize");
            assert_eq!(turn, expected);
            assert_eq!(
                serde_json::to_value(turn).unwrap(),
                serde_json::json!(value)
            );
        }
    }

    #[test]
    fn quarter_turn_rejects_out_of_range_values() {
        assert!(serde_json::from_value::<QuarterTurn>(serde_json::json!(4)).is_err());
    }
}
