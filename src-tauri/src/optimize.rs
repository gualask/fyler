use image::{imageops, imageops::FilterType, RgbImage};
use lopdf::{Dictionary, Document as PdfDoc, Object};

use crate::models::OptimizeOptions;

fn jpeg_quality(q: &str) -> u8 {
    match q {
        "high" => 90,
        "medium" => 75,
        _ => 55,
    }
}

fn encode_jpeg(rgb: &[u8], w: u32, h: u32, quality: u8) -> Result<Vec<u8>, String> {
    use image::codecs::jpeg::JpegEncoder;
    use image::ImageEncoder;
    let mut buf = Vec::with_capacity((w as usize * h as usize) / 8);
    JpegEncoder::new_with_quality(&mut buf, quality)
        .write_image(rgb, w, h, image::ExtendedColorType::Rgb8)
        .map_err(|e| e.to_string())?;
    Ok(buf)
}

fn dict_u32(dict: &Dictionary, key: &[u8]) -> u32 {
    dict.get(key).ok()
        .and_then(|o| o.as_i64().ok())
        .unwrap_or(0) as u32
}

fn is_rgb_image_stream(obj: &lopdf::Object) -> bool {
    let Ok(s) = obj.as_stream() else { return false };
    s.dict.get(b"Subtype").ok().and_then(|o| o.as_name().ok()) == Some(b"Image".as_ref())
        && s.dict.get(b"ColorSpace").ok().and_then(|o| o.as_name().ok()) == Some(b"DeviceRGB".as_ref())
}

pub fn optimize_images(doc: &mut PdfDoc, opts: &OptimizeOptions) -> Result<(), String> {
    // Pre-scansione sui dict (senza decomprimere): evita decompress/compress se non ci sono immagini RGB
    if !doc.objects.values().any(is_rgb_image_stream) {
        return Ok(());
    }

    doc.decompress();

    let image_ids: Vec<lopdf::ObjectId> = doc
        .objects
        .iter()
        .filter_map(|(&id, obj)| is_rgb_image_stream(obj).then_some(id))
        .collect();

    for id in image_ids {
        let obj = doc.objects.get_mut(&id).ok_or("oggetto non trovato")?;
        let stream = obj.as_stream_mut().map_err(|e| e.to_string())?;

        let w = dict_u32(&stream.dict, b"Width");
        let h = dict_u32(&stream.dict, b"Height");
        if w == 0 || h == 0 {
            continue;
        }

        let raw = stream.content.clone();
        if raw.len() != (w * h * 3) as usize {
            continue; // skip se già compressi o dimensioni incoerenti
        }

        let mut img = RgbImage::from_raw(w, h, raw)
            .ok_or("impossibile costruire l'immagine")?;

        // Resize opzionale
        let did_resize = if let Some(max_px) = opts.max_px {
            let long_side = w.max(h);
            if long_side > max_px {
                let scale = max_px as f64 / long_side as f64;
                let nw = (w as f64 * scale) as u32;
                let nh = (h as f64 * scale) as u32;
                img = imageops::resize(&img, nw, nh, FilterType::Lanczos3);
                true
            } else {
                false
            }
        } else {
            false
        };

        // Se né resize né jpeg si applicano a questa immagine, salta
        if !did_resize && opts.jpeg_quality.is_none() {
            continue;
        }

        let (nw, nh) = (img.width(), img.height());

        if let Some(q) = &opts.jpeg_quality {
            // Lossy: re-encoding JPEG
            let jpeg = encode_jpeg(&img.into_raw(), nw, nh, jpeg_quality(q))?;
            stream.content = jpeg;
            stream.dict.remove(b"Filter");
            stream.dict.set("Filter", Object::Name(b"DCTDecode".to_vec()));
        } else {
            // Solo resize: raw RGB, compress() applicherà FlateDecode
            stream.content = img.into_raw();
            stream.dict.remove(b"Filter");
        }

        stream.dict.set("Width", Object::Integer(nw as i64));
        stream.dict.set("Height", Object::Integer(nh as i64));
    }

    Ok(())
}
