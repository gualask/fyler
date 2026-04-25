use std::collections::HashMap;

use lopdf::{
    content::{Content, Operation},
    Dictionary, Document as PdfDoc, Object, ObjectId,
};

use super::transform::AffineTransform;

#[derive(Debug, Clone, Default)]
pub(super) struct ResourceMap {
    xobjects: HashMap<Vec<u8>, ObjectId>,
}

impl ResourceMap {
    pub(super) fn xobject_id(&self, name: &[u8]) -> Option<ObjectId> {
        self.xobjects.get(name).copied()
    }
}

#[derive(Debug, Clone, Copy)]
pub(super) struct FormXObject {
    pub(super) object_id: ObjectId,
    pub(super) matrix: AffineTransform,
}

pub(super) enum XObjectKind {
    Image(ObjectId),
    Form(FormXObject),
}

pub(super) fn decode_form(
    doc: &PdfDoc,
    object_id: ObjectId,
    fallback_resources: &ResourceMap,
) -> Option<(ResourceMap, Content<Vec<Operation>>)> {
    let stream = doc.get_object(object_id).ok()?.as_stream().ok()?;
    let resources = if let Ok(dict) = stream.dict.get(b"Resources").and_then(Object::as_dict) {
        resources_from_dict(doc, Some(dict), &[])
    } else if let Ok(resource_id) = stream.dict.get(b"Resources").and_then(Object::as_reference) {
        resources_from_dict(doc, None, &[resource_id])
    } else {
        fallback_resources.clone()
    };
    let content = stream.decode_content().ok()?;
    Some((resources, content))
}

pub(super) fn resolve_xobject(doc: &PdfDoc, object_id: ObjectId) -> Option<XObjectKind> {
    let stream = doc.get_object(object_id).ok()?.as_stream().ok()?;
    match stream.dict.get(b"Subtype").ok()?.as_name().ok()? {
        b"Image" => Some(XObjectKind::Image(object_id)),
        b"Form" => {
            let matrix = stream
                .dict
                .get(b"Matrix")
                .ok()
                .and_then(AffineTransform::from_array)
                .unwrap_or_else(AffineTransform::identity);
            Some(XObjectKind::Form(FormXObject { object_id, matrix }))
        }
        _ => None,
    }
}

pub(super) fn page_resources(doc: &PdfDoc, page_id: ObjectId) -> ResourceMap {
    let Ok((resource_dict, resource_ids)) = doc.get_page_resources(page_id) else {
        return ResourceMap::default();
    };
    resources_from_dict(doc, resource_dict, &resource_ids)
}

fn resources_from_dict(
    doc: &PdfDoc,
    direct_dict: Option<&Dictionary>,
    resource_ids: &[ObjectId],
) -> ResourceMap {
    let mut map = ResourceMap::default();

    for resource_id in resource_ids.iter().rev().copied() {
        if let Ok(resources) = doc.get_dictionary(resource_id) {
            collect_xobjects(doc, resources, &mut map);
        }
    }
    if let Some(resources) = direct_dict {
        collect_xobjects(doc, resources, &mut map);
    }

    map
}

fn collect_xobjects(doc: &PdfDoc, resources: &Dictionary, map: &mut ResourceMap) {
    let Ok(xobject) = resources.get(b"XObject") else {
        return;
    };
    let xobject_dict = match xobject {
        Object::Reference(id) => match doc.get_dictionary(*id) {
            Ok(dict) => dict,
            Err(_) => return,
        },
        Object::Dictionary(dict) => dict,
        _ => return,
    };

    for (name, value) in xobject_dict.iter() {
        if let Ok(reference) = value.as_reference() {
            map.xobjects.insert(name.clone(), reference);
        }
    }
}
