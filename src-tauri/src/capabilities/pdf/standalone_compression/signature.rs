use lopdf::{Dictionary, Document, Object};

pub(super) fn contains_digital_signature(document: &Document) -> bool {
    document.objects.values().any(object_contains_signature)
}

fn object_contains_signature(object: &Object) -> bool {
    match object {
        Object::Dictionary(dictionary) => dictionary_contains_signature(dictionary),
        Object::Stream(stream) => dictionary_contains_signature(&stream.dict),
        Object::Array(items) => items.iter().any(object_contains_signature),
        _ => false,
    }
}

fn dictionary_contains_signature(dictionary: &Dictionary) -> bool {
    let has_contents = dictionary.get(b"Contents").is_ok();
    let is_signature_type = dictionary
        .get(b"Type")
        .ok()
        .and_then(|value| value.as_name().ok())
        == Some(b"Sig".as_slice());
    let has_byte_range = dictionary
        .get(b"ByteRange")
        .ok()
        .and_then(|value| value.as_array().ok())
        .is_some_and(|range| {
            range.len() >= 4
                && range
                    .iter()
                    .all(|value| value.as_i64().is_ok_and(|number| number >= 0))
        });

    (has_contents && (is_signature_type || has_byte_range))
        || dictionary.iter().any(|(_, object)| match object {
            Object::Reference(_) => false,
            object => object_contains_signature(object),
        })
}

#[cfg(test)]
mod tests {
    use lopdf::{dictionary, Document, Object, StringFormat};

    use super::contains_digital_signature;

    #[test]
    fn detects_a_signature_dictionary() {
        let mut document = Document::new();
        document.add_object(dictionary! {
            "Type" => "Sig",
            "ByteRange" => vec![0.into(), 10.into(), 20.into(), 30.into()],
            "Contents" => Object::String(vec![1, 2, 3], StringFormat::Hexadecimal),
        });

        assert!(contains_digital_signature(&document));
    }

    #[test]
    fn blank_signature_fields_are_not_treated_as_signed() {
        let mut document = Document::new();
        document.add_object(dictionary! {
            "FT" => "Sig",
            "T" => Object::string_literal("Approval"),
        });

        assert!(!contains_digital_signature(&document));
    }
}
