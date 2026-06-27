fn main() {
    // Carrega a configuração nativa do Windows
    let mut windows = tauri_build::WindowsAttributes::new();
    
    // Injeta o nosso arquivo de permissão de Administrador
    windows = windows.app_manifest(include_str!("app.manifest"));

    // Constrói o aplicativo com as novas regras
    tauri_build::try_build(
        tauri_build::Attributes::new().windows_attributes(windows)
    ).expect("Falha ao compilar o aplicativo");
}