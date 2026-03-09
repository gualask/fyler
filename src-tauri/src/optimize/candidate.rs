use lopdf::Object;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SupportedColorSpace {
    Rgb,
    Gray,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum CandidateSkipReason {
    Unsupported,
    Risky,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct ImageCandidate {
    pub width: u32,
    pub height: u32,
    pub color_space: SupportedColorSpace,
}

fn dict_u32(obj: &Object, key: &[u8]) -> u32 {
    obj.as_stream()
        .ok()
        .and_then(|stream| stream.dict.get(key).ok())
        .and_then(|value| value.as_i64().ok())
        .unwrap_or(0) as u32
}

fn has_risky_mask(obj: &Object) -> bool {
    let Ok(stream) = obj.as_stream() else { return false };
    stream.dict.get(b"Mask").is_ok() || stream.dict.get(b"SMask").is_ok()
}

fn has_supported_filters(obj: &Object) -> bool {
    let Ok(stream) = obj.as_stream() else { return false };
    match stream.filters() {
        Ok(filters) => filters
            .iter()
            .all(|filter| matches!(*filter, b"FlateDecode" | b"LZWDecode" | b"ASCII85Decode")),
        Err(_) => true,
    }
}

fn image_color_space(obj: &Object) -> Result<SupportedColorSpace, CandidateSkipReason> {
    let stream = obj.as_stream().map_err(|_| CandidateSkipReason::Unsupported)?;
    let color_space = stream
        .dict
        .get(b"ColorSpace")
        .map_err(|_| CandidateSkipReason::Risky)?;
    match color_space.as_name() {
        Ok(b"DeviceRGB") => Ok(SupportedColorSpace::Rgb),
        Ok(b"DeviceGray") => Ok(SupportedColorSpace::Gray),
        Ok(_) => Err(CandidateSkipReason::Unsupported),
        Err(_) => Err(CandidateSkipReason::Risky),
    }
}

pub fn discover_candidate(obj: &Object) -> Option<Result<ImageCandidate, CandidateSkipReason>> {
    let stream = obj.as_stream().ok()?;
    if stream.dict.get(b"Subtype").ok().and_then(|value| value.as_name().ok()) != Some(b"Image".as_ref()) {
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
        .unwrap_or(8) != 8
    {
        return Some(Err(CandidateSkipReason::Unsupported));
    }

    if !has_supported_filters(obj) {
        return Some(Err(CandidateSkipReason::Unsupported));
    }

    let width = dict_u32(obj, b"Width");
    let height = dict_u32(obj, b"Height");
    if width == 0 || height == 0 {
        return Some(Err(CandidateSkipReason::Risky));
    }

    Some(image_color_space(obj).map(|color_space| ImageCandidate {
        width,
        height,
        color_space,
    }))
}
