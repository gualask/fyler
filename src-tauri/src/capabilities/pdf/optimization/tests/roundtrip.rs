use super::*;

#[test]
fn cleanup_preserves_referenced_zero_length_streams() {
    let mut doc = PdfDoc::with_version("1.4");
    let pages_id = doc.new_object_id();
    let contents_id = doc.add_object(Stream::new(dictionary! {}, Vec::new()));
    let page_id = doc.add_object(dictionary! {
        "Type" => "Page",
        "Parent" => pages_id,
        "Contents" => contents_id,
        "MediaBox" => vec![0.into(), 0.into(), 10.into(), 10.into()],
    });
    doc.objects.insert(
        pages_id,
        Object::Dictionary(dictionary! {
            "Type" => "Pages",
            "Count" => 1,
            "Kids" => vec![page_id.into()],
        }),
    );
    let catalog_id = doc.add_object(dictionary! {
        "Type" => "Catalog",
        "Pages" => pages_id,
    });
    doc.trailer.set("Root", catalog_id);

    cleanup_document(&mut doc);

    assert!(doc.objects.contains_key(&contents_id));
    assert!(doc
        .objects
        .get(&contents_id)
        .and_then(|object| object.as_stream().ok())
        .is_some_and(|stream| stream.content.is_empty()));
}

#[test]
fn cleanup_and_save_roundtrip_with_empty_contents_stream() -> Result<()> {
    let mut doc = PdfDoc::with_version("1.4");
    let pages_id = doc.new_object_id();
    let contents_id = doc.add_object(Stream::new(dictionary! {}, Vec::new()));
    let page_id = doc.add_object(dictionary! {
        "Type" => "Page",
        "Parent" => pages_id,
        "Contents" => contents_id,
        "MediaBox" => vec![0.into(), 0.into(), 10.into(), 10.into()],
    });
    doc.objects.insert(
        pages_id,
        Object::Dictionary(dictionary! {
            "Type" => "Pages",
            "Count" => 1,
            "Kids" => vec![page_id.into()],
        }),
    );
    let catalog_id = doc.add_object(dictionary! {
        "Type" => "Catalog",
        "Pages" => pages_id,
    });
    doc.trailer.set("Root", catalog_id);

    cleanup_document(&mut doc);

    let output = temp_output_path("empty-contents-roundtrip");
    let mut file = File::create(&output)?;
    save_document(&mut doc, &mut file)?;
    drop(file);

    let reloaded = PdfDoc::load(&output)?;
    assert_eq!(reloaded.get_pages().len(), 1);
    Ok(())
}

#[test]
fn save_document_roundtrip_uses_classic_writer() -> Result<()> {
    let mut doc = page_doc(
        image_stream(b"DeviceRGB", 2, 2, vec![0; 12], None, Dictionary::new()),
        72.0,
        72.0,
    );
    assert_eq!(doc.version, "1.4");

    let bytes = saved_document_bytes(&mut doc, "classic-writer-roundtrip")?;
    assert!(bytes.starts_with(b"%PDF-1.4"));
    assert!(!contains_object_stream(&bytes));
    Ok(())
}

#[test]
fn optimized_cmyk_jpeg_roundtrip_stays_loadable() -> Result<()> {
    let width: u16 = 32;
    let height: u16 = 32;
    let mut jpeg = Vec::new();
    let raw = [0, 255, 255, 0, 255, 0, 255, 0].repeat(usize::from((width * height) / 2));
    Encoder::new(&mut jpeg, 95).encode(&raw, width, height, ColorType::Cmyk)?;

    let mut doc = page_doc(
        image_stream(
            b"DeviceCMYK",
            u32::from(width),
            u32::from(height),
            jpeg,
            Some(b"DCTDecode"),
            Dictionary::new(),
        ),
        72.0,
        72.0,
    );

    optimize_images(
        &mut doc,
        &OptimizationOptions {
            jpeg_quality: Some(70),
            target_dpi: None,
        },
    )?;
    cleanup_document(&mut doc);

    let output = temp_output_path("cmyk-roundtrip");
    let mut file = File::create(&output)?;
    save_document(&mut doc, &mut file)?;
    drop(file);

    let bytes = fs::read(&output)?;
    assert!(bytes.starts_with(b"%PDF-1.4"));
    assert!(!contains_object_stream(&bytes));

    let reloaded = PdfDoc::load(&output)?;
    assert_eq!(reloaded.get_pages().len(), 1);
    let stream = first_image_stream(&reloaded);
    assert_eq!(stream.dict.get(b"ColorSpace")?.as_name()?, b"DeviceCMYK");
    assert_eq!(stream.dict.get(b"Filter")?.as_name()?, b"DCTDecode");
    assert_eq!(stream.dict.get(b"Width")?.as_i64()?, i64::from(width));
    assert_eq!(stream.dict.get(b"Height")?.as_i64()?, i64::from(height));
    Ok(())
}
