use anyhow::{Context, Result};
use lopdf::{Document as PdfDoc, Object, ObjectId, Stream};
use std::collections::HashMap;

/// Copies objects from a source PDF into a destination PDF, rewriting indirect references.
///
/// The `memo` map ensures each source object is copied at most once.
pub struct ObjectCopier<'a> {
    dest: &'a mut PdfDoc,
    source: &'a PdfDoc,
    memo: &'a mut HashMap<ObjectId, ObjectId>,
}

impl<'a> ObjectCopier<'a> {
    /// Creates a new copier. The caller owns `memo` so it can be reused across multiple pages.
    pub fn new(
        dest: &'a mut PdfDoc,
        source: &'a PdfDoc,
        memo: &'a mut HashMap<ObjectId, ObjectId>,
    ) -> Self {
        Self { dest, source, memo }
    }

    /// Rewrites a dictionary by rewriting all nested values and references.
    pub fn rewrite_dictionary(&mut self, dict: &lopdf::Dictionary) -> Result<lopdf::Dictionary> {
        rewrite_dictionary(self.dest, self.source, self.memo, dict)
    }
}

fn copy_reference(
    dest: &mut PdfDoc,
    source: &PdfDoc,
    memo: &mut HashMap<ObjectId, ObjectId>,
    source_id: ObjectId,
) -> Result<ObjectId> {
    if let Some(existing) = memo.get(&source_id).copied() {
        return Ok(existing);
    }

    let dest_id = dest.new_object_id();
    memo.insert(source_id, dest_id);

    let object = source
        .get_object(source_id)
        .with_context(|| format!("missing source object {:?}", source_id))?;
    let rewritten = rewrite_object(dest, source, memo, object)?;
    dest.objects.insert(dest_id, rewritten);
    Ok(dest_id)
}

fn rewrite_object(
    dest: &mut PdfDoc,
    source: &PdfDoc,
    memo: &mut HashMap<ObjectId, ObjectId>,
    object: &Object,
) -> Result<Object> {
    Ok(match object {
        Object::Reference(source_id) => {
            Object::Reference(copy_reference(dest, source, memo, *source_id)?)
        }
        Object::Array(items) => Object::Array(
            items
                .iter()
                .map(|item| rewrite_object(dest, source, memo, item))
                .collect::<Result<Vec<_>>>()?,
        ),
        Object::Dictionary(dict) => {
            Object::Dictionary(rewrite_dictionary(dest, source, memo, dict)?)
        }
        Object::Stream(stream) => Object::Stream(rewrite_stream(dest, source, memo, stream)?),
        other => other.clone(),
    })
}

fn rewrite_dictionary(
    dest: &mut PdfDoc,
    source: &PdfDoc,
    memo: &mut HashMap<ObjectId, ObjectId>,
    dict: &lopdf::Dictionary,
) -> Result<lopdf::Dictionary> {
    let mut out = lopdf::Dictionary::new();
    for (key, value) in dict.iter() {
        out.set(key.clone(), rewrite_object(dest, source, memo, value)?);
    }
    Ok(out)
}

fn rewrite_stream(
    dest: &mut PdfDoc,
    source: &PdfDoc,
    memo: &mut HashMap<ObjectId, ObjectId>,
    stream: &Stream,
) -> Result<Stream> {
    let dict = rewrite_dictionary(dest, source, memo, &stream.dict)?;
    Ok(Stream::new(dict, stream.content.clone()))
}
