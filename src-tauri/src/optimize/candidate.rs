use lopdf::{Object, ObjectId};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SupportedColorSpace {
    Gray,
    Rgb,
    Cmyk,
}

impl SupportedColorSpace {
    pub fn components(self) -> usize {
        match self {
            Self::Gray => 1,
            Self::Rgb => 3,
            Self::Cmyk => 4,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SourceEncoding {
    Raw,
    Jpeg,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum CandidateSkipReason {
    Unsupported,
    Risky,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct ImageCandidate {
    pub object_id: ObjectId,
    pub width: u32,
    pub height: u32,
    pub color_space: SupportedColorSpace,
    pub source_encoding: SourceEncoding,
    pub original_size: usize,
}

fn dict_u32(obj: &Object, key: &[u8]) -> u32 {
    obj.as_stream()
        .ok()
        .and_then(|stream| stream.dict.get(key).ok())
        .and_then(|value| value.as_i64().ok())
        .unwrap_or(0) as u32
}

fn has_risky_mask(obj: &Object) -> bool {
    let Ok(stream) = obj.as_stream() else {
        return false;
    };
    stream.dict.get(b"Mask").is_ok() || stream.dict.get(b"SMask").is_ok()
}

fn image_color_space(obj: &Object) -> Result<SupportedColorSpace, CandidateSkipReason> {
    let stream = obj
        .as_stream()
        .map_err(|_| CandidateSkipReason::Unsupported)?;
    let color_space = stream
        .dict
        .get(b"ColorSpace")
        .map_err(|_| CandidateSkipReason::Risky)?;
    match color_space {
        Object::Name(name) => match name.as_slice() {
            b"DeviceRGB" => Ok(SupportedColorSpace::Rgb),
            b"DeviceGray" => Ok(SupportedColorSpace::Gray),
            b"DeviceCMYK" => Ok(SupportedColorSpace::Cmyk),
            _ => Err(CandidateSkipReason::Unsupported),
        },
        Object::Array(items) => items
            .first()
            .and_then(|item| item.as_name().ok())
            .map(|name| match name {
                b"DeviceRGB" => Ok(SupportedColorSpace::Rgb),
                b"DeviceGray" => Ok(SupportedColorSpace::Gray),
                b"DeviceCMYK" => Ok(SupportedColorSpace::Cmyk),
                _ => Err(CandidateSkipReason::Unsupported),
            })
            .unwrap_or(Err(CandidateSkipReason::Risky)),
        _ => Err(CandidateSkipReason::Risky),
    }
}

fn source_encoding(obj: &Object) -> Result<SourceEncoding, CandidateSkipReason> {
    let stream = obj
        .as_stream()
        .map_err(|_| CandidateSkipReason::Unsupported)?;
    let Ok(filters) = stream.filters() else {
        return Ok(SourceEncoding::Raw);
    };

    match filters.as_slice() {
        [] => Ok(SourceEncoding::Raw),
        [b"FlateDecode"] | [b"LZWDecode"] | [b"ASCII85Decode"] => Ok(SourceEncoding::Raw),
        [b"DCTDecode"] => Ok(SourceEncoding::Jpeg),
        _ => Err(CandidateSkipReason::Unsupported),
    }
}

pub fn discover_candidate(
    object_id: ObjectId,
    obj: &Object,
) -> Option<Result<ImageCandidate, CandidateSkipReason>> {
    let stream = obj.as_stream().ok()?;
    if stream
        .dict
        .get(b"Subtype")
        .ok()
        .and_then(|value| value.as_name().ok())
        != Some(b"Image".as_ref())
    {
        return None;
    }

    if has_risky_mask(obj) {
        return Some(Err(CandidateSkipReason::Risky));
    }

    if stream
        .dict
        .get(b"BitsPerComponent")
        .ok()
        .and_then(|value| value.as_i64().ok())
        .unwrap_or(8)
        != 8
    {
        return Some(Err(CandidateSkipReason::Unsupported));
    }

    let width = dict_u32(obj, b"Width");
    let height = dict_u32(obj, b"Height");
    if width == 0 || height == 0 {
        return Some(Err(CandidateSkipReason::Risky));
    }

    Some(image_color_space(obj).and_then(|color_space| {
        source_encoding(obj).map(|encoding| ImageCandidate {
            object_id,
            width,
            height,
            color_space,
            source_encoding: encoding,
            original_size: stream.content.len(),
        })
    }))
}
