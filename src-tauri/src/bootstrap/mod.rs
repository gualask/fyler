//! Tauri composition root.
//!
//! Runtime plugins, managed state, and the stable inbound command list are wired here.  Workflow
//! modules and infrastructure services remain unaware of this composition root.

use ::tauri::Emitter;

#[cfg(any(target_os = "macos", windows, target_os = "linux"))]
use ::tauri::Manager;

use crate::infrastructure::{filesystem, source_registry};
use crate::interfaces::tauri as tauri_commands;

/// Boots the Tauri app and registers all commands/plugins.
pub(crate) fn run() {
    let builder = ::tauri::Builder::default();

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
        .manage(filesystem::OutputPathAuthorizations::default())
        .manage(filesystem::BatchDestinationAuthorizations::default())
        .manage(crate::modules::batch_compression::BatchCompressionSession::default())
        .manage(filesystem::NativeBatchFileSystem)
        .manage(filesystem::AtomicOutputWriter)
        .setup(|app| {
            let handle = app.handle().clone();
            std::panic::set_hook(Box::new(move |info| {
                let _ = handle.emit("app-error", info.to_string());
            }));
            Ok(())
        })
        .invoke_handler(::tauri::generate_handler![
            tauri_commands::batch_compression::pick_batch_compression_sources,
            tauri_commands::batch_compression::inspect_batch_compression_sources,
            tauri_commands::batch_compression::pick_batch_compression_destination,
            tauri_commands::batch_compression::compress_batch,
            tauri_commands::sources::open_files_dialog,
            tauri_commands::sources::open_files_from_paths,
            tauri_commands::sources::unlock_pdf_source,
            tauri_commands::sources::discard_pending_sources,
            tauri_commands::sources::release_sources,
            tauri_commands::sources::get_image_preview,
            tauri_commands::export::save_pdf_dialog,
            tauri_commands::export::save_export_dialog,
            tauri_commands::support::save_text_file,
            tauri_commands::export::merge_pdfs,
            tauri_commands::support::get_app_metadata,
            tauri_commands::support::open_external_url,
            tauri_commands::export::get_image_export_preview_layout,
            tauri_commands::page_composition::register_pdf_page_raster,
            tauri_commands::page_composition::get_page_composition_preview_layout,
            tauri_commands::page_composition::export_page_composition,
            tauri_commands::settings::load_settings,
            tauri_commands::settings::save_settings,
        ])
        .run(::tauri::generate_context!())
        .expect("error while running tauri application");
}
