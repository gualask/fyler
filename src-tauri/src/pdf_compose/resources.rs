use lopdf::{Dictionary, Object};

/// Merges PDF resource dictionaries recursively.
///
/// When both sides contain a dictionary for the same key, dictionaries are merged; otherwise the
/// overlay value overwrites the target.
pub fn merge_resources(into: &mut Dictionary, overlay: &Dictionary) {
    for (key, overlay_value) in overlay.iter() {
        match (into.get(key), overlay_value) {
            (Ok(Object::Dictionary(into_dict)), Object::Dictionary(overlay_dict)) => {
                let mut merged = into_dict.clone();
                merge_resources(&mut merged, overlay_dict);
                into.set(key.clone(), Object::Dictionary(merged));
            }
            _ => {
                into.set(key.clone(), overlay_value.clone());
            }
        }
    }
}
