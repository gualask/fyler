use std::fs;
use std::path::Path;

use crate::modules::support::TextFileWriter;

/// Filesystem implementation of support's text-writer port.
#[derive(Clone, Copy, Default)]
pub(crate) struct TextFileOutput;

impl TextFileWriter for TextFileOutput {
    fn write(&self, path: &Path, content: &str) -> anyhow::Result<()> {
        fs::write(path, content).map_err(anyhow::Error::from)
    }
}

#[cfg(test)]
mod tests {
    use std::fs;

    use super::{TextFileOutput, TextFileWriter};

    #[test]
    fn text_output_writes_support_content() {
        let path =
            std::env::temp_dir().join(format!("fyler-support-text-{}.txt", uuid::Uuid::new_v4()));
        TextFileOutput
            .write(&path, "diagnostic details")
            .expect("support text should be written");

        assert_eq!(
            fs::read_to_string(&path).expect("read support text"),
            "diagnostic details"
        );
        let _ = fs::remove_file(path);
    }
}
