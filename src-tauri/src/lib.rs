//! Fyler's native backend (Tauri).
//!
//! This crate exposes a small set of Tauri commands used by the frontend to:
//! - import sources (PDFs/images)
//! - compose and export a merged PDF
//! - compute export previews and persist user settings

use tauri::Emitter;

mod commands;
mod error;
mod export;
mod models;
mod optimize;
mod pdf;
mod pdf_compose;
mod pdf_image;
mod settings;
mod source_registry;
mod vo;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
/// Boots the Tauri app and registers all commands/plugins.
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .manage(source_registry::SourceRegistry::default())
        .setup(|app| {
            let handle = app.handle().clone();
            std::panic::set_hook(Box::new(move |info| {
                let _ = handle.emit("app-error", info.to_string());
            }));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::open_files_dialog,
            commands::open_files_from_paths,
            commands::release_sources,
            commands::save_pdf_dialog,
            commands::save_text_file,
            commands::merge_pdfs,
            commands::get_app_metadata,
            commands::open_external_url,
            commands::get_image_export_preview_layout,
            settings::load_settings,
            settings::save_settings,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
