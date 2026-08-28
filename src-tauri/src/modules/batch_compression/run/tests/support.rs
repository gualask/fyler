use std::collections::{HashMap, HashSet};
use std::io::Cursor;
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};

use image::{DynamicImage, ImageFormat, Rgb, RgbImage};
use lopdf::{dictionary, Document, Object, Stream};

use super::*;

#[derive(Clone, Default)]
pub(super) struct MemoryFileSystem {
    pub(super) state: Arc<Mutex<MemoryState>>,
}

#[derive(Default)]
pub(super) struct MemoryState {
    pub(super) directories: HashSet<PathBuf>,
    pub(super) files: HashMap<PathBuf, Vec<u8>>,
    pub(super) occupy_on_create: HashSet<PathBuf>,
}

impl MemoryFileSystem {
    pub(super) fn with_destination(path: &str) -> Self {
        let filesystem = Self::default();
        filesystem
            .state
            .lock()
            .unwrap()
            .directories
            .insert(PathBuf::from(path));
        filesystem
    }

    pub(super) fn put(&self, path: &str, bytes: Vec<u8>) {
        self.state
            .lock()
            .unwrap()
            .files
            .insert(PathBuf::from(path), bytes);
    }

    pub(super) fn add_destination(&self, path: &str) {
        self.state
            .lock()
            .unwrap()
            .directories
            .insert(PathBuf::from(path));
    }

    pub(super) fn get(&self, path: &str) -> Option<Vec<u8>> {
        self.state
            .lock()
            .unwrap()
            .files
            .get(Path::new(path))
            .cloned()
    }

    pub(super) fn occupy_on_create(&self, path: &str) {
        self.state
            .lock()
            .unwrap()
            .occupy_on_create
            .insert(PathBuf::from(path));
    }
}

impl BatchFileSystem for MemoryFileSystem {
    fn is_directory(&self, path: &Path) -> bool {
        self.state.lock().unwrap().directories.contains(path)
    }

    fn exists(&self, path: &Path) -> bool {
        self.state.lock().unwrap().files.contains_key(path)
    }

    fn read_limited(&self, path: &Path, max_bytes: u64) -> anyhow::Result<Vec<u8>> {
        let bytes = self
            .state
            .lock()
            .unwrap()
            .files
            .get(path)
            .cloned()
            .ok_or_else(|| anyhow::anyhow!("source missing"))?;
        anyhow::ensure!(bytes.len() as u64 <= max_bytes, "source over limit");
        Ok(bytes)
    }

    fn commit(&self, path: &Path, bytes: &[u8], mode: OutputCommitMode) -> anyhow::Result<()> {
        let mut state = self.state.lock().unwrap();
        if mode == OutputCommitMode::CreateNew && state.occupy_on_create.remove(path) {
            state.files.insert(path.to_path_buf(), b"intruder".to_vec());
        }
        if mode == OutputCommitMode::CreateNew && state.files.contains_key(path) {
            anyhow::bail!("occupied");
        }
        state.files.insert(path.to_path_buf(), bytes.to_vec());
        Ok(())
    }

    fn remove_owned(&self, path: &Path) -> anyhow::Result<()> {
        self.state.lock().unwrap().files.remove(path);
        Ok(())
    }
}

pub(super) fn png(seed: u8) -> Vec<u8> {
    let mut image = RgbImage::new(48, 48);
    for (index, pixel) in image.pixels_mut().enumerate() {
        *pixel = Rgb([
            seed.wrapping_add(index as u8),
            (index / 3) as u8,
            (index / 7) as u8,
        ]);
    }
    let mut bytes = Cursor::new(Vec::new());
    DynamicImage::ImageRgb8(image)
        .write_to(&mut bytes, ImageFormat::Png)
        .unwrap();
    bytes.into_inner()
}

pub(super) fn jpeg() -> Vec<u8> {
    let image = DynamicImage::ImageRgb8(RgbImage::from_pixel(48, 48, Rgb([30, 60, 90])));
    let mut bytes = Cursor::new(Vec::new());
    image.write_to(&mut bytes, ImageFormat::Jpeg).unwrap();
    bytes.into_inner()
}

pub(super) fn pdf(signed: bool) -> Vec<u8> {
    let mut document = Document::with_version("1.5");
    let pages_id = document.new_object_id();
    let content_id = document.add_object(Stream::new(dictionary! {}, Vec::new()));
    let page_id = document.add_object(dictionary! {
        "Type" => "Page",
        "Parent" => pages_id,
        "MediaBox" => vec![0.into(), 0.into(), 200.into(), 300.into()],
        "Resources" => dictionary! {},
        "Contents" => content_id,
    });
    document.objects.insert(
        pages_id,
        Object::Dictionary(dictionary! {
            "Type" => "Pages",
            "Kids" => vec![page_id.into()],
            "Count" => 1,
        }),
    );
    let catalog_id = document.add_object(dictionary! {
        "Type" => "Catalog",
        "Pages" => pages_id,
    });
    document.trailer.set("Root", catalog_id);
    if signed {
        document.add_object(dictionary! {
            "Type" => "Sig",
            "ByteRange" => vec![0.into(), 10.into(), 20.into(), 30.into()],
            "Contents" => Object::string_literal("signed"),
        });
    }
    let mut bytes = Vec::new();
    document.save_to(&mut bytes).unwrap();
    bytes
}

pub(super) fn settings(mode: StandaloneImageOutputMode) -> BatchCompressionSettings {
    BatchCompressionSettings {
        preset: CompressionPreset::Balanced,
        image_output_mode: mode,
        jpeg_quality: None,
        jpeg_background: [255, 255, 255],
    }
}

pub(super) fn request(
    files: &[(&str, &str)],
    mode: StandaloneImageOutputMode,
) -> BatchCompressionRequest {
    BatchCompressionRequest {
        destination_path: "destination".to_string(),
        files: files
            .iter()
            .map(|(source_id, source_path)| BatchFileRequest {
                source_id: (*source_id).to_string(),
                source_path: (*source_path).to_string(),
            })
            .collect(),
        settings: settings(mode),
    }
}
