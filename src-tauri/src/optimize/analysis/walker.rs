use std::collections::{HashMap, HashSet};

use lopdf::{content::Operation, Document as PdfDoc, ObjectId};

use super::resources::{decode_form, resolve_xobject, FormXObject, ResourceMap, XObjectKind};
use super::transform::AffineTransform;
use super::ImageUsage;

fn restore_graphics_state(stack: &mut Vec<AffineTransform>, current_ctm: &mut AffineTransform) {
    if let Some(previous) = stack.pop() {
        *current_ctm = previous;
    }
}

fn concat_operation_transform(operation: &Operation, current_ctm: &mut AffineTransform) {
    if let Some(next) = AffineTransform::from_operands(&operation.operands) {
        *current_ctm = current_ctm.concat(next);
    }
}

fn operation_xobject_id(resources: &ResourceMap, operation: &Operation) -> Option<ObjectId> {
    let name = operation
        .operands
        .first()
        .and_then(|operand| operand.as_name().ok())?;
    resources.xobject_id(name)
}

pub(super) fn walk_operations(
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
            "Q" => restore_graphics_state(&mut stack, &mut current_ctm),
            "cm" => concat_operation_transform(operation, &mut current_ctm),
            "Do" => {
                let Some(object_id) = operation_xobject_id(resources, operation) else {
                    continue;
                };
                walk_xobject(doc, resources, object_id, current_ctm, usages, active_forms);
            }
            _ => {}
        }
    }
}

fn walk_xobject(
    doc: &PdfDoc,
    resources: &ResourceMap,
    object_id: ObjectId,
    current_ctm: AffineTransform,
    usages: &mut HashMap<ObjectId, Vec<ImageUsage>>,
    active_forms: &mut HashSet<ObjectId>,
) {
    match resolve_xobject(doc, object_id) {
        Some(XObjectKind::Image(image_id)) => record_image_usage(usages, image_id, current_ctm),
        Some(XObjectKind::Form(form)) => {
            walk_form_xobject(doc, resources, form, current_ctm, usages, active_forms);
        }
        None => {}
    }
}

fn record_image_usage(
    usages: &mut HashMap<ObjectId, Vec<ImageUsage>>,
    image_id: ObjectId,
    current_ctm: AffineTransform,
) {
    let (drawn_width_pt, drawn_height_pt) = current_ctm.axis_lengths();
    if drawn_width_pt <= 0.0 || drawn_height_pt <= 0.0 {
        return;
    }

    usages.entry(image_id).or_default().push(ImageUsage {
        drawn_width_pt,
        drawn_height_pt,
    });
}

fn walk_form_xobject(
    doc: &PdfDoc,
    fallback_resources: &ResourceMap,
    form: FormXObject,
    current_ctm: AffineTransform,
    usages: &mut HashMap<ObjectId, Vec<ImageUsage>>,
    active_forms: &mut HashSet<ObjectId>,
) {
    if !active_forms.insert(form.object_id) {
        return;
    }

    if let Some((form_resources, form_content)) =
        decode_form(doc, form.object_id, fallback_resources)
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
