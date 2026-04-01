use anyhow::{Context, Result};
use lopdf::{Document as PdfDoc, Object, ObjectId, Stream};

/// Copies objects from a source PDF into a destination PDF, rewriting indirect references.
///
/// The `memo` map ensures each source object is copied at most once.
pub struct ObjectCopier<'a> {
    dest: &'a mut PdfDoc,
    source: &'a PdfDoc,
    memo: &'a mut std::collections::HashMap<ObjectId, ObjectId>,
}

impl<'a> ObjectCopier<'a> {
    /// Creates a new copier. The caller owns `memo` so it can be reused across multiple pages.
    pub fn new(
        dest: &'a mut PdfDoc,
        source: &'a PdfDoc,
        memo: &'a mut std::collections::HashMap<ObjectId, ObjectId>,
    ) -> Self {
        Self { dest, source, memo }
    }

    fn copy_reference(&mut self, source_id: ObjectId) -> Result<ObjectId> {
        if let Some(existing) = self.memo.get(&source_id).copied() {
            return Ok(existing);
        }

        let dest_id = self.dest.new_object_id();
        self.memo.insert(source_id, dest_id);

        let object = self
            .source
            .get_object(source_id)
            .with_context(|| format!("missing source object {:?}", source_id))?
            .clone();
        let rewritten = self.rewrite_object(&object)?;
        self.dest.objects.insert(dest_id, rewritten);
        Ok(dest_id)
    }

    /// Rewrites an object by copying referenced objects into the destination document.
    pub fn rewrite_object(&mut self, object: &Object) -> Result<Object> {
        Ok(match object {
            Object::Reference(source_id) => Object::Reference(self.copy_reference(*source_id)?),
            Object::Array(items) => Object::Array(
                items
                    .iter()
                    .map(|item| self.rewrite_object(item))
                    .collect::<Result<Vec<_>>>()?,
            ),
            Object::Dictionary(dict) => Object::Dictionary(self.rewrite_dictionary(dict)?),
            Object::Stream(stream) => Object::Stream(self.rewrite_stream(stream)?),
            other => other.clone(),
        })
    }

    /// Rewrites a dictionary by rewriting all nested values and references.
    pub fn rewrite_dictionary(&mut self, dict: &lopdf::Dictionary) -> Result<lopdf::Dictionary> {
        let mut out = lopdf::Dictionary::new();
        for (key, value) in dict.iter() {
            out.set(key.clone(), self.rewrite_object(value)?);
        }
        Ok(out)
    }

    fn rewrite_stream(&mut self, stream: &Stream) -> Result<Stream> {
        let dict = self.rewrite_dictionary(&stream.dict)?;
        Ok(Stream::new(dict, stream.content.clone()))
    }
}
