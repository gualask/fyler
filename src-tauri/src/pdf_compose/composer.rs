use anyhow::{Context, Result};
use lopdf::{Document as PdfDoc, Object, ObjectId};

use crate::models::OptimizeOptions;

use super::object_copier::ObjectCopier;
use super::page_effective::effective_page_dictionary;

pub struct PdfComposer {
    doc: PdfDoc,
    page_ids: Vec<ObjectId>,
}

impl PdfComposer {
    pub fn new() -> Self {
        Self {
            doc: PdfDoc::with_version("1.5"),
            page_ids: Vec::new(),
        }
    }

    pub fn push_image_page(
        &mut self,
        path: &str,
        image_fit: &str,
        quarter_turns: u8,
        optimize: Option<&OptimizeOptions>,
    ) -> Result<()> {
        let page_id = crate::pdf::append_image_as_page(
            &mut self.doc,
            path,
            image_fit,
            quarter_turns,
            optimize,
        )
        .with_context(|| format!("append image page: {}", path))?;
        self.page_ids.push(page_id);
        Ok(())
    }

    pub fn push_pdf_page(
        &mut self,
        source: &PdfDoc,
        memo: &mut std::collections::HashMap<ObjectId, ObjectId>,
        source_name: &str,
        page_num: u32,
        quarter_turns: u8,
    ) -> Result<()> {
        let source_page_id = *source
            .get_pages()
            .get(&page_num)
            .with_context(|| format!("missing page {page_num} in {source_name}"))?;

        let effective =
            effective_page_dictionary(source, source_page_id, source_name, quarter_turns)
                .with_context(|| {
                    format!("build effective page dict for {source_name}:{page_num}")
                })?;

        let mut copier = ObjectCopier::new(&mut self.doc, source, memo);
        let rewritten = copier.rewrite_dictionary(&effective)?;

        let page_id = self.doc.add_object(Object::Dictionary(rewritten));
        self.page_ids.push(page_id);
        Ok(())
    }

    pub fn finish(mut self) -> Result<PdfDoc> {
        let pages_id = self.doc.new_object_id();

        for page_id in &self.page_ids {
            let object = self
                .doc
                .objects
                .get_mut(page_id)
                .with_context(|| format!("missing composed page object {:?}", page_id))?;
            let dict = object.as_dict_mut().context("page is not a dictionary")?;
            dict.set("Parent", Object::Reference(pages_id));
            dict.set("Type", Object::Name(b"Page".to_vec()));
        }

        let kids = self
            .page_ids
            .iter()
            .copied()
            .map(Object::Reference)
            .collect::<Vec<_>>();

        let mut pages = lopdf::Dictionary::new();
        pages.set("Type", Object::Name(b"Pages".to_vec()));
        pages.set("Kids", Object::Array(kids));
        pages.set("Count", Object::Integer(self.page_ids.len() as i64));
        self.doc.objects.insert(pages_id, Object::Dictionary(pages));

        let mut catalog = lopdf::Dictionary::new();
        catalog.set("Type", Object::Name(b"Catalog".to_vec()));
        catalog.set("Pages", Object::Reference(pages_id));
        let catalog_id = self.doc.add_object(Object::Dictionary(catalog));
        self.doc.trailer.set("Root", Object::Reference(catalog_id));

        Ok(self.doc)
    }
}
