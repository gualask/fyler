use std::collections::{HashMap, HashSet};

use lopdf::{
    content::{Content, Operation},
    Dictionary, Document as PdfDoc, Object, ObjectId,
};

#[derive(Debug, Clone, Copy, Default)]
/// Observed drawn size for an image, expressed in PDF points.
pub struct ImageUsage {
    pub drawn_width_pt: f32,
    pub drawn_height_pt: f32,
}

#[derive(Debug, Clone, Copy)]
struct AffineTransform {
    a: f32,
    b: f32,
    c: f32,
    d: f32,
    e: f32,
    f: f32,
}

impl Default for AffineTransform {
    fn default() -> Self {
        Self::identity()
    }
}

impl AffineTransform {
    fn identity() -> Self {
        Self {
            a: 1.0,
            b: 0.0,
            c: 0.0,
            d: 1.0,
            e: 0.0,
            f: 0.0,
        }
    }

    fn from_operands(operands: &[Object]) -> Option<Self> {
        if operands.len() != 6 {
            return None;
        }

        Some(Self {
            a: number(&operands[0])?,
            b: number(&operands[1])?,
            c: number(&operands[2])?,
            d: number(&operands[3])?,
            e: number(&operands[4])?,
            f: number(&operands[5])?,
        })
    }

    fn from_array(obj: &Object) -> Option<Self> {
        let items = obj.as_array().ok()?;
        Self::from_operands(items)
    }

    fn concat(self, next: Self) -> Self {
        Self {
            a: self.a * next.a + self.b * next.c,
            b: self.a * next.b + self.b * next.d,
            c: self.c * next.a + self.d * next.c,
            d: self.c * next.b + self.d * next.d,
            e: self.e * next.a + self.f * next.c + next.e,
            f: self.e * next.b + self.f * next.d + next.f,
        }
    }

    fn axis_lengths(self) -> (f32, f32) {
        let width = (self.a.mul_add(self.a, self.b * self.b)).sqrt();
        let height = (self.c.mul_add(self.c, self.d * self.d)).sqrt();
        (width.abs(), height.abs())
    }
}

#[derive(Debug, Clone, Default)]
struct ResourceMap {
    xobjects: HashMap<Vec<u8>, ObjectId>,
}

#[derive(Debug, Clone, Copy)]
struct FormXObject {
    object_id: ObjectId,
    matrix: AffineTransform,
}

enum XObjectKind {
    Image(ObjectId),
    Form(FormXObject),
}

/// Collects where and how large each embedded image is drawn across the document.
///
/// The result is used to estimate effective DPI and decide whether a downscale is worthwhile.
pub fn analyze_image_usages(doc: &PdfDoc) -> HashMap<ObjectId, Vec<ImageUsage>> {
    let mut usages = HashMap::new();
    for page_id in doc.get_pages().into_values() {
        let resources = page_resources(doc, page_id);
        let Ok(content) = doc.get_and_decode_page_content(page_id) else {
            continue;
        };
        let mut active_forms = HashSet::new();
        walk_operations(
            doc,
            &resources,
            &content.operations,
            AffineTransform::identity(),
            &mut usages,
            &mut active_forms,
        );
    }
    usages
}

fn walk_operations(
    doc: &PdfDoc,
    resources: &ResourceMap,
    operations: &[Operation],
    initial_ctm: AffineTransform,
    usages: &mut HashMap<ObjectId, Vec<ImageUsage>>,
    active_forms: &mut HashSet<ObjectId>,
) {
    let mut current_ctm = initial_ctm;
    let mut stack = Vec::new();

    for operation in operations {
        match operation.operator.as_str() {
            "q" => stack.push(current_ctm),
            "Q" => {
                if let Some(previous) = stack.pop() {
                    current_ctm = previous;
                }
            }
            "cm" => {
                if let Some(next) = AffineTransform::from_operands(&operation.operands) {
                    current_ctm = current_ctm.concat(next);
                }
            }
            "Do" => {
                let Some(name) = operation
                    .operands
                    .first()
                    .and_then(|operand| operand.as_name().ok())
                else {
                    continue;
                };
                let Some(object_id) = resources.xobjects.get(name).copied() else {
                    continue;
                };
                match resolve_xobject(doc, object_id) {
                    Some(XObjectKind::Image(image_id)) => {
                        let (drawn_width_pt, drawn_height_pt) = current_ctm.axis_lengths();
                        if drawn_width_pt > 0.0 && drawn_height_pt > 0.0 {
                            usages.entry(image_id).or_default().push(ImageUsage {
                                drawn_width_pt,
                                drawn_height_pt,
                            });
                        }
                    }
                    Some(XObjectKind::Form(form)) => {
                        if !active_forms.insert(form.object_id) {
                            continue;
                        }
                        if let Some((form_resources, form_content)) =
                            decode_form(doc, form.object_id, resources)
                        {
                            walk_operations(
                                doc,
                                &form_resources,
                                &form_content.operations,
                                current_ctm.concat(form.matrix),
                                usages,
                                active_forms,
                            );
                        }
                        active_forms.remove(&form.object_id);
                    }
                    None => {}
                }
            }
            _ => {}
        }
    }
}

fn decode_form(
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

fn resolve_xobject(doc: &PdfDoc, object_id: ObjectId) -> Option<XObjectKind> {
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

fn page_resources(doc: &PdfDoc, page_id: ObjectId) -> ResourceMap {
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

fn number(obj: &Object) -> Option<f32> {
    obj.as_f32().ok().or_else(|| obj.as_float().ok())
}
