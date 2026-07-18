//! Fyler's native backend (Tauri).
//!
//! This crate exposes a small set of Tauri commands used by the frontend to:
//! - import sources (PDFs/images)
//! - compose and export a merged PDF
//! - compute export previews and persist user settings

use tauri::Emitter;

#[cfg(any(target_os = "macos", windows, target_os = "linux"))]
use tauri::Manager;

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
    let builder = tauri::Builder::default();

    #[cfg(any(target_os = "macos", windows, target_os = "linux"))]
    let builder = builder.plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
        if let Some(window) = app.get_webview_window("main") {
            let _ = window.unminimize();
            let _ = window.show();
            let _ = window.set_focus();
        }
    }));

    let builder = builder
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_store::Builder::default().build());

    #[cfg(feature = "updater")]
    let builder = builder
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init());

    builder
        .manage(source_registry::SourceRegistry::default())
        .manage(commands::export::OutputPathAuthorizations::default())
        .setup(|app| {
            let handle = app.handle().clone();
            std::panic::set_hook(Box::new(move |info| {
                let _ = handle.emit("app-error", info.to_string());
            }));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::sources::open_files_dialog,
            commands::sources::open_files_from_paths,
            commands::sources::unlock_pdf_source,
            commands::sources::discard_pending_sources,
            commands::sources::release_sources,
            commands::sources::get_image_preview,
            commands::export::save_pdf_dialog,
            commands::support::save_text_file,
            commands::export::merge_pdfs,
            commands::support::get_app_metadata,
            commands::support::open_external_url,
            commands::export::get_image_export_preview_layout,
            settings::load_settings,
            settings::save_settings,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
