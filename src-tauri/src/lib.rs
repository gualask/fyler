use tauri::Emitter;

mod commands;
mod error;
mod models;
mod optimize;
mod pdf;
mod settings;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_store::Builder::default().build())
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
            commands::save_pdf_dialog,
            commands::merge_pdfs,
            commands::rotate_pdf_page,
            settings::load_settings,
            settings::save_settings,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
