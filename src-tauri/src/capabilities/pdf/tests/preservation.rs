use std::collections::BTreeMap;

use lopdf::{
    dictionary, Dictionary, Document, IncrementalDocument, Object, ObjectId, Stream, StringFormat,
};

fn text(value: &str) -> Object {
    Object::String(value.as_bytes().to_vec(), StringFormat::Literal)
}

fn normalized_object(mut object: Object) -> Object {
    if let Object::Stream(stream) = &mut object {
        stream.start_position = None;
    }
    object
}

pub(super) fn non_image_objects(doc: &Document) -> BTreeMap<ObjectId, Object> {
    doc.objects
        .iter()
        .filter(|(_, object)| {
            let kind = object.type_name().ok();
            let is_serialization_container =
                matches!(kind, Some(b"ObjStm" | b"XRef" | b"Linearized"));
            !is_serialization_container
                && object
                    .as_stream()
                    .ok()
                    .and_then(|stream| stream.dict.get(b"Subtype").ok())
                    .and_then(|value| value.as_name().ok())
                    != Some(b"Image")
        })
        .map(|(id, object)| (*id, normalized_object(object.clone())))
        .collect()
}

pub(super) fn feature_fixture() -> Document {
    let mut doc = Document::with_version("1.7");

    let content_id = doc.add_object(Stream::new(
        Dictionary::new(),
        b"q 20 0 0 20 10 10 cm /Im0 Do Q".to_vec(),
    ));
    let image_id = doc.add_object(Stream::new(
        dictionary! {
            "Type" => "XObject",
            "Subtype" => "Image",
            "Width" => 256,
            "Height" => 256,
            "ColorSpace" => "DeviceRGB",
            "BitsPerComponent" => 8,
        },
        vec![255; 256 * 256 * 3],
    ));

    let action_id = doc.add_object(dictionary! {
        "S" => "URI",
        "URI" => text("https://example.com"),
    });
    let annotation_id = doc.add_object(dictionary! {
        "Type" => "Annot",
        "Subtype" => "Link",
        "Rect" => vec![0.into(), 0.into(), 100.into(), 20.into()],
        "A" => action_id,
    });
    let field_id = doc.add_object(dictionary! {
        "FT" => "Tx",
        "T" => text("name"),
        "V" => text("Fyler"),
    });
    let acroform_id = doc.add_object(dictionary! {
        "Fields" => vec![field_id.into()],
    });

    let outline_item_id = doc.add_object(dictionary! {
        "Title" => text("First page"),
    });
    let outlines_id = doc.add_object(dictionary! {
        "Type" => "Outlines",
        "First" => outline_item_id,
        "Last" => outline_item_id,
        "Count" => 1,
    });

    let embedded_file_id = doc.add_object(Stream::new(
        dictionary! { "Type" => "EmbeddedFile" },
        b"attachment".to_vec(),
    ));
    let file_spec_id = doc.add_object(dictionary! {
        "Type" => "Filespec",
        "F" => text("note.txt"),
        "EF" => dictionary! { "F" => embedded_file_id },
    });
    let names_id = doc.add_object(dictionary! {
        "EmbeddedFiles" => dictionary! {
            "Names" => vec![text("note.txt"), file_spec_id.into()],
        },
    });

    let metadata_id = doc.add_object(Stream::new(
        dictionary! { "Type" => "Metadata", "Subtype" => "XML" },
        b"<x:xmpmeta xmlns:x='adobe:ns:meta/'>fyler</x:xmpmeta>".to_vec(),
    ));
    let struct_tree_id = doc.add_object(dictionary! {
        "Type" => "StructTreeRoot",
        "K" => Object::Array(vec![]),
    });

    let pages_id = doc.new_object_id();
    let page_id = doc.add_object(dictionary! {
        "Type" => "Page",
        "Parent" => pages_id,
        "MediaBox" => vec![0.into(), 0.into(), 300.into(), 400.into()],
        "Rotate" => 90,
        "Resources" => dictionary! {
            "XObject" => dictionary! { "Im0" => image_id },
        },
        "Contents" => content_id,
        "Annots" => vec![annotation_id.into()],
        "StructParents" => 0,
    });
    doc.objects.insert(
        pages_id,
        Object::Dictionary(dictionary! {
            "Type" => "Pages",
            "Kids" => vec![page_id.into()],
            "Count" => 1,
        }),
    );
    doc.get_dictionary_mut(outline_item_id)
        .expect("outline")
        .set("Dest", vec![page_id.into(), "Fit".into()]);

    let catalog_id = doc.add_object(dictionary! {
        "Type" => "Catalog",
        "Pages" => pages_id,
        "Outlines" => outlines_id,
        "AcroForm" => acroform_id,
        "Names" => names_id,
        "Metadata" => metadata_id,
        "StructTreeRoot" => struct_tree_id,
        "MarkInfo" => dictionary! { "Marked" => true },
    });
    let info_id = doc.add_object(dictionary! {
        "Title" => text("Preservation fixture"),
        "Author" => text("Fyler"),
    });
    doc.trailer.set("Root", catalog_id);
    doc.trailer.set("Info", info_id);
    doc
}

pub(super) fn incremental_feature_bytes() -> Vec<u8> {
    let mut source = feature_fixture();
    let mut modern_bytes = Vec::new();
    source
        .save_modern(&mut modern_bytes)
        .expect("save modern fixture");

    let previous = Document::load_mem(&modern_bytes).expect("load modern fixture");
    let info_id = previous
        .trailer
        .get(b"Info")
        .and_then(Object::as_reference)
        .expect("info reference");
    let mut incremental = IncrementalDocument::create_from(modern_bytes, previous);
    incremental
        .opt_clone_object_to_new_document(info_id)
        .expect("clone info into incremental revision");
    incremental
        .new_document
        .get_dictionary_mut(info_id)
        .expect("incremental info")
        .set("Producer", text("Fyler incremental fixture"));
    let mut incremental_bytes = Vec::new();
    incremental
        .save_to(&mut incremental_bytes)
        .expect("save incremental fixture");
    incremental_bytes
}

#[test]
fn direct_roundtrip_changes_only_the_selected_image_object() {
    let incremental_bytes = incremental_feature_bytes();
    let mut loaded = Document::load_mem(&incremental_bytes).expect("load incremental fixture");
    let before = non_image_objects(&loaded);
    let before_pages = loaded.get_pages();
    let (_, image) = loaded
        .objects
        .iter_mut()
        .find(|(_, object)| {
            object
                .as_stream()
                .ok()
                .and_then(|stream| stream.dict.get(b"Subtype").ok())
                .and_then(|value| value.as_name().ok())
                == Some(b"Image")
        })
        .expect("image object");
    let image = image.as_stream_mut().expect("image stream");
    image.dict.set("Width", 1);
    image.dict.set("Height", 1);
    image.set_content(vec![255, 255, 255]);

    let mut output = Vec::new();
    loaded.save_to(&mut output).expect("save direct roundtrip");
    let reloaded = Document::load_mem(&output).expect("reload output");

    assert_eq!(reloaded.get_pages(), before_pages);
    assert_eq!(non_image_objects(&reloaded), before);
    let catalog = reloaded.catalog().expect("catalog");
    for key in [
        b"Outlines".as_slice(),
        b"AcroForm",
        b"Names",
        b"Metadata",
        b"StructTreeRoot",
        b"MarkInfo",
    ] {
        assert!(
            catalog.has(key),
            "catalog lost {}",
            String::from_utf8_lossy(key)
        );
    }
}
