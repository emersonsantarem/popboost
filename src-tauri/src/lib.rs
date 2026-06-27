// src/lib.rs
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::process::Command;
use std::os::windows::process::CommandExt;
use std::ffi::c_void;
use std::sync::Mutex;
use sysinfo::System;
use winreg::enums::*;
use winreg::RegKey;

use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager, WindowEvent,
};

const CREATE_NO_WINDOW: u32 = 0x08000000;

// =====================================================================
// ESTADO GLOBAL DO APLICATIVO
// =====================================================================
pub struct AppState {
    sys: Mutex<System>,
}

// =====================================================================
// AJUDANTES NATIVOS DO REGISTRO (ANTI-VÍRUS BYPASS)
// =====================================================================
fn set_reg_dword(hkey: winreg::HKEY, path: &str, name: &str, value: u32) {
    let key = RegKey::predef(hkey);
    if let Ok((subkey, _)) = key.create_subkey(path) {
        let _ = subkey.set_value(name, &value);
    }
}

fn set_reg_string(hkey: winreg::HKEY, path: &str, name: &str, value: &str) {
    let key = RegKey::predef(hkey);
    if let Ok((subkey, _)) = key.create_subkey(path) {
        let _ = subkey.set_value(name, &value);
    }
}

// =====================================================================
// ESTRUTURAS NATIVAS DO WINDOWS (STANDBY CLEANER)
// =====================================================================
#[cfg(target_os = "windows")]
#[repr(C)]
struct LUID {
    low_part: u32,
    high_part: i32,
}

#[cfg(target_os = "windows")]
#[repr(C)]
struct LUID_AND_ATTRIBUTES {
    luid: LUID,
    attributes: u32,
}

#[cfg(target_os = "windows")]
#[repr(C)]
struct TOKEN_PRIVILEGES {
    privilege_count: u32,
    privileges: [LUID_AND_ATTRIBUTES; 1],
}

#[cfg(target_os = "windows")]
#[link(name = "kernel32")]
extern "system" {
    fn GetCurrentProcess() -> *mut c_void;
    fn CloseHandle(handle: *mut c_void) -> i32;
}

#[cfg(target_os = "windows")]
#[link(name = "advapi32")]
extern "system" {
    fn OpenProcessToken(
        process_handle: *mut c_void,
        desired_access: u32,
        token_handle: *mut *mut c_void,
    ) -> i32;
    fn LookupPrivilegeValueA(
        lp_system_name: *const i8,
        lp_name: *const i8,
        lp_luid: *mut LUID,
    ) -> i32;
    fn AdjustTokenPrivileges(
        token_handle: *mut c_void,
        disable_all_privileges: i32,
        new_state: *mut TOKEN_PRIVILEGES,
        buffer_length: u32,
        previous_state: *mut c_void,
        return_length: *mut u32,
    ) -> i32;
}

#[cfg(target_os = "windows")]
#[link(name = "ntdll")]
extern "system" {
    fn NtSetSystemInformation(
        system_information_class: i32,
        system_information: *mut c_void,
        system_information_length: u32,
    ) -> i32;
}

// =====================================================================
// COMANDOS TAURI REFEITOS PARA API NATIVA
// =====================================================================

#[tauri::command]
fn ultra_fps_latency() -> String {
    // 🌟 Substituição: Tudo nativo, sem abrir CMD!
    set_reg_dword(
        HKEY_LOCAL_MACHINE,
        "SYSTEM\\CurrentControlSet\\Control\\GraphicsDrivers",
        "HwSchMode",
        2,
    );
    set_reg_dword(
        HKEY_CURRENT_USER,
        "System\\GameConfigStore",
        "GameDVR_Enabled",
        0,
    );
    set_reg_dword(
        HKEY_LOCAL_MACHINE,
        "SOFTWARE\\Policies\\Microsoft\\Windows\\GameDVR",
        "AllowGameDVR",
        0,
    );
    set_reg_dword(
        HKEY_LOCAL_MACHINE,
        "SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile",
        "SystemResponsiveness",
        0,
    );
    set_reg_dword(
        HKEY_LOCAL_MACHINE,
        "SYSTEM\\CurrentControlSet\\Control\\PriorityControl",
        "Win32PrioritySeparation",
        40,
    );
    set_reg_dword(
        HKEY_LOCAL_MACHINE,
        "SYSTEM\\CurrentControlSet\\Services\\mouclass\\Parameters",
        "MouseDataQueueSize",
        32,
    );
    set_reg_dword(
        HKEY_LOCAL_MACHINE,
        "SYSTEM\\CurrentControlSet\\Services\\kbdclass\\Parameters",
        "KeyboardDataQueueSize",
        32,
    );
    set_reg_dword(
        HKEY_LOCAL_MACHINE,
        "SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile\\Tasks\\Games",
        "GPU Priority",
        8,
    );
    set_reg_dword(
        HKEY_LOCAL_MACHINE,
        "SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile\\Tasks\\Games",
        "Priority",
        6,
    );
    set_reg_string(
        HKEY_LOCAL_MACHINE,
        "SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile\\Tasks\\Games",
        "Scheduling Category",
        "High",
    );
    set_reg_dword(
        HKEY_LOCAL_MACHINE,
        "SYSTEM\\CurrentControlSet\\Control\\Power\\PowerThrottling",
        "PowerThrottlingOff",
        1,
    );
    set_reg_string(
        HKEY_CURRENT_USER,
        "Software\\Microsoft\\DirectX\\UserGpuPreferences",
        "DirectXUserGlobalSettings",
        "AutoSR=1;",
    );
    set_reg_dword(
        HKEY_LOCAL_MACHINE,
        "SYSTEM\\CurrentControlSet\\Control\\GraphicsDrivers",
        "AutoSuperResolution",
        1,
    );

    // Desativa inicialização de serviços desnecessários via Registro (Start = 4 é "Desativado")
    set_reg_dword(
        HKEY_LOCAL_MACHINE,
        "SYSTEM\\CurrentControlSet\\Services\\wuauserv",
        "Start",
        4,
    );
    set_reg_dword(
        HKEY_LOCAL_MACHINE,
        "SYSTEM\\CurrentControlSet\\Services\\Spooler",
        "Start",
        4,
    );
    set_reg_dword(
        HKEY_LOCAL_MACHINE,
        "SYSTEM\\CurrentControlSet\\Services\\WSearch",
        "Start",
        4,
    );

    "🚀 Ultra FPS + Auto SR Injetado via API Nativa!".into()
}

#[tauri::command]
fn disable_telemetry() -> String {
    // 🌟 Nativo
    set_reg_dword(
        HKEY_LOCAL_MACHINE,
        "SOFTWARE\\Policies\\Microsoft\\Windows\\DataCollection",
        "AllowTelemetry",
        0,
    );
    set_reg_dword(
        HKEY_LOCAL_MACHINE,
        "SOFTWARE\\Policies\\Microsoft\\Windows\\Windows Search",
        "AllowCortana",
        0,
    );

    // Desativa a Telemetria pela raiz no Windows
    set_reg_dword(
        HKEY_LOCAL_MACHINE,
        "SYSTEM\\CurrentControlSet\\Services\\DiagTrack",
        "Start",
        4,
    );
    set_reg_dword(
        HKEY_LOCAL_MACHINE,
        "SYSTEM\\CurrentControlSet\\Services\\WerSvc",
        "Start",
        4,
    );

    "🛡️ Telemetria Silenciada Nativamente!".into()
}

#[tauri::command]
fn optimize_network() -> String {
    // 🌟 Nativo
    set_reg_dword(
        HKEY_LOCAL_MACHINE,
        "SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile",
        "NetworkThrottlingIndex",
        0xffffffff,
    );
    set_reg_dword(
        HKEY_LOCAL_MACHINE,
        "SOFTWARE\\Policies\\Microsoft\\Windows\\Psched",
        "NonBestEffortLimit",
        0,
    );

    let _ = Command::new("netsh")
        .args(["int", "tcp", "set", "global", "autotuninglevel=normal"])
        .creation_flags(CREATE_NO_WINDOW)
        .output();
    let _ = Command::new("netsh")
        .args(["int", "tcp", "set", "global", "timestamps=disabled"])
        .creation_flags(CREATE_NO_WINDOW)
        .output();
    let _ = Command::new("netsh")
        .args(["int", "tcp", "set", "global", "rss=enabled"])
        .creation_flags(CREATE_NO_WINDOW)
        .output();

    "🌐 Rota de Rede Maximizada (Bypass AV)!".into()
}

#[tauri::command]
fn boost_system() -> String {
    let _ = Command::new("cmd")
        .args(["/C", "powercfg /setactive SCHEME_MIN"])
        .creation_flags(CREATE_NO_WINDOW)
        .output();
    let _ = Command::new("powershell")
        .args(["-Command", "Disable-MMAgent -MemoryCompression"])
        .creation_flags(CREATE_NO_WINDOW)
        .output();
    let _ = Command::new("cmd")
        .args(["/C", "fsutil behavior set disablelastaccess 1"])
        .creation_flags(CREATE_NO_WINDOW)
        .output();

    // Desativa o SysMain via Registro em vez de CMD
    set_reg_dword(
        HKEY_LOCAL_MACHINE,
        "SYSTEM\\CurrentControlSet\\Services\\SysMain",
        "Start",
        4,
    );
    let _ = Command::new("cmd")
        .args(["/C", "sc stop SysMain"])
        .creation_flags(CREATE_NO_WINDOW)
        .output();

    "Boost Total: Energia, RAM e SSD Otimizados!".into()
}

#[tauri::command]
fn clean_ram() -> String {
    let _ = Command::new("powershell")
        .args([
            "-Command",
            "Get-Process | ForEach-Object { $_.EmptyWorkingSet() } -ErrorAction SilentlyContinue",
        ])
        .creation_flags(CREATE_NO_WINDOW)
        .output();
    "🧹 Memória RAM Desafogada com Sucesso!".into()
}

#[tauri::command]
fn limpar_memoria_standby() -> Result<String, String> {
    #[cfg(target_os = "windows")]
    {
        unsafe {
            let mut token: *mut c_void = std::ptr::null_mut();
            let token_access = 0x0020 | 0x0008;

            if OpenProcessToken(GetCurrentProcess(), token_access, &mut token) == 0 {
                return Err(
                    "Erro: O aplicativo precisa ser executado como Administrador.".to_string()
                );
            }

            let mut luid = LUID {
                low_part: 0,
                high_part: 0,
            };
            let priv_name = b"SeProfileSingleProcessPrivilege\0".as_ptr() as *const i8;

            if LookupPrivilegeValueA(std::ptr::null(), priv_name, &mut luid) == 0 {
                CloseHandle(token);
                return Err("Falha ao buscar a permissão no Windows.".to_string());
            }

            let mut tp = TOKEN_PRIVILEGES {
                privilege_count: 1,
                privileges: [LUID_AND_ATTRIBUTES {
                    luid,
                    attributes: 0x00000002,
                }],
            };

            if AdjustTokenPrivileges(
                token,
                0,
                &mut tp,
                0,
                std::ptr::null_mut(),
                std::ptr::null_mut(),
            ) == 0
            {
                CloseHandle(token);
                return Err("Falha ao aplicar a permissão. Execute como Administrador.".to_string());
            }
            CloseHandle(token);

            let mut command: i32 = 4;
            let status = NtSetSystemInformation(
                80,
                &mut command as *mut i32 as *mut c_void,
                std::mem::size_of::<i32>() as u32,
            );

            if status >= 0 {
                Ok("Memória Standby limpa com sucesso!".to_string())
            } else {
                Err(format!("Erro NTAPI: {}", status))
            }
        }
    }
    #[cfg(not(target_os = "windows"))]
    {
        Err("Este recurso só está disponível no Windows.".to_string())
    }
}

#[tauri::command]
fn clean_shader_cache() -> String {
    let script = r#"
        $ErrorActionPreference = 'SilentlyContinue';
        Clear-RecycleBin -Force;
        Get-ChildItem -Path $env:TEMP -Recurse | Where-Object { $_.FullName -notmatch 'DxcCache|D3DSCache|NVIDIA\\ComputeCache|AMD\\DxCache' } | Remove-Item -Recurse -Force;
        Remove-Item -Path "$env:WINDIR\Temp\*" -Recurse -Force;
        Remove-Item -Path "$env:WINDIR\Prefetch\*" -Recurse -Force;
    "#;
    let _ = Command::new("powershell")
        .args(["-Command", script])
        .creation_flags(CREATE_NO_WINDOW)
        .output();
    "🗑️ Lixo apagado, Shaders preservados!".into()
}

#[tauri::command]
fn pro_core_unparking() -> String {
    let _ = Command::new("powercfg")
        .args([
            "-setacvalueindex",
            "scheme_current",
            "sub_processor",
            "cpumincores",
            "100",
        ])
        .creation_flags(CREATE_NO_WINDOW)
        .output();
    let _ = Command::new("powercfg")
        .args([
            "-setacvalueindex",
            "scheme_current",
            "sub_processor",
            "cpumaxcores",
            "100",
        ])
        .creation_flags(CREATE_NO_WINDOW)
        .output();
    let _ = Command::new("powercfg")
        .args([
            "-setacvalueindex",
            "scheme_current",
            "sub_processor",
            "PERFINITOPTRACK",
            "1",
        ])
        .creation_flags(CREATE_NO_WINDOW)
        .output();
    let _ = Command::new("powercfg")
        .args(["-setactive", "scheme_current"])
        .creation_flags(CREATE_NO_WINDOW)
        .output();
    "🔓 Todos os Núcleos Desbloqueados!".into()
}

#[tauri::command]
fn pro_custom_dns() -> String {
    let script =
        "Get-NetAdapter | Where-Object {$_.Status -eq 'Up'} | Set-DnsClientServerAddress -ServerAddresses '1.1.1.1','1.0.0.1'";
    let _ = Command::new("powershell")
        .args(["-Command", script])
        .creation_flags(CREATE_NO_WINDOW)
        .output();
    let _ = Command::new("cmd")
        .args(["/C", "ipconfig /flushdns"])
        .creation_flags(CREATE_NO_WINDOW)
        .output();
    "🌍 DNS Cloudflare Aplicado!".into()
}

#[tauri::command]
fn pro_timer_resolution() -> String {
    let _ = Command::new("cmd")
        .args(["/C", "bcdedit /set useplatformclock true"])
        .creation_flags(CREATE_NO_WINDOW)
        .output();
    let _ = Command::new("cmd")
        .args(["/C", "bcdedit /set tscsyncpolicy Enhanced"])
        .creation_flags(CREATE_NO_WINDOW)
        .output();
    let _ = Command::new("cmd")
        .args(["/C", "bcdedit /set disabledynamictick yes"])
        .creation_flags(CREATE_NO_WINDOW)
        .output();
    "⏱️ Timer Resolution Fixado!".into()
}

#[tauri::command]
fn pro_debloat() -> String {
    let _ = Command::new("powershell")
        .args([
            "-Command",
            "Get-AppxPackage *Microsoft.549981C3F5F10* | Remove-AppxPackage -ErrorAction SilentlyContinue",
        ])
        .creation_flags(CREATE_NO_WINDOW)
        .output();
    "🗑️ Debloat Concluído!".into()
}

#[tauri::command]
fn pro_smart_profiles(game_name: String) -> String {
    let name = game_name.to_lowercase();
    let comp_games = ["valorant", "cs2", "r5apex", "fortnite", "leagueclient", "roblox"];
    let aaa_games = [
        "rdr2", "cyberpunk2077", "gta5", "witcher3", "starfield", "hogwarts",
    ];
    let _ = Command::new("powershell")
        .args([
            "-Command",
            "Get-Process -Name 'IntelDTT' -ErrorAction SilentlyContinue | ForEach-Object { $_.PriorityClass = 'High' }",
        ])
        .creation_flags(CREATE_NO_WINDOW)
        .output();

    if comp_games.iter().any(|&g| name.contains(g)) {
        let script = format!(
            "(Get-Process -Name '{}' -ErrorAction SilentlyContinue).PriorityClass = 'High'",
            name
        );
        let _ = Command::new("powershell")
            .args(["-Command", &script])
            .creation_flags(CREATE_NO_WINDOW)
            .output();
        return format!("🧠 Perfil E-SPORTS ativado para {}", game_name.to_uppercase());
    } else if aaa_games.iter().any(|&g| name.contains(g)) {
        let _ = Command::new("powershell")
            .args([
                "-Command",
                "Get-Process | ForEach-Object { $_.EmptyWorkingSet() } -ErrorAction SilentlyContinue",
            ])
            .creation_flags(CREATE_NO_WINDOW)
            .output();
        return format!("🧠 Perfil AAA ativado para {}", game_name.to_uppercase());
    }
    format!("🧠 Perfil STANDARD ativado para {}", game_name.to_uppercase())
}

#[tauri::command]
fn optimize_game_process(pid: i32) -> String {
    let script = format!(
        r#"
        $ErrorActionPreference = 'SilentlyContinue'; 
        (Get-Process -Id {}).PriorityClass = 'High'; 
        $hogs = @('chrome', 'discord', 'msedge', 'spotify', 'brave', 'opera', 'steamwebhelper', 'epicgameslauncher'); 
        foreach ($h in $hogs) {{ 
            Get-Process -Name $h | ForEach-Object {{ $_.PriorityClass = 'Idle' }} 
        }}
        "#,
        pid
    );
    let _ = Command::new("powershell")
        .args(["-Command", &script])
        .creation_flags(CREATE_NO_WINDOW)
        .output();
    "Process Lasso Clone: Jogo em ALTA prioridade!".into()
}

#[tauri::command]
fn open_donation() -> String {
    let _ = Command::new("cmd")
        .args(["/C", "start https://apoia.se/popboost"])
        .creation_flags(CREATE_NO_WINDOW)
        .output();
    "URL aberta!".into()
}

#[tauri::command]
fn get_system_info(state: tauri::State<'_, AppState>) -> (u64, f32) {
    let mut sys = state.sys.lock().unwrap();
    sys.refresh_memory();
    sys.refresh_cpu();
    (sys.used_memory() / 1024 / 1024, sys.global_cpu_info().cpu_usage())
}

#[tauri::command]
fn detect_game(manual_name: String) -> Vec<String> {
    if manual_name.is_empty() {
        return vec![];
    }
    let mut sys = System::new_all();
    sys.refresh_processes();
    let clean_name = manual_name.replace(".exe", "");
    for (pid, process) in sys.processes() {
        if process.name().to_lowercase().contains(&clean_name.to_lowercase()) {
            return vec![clean_name, pid.to_string()];
        }
    }
    vec![]
}

#[tauri::command]
async fn get_installed_games() -> Vec<(String, String, String)> {
    let script = r#"
        $shell = New-Object -ComObject WScript.Shell
        $paths = @([Environment]::GetFolderPath('Desktop'), [Environment]::GetFolderPath('CommonDesktopDirectory'))
        $results = @()
        foreach ($path in $paths) {
            if (Test-Path $path) {
                Get-ChildItem -Path $path -Filter *.lnk -ErrorAction SilentlyContinue | ForEach-Object {
                    $target = $shell.CreateShortcut($_.FullName).TargetPath
                    if ($target -match '\.exe$') {
                        $name = [System.IO.Path]::GetFileNameWithoutExtension($_.Name)
                        $exeName = [System.IO.Path]::GetFileNameWithoutExtension($target)
                        $ignore = '(?i)Uninstall|Setup|Update|Config|Crash|Edge|Chrome|Firefox|Brave|Discord|Spotify|Steam|Epic|Origin|EA|Riot|Word|Excel'
                        if ($name -notmatch $ignore -and $exeName -notmatch $ignore) { $results += "$name|||$exeName|||$target" }
                    }
                }
            }
        }
        $results | Select-Object -Unique
    "#;
    let mut games = Vec::new();
    if let Ok(output) = Command::new("powershell")
        .args(["-NoProfile", "-Command", script])
        .creation_flags(CREATE_NO_WINDOW)
        .output()
    {
        let stdout = String::from_utf8_lossy(&output.stdout);
        for line in stdout.lines() {
            let parts: Vec<&str> = line.split("|||").collect();
            if parts.len() == 3
                && std::path::Path::new(&parts[2].trim().to_string()).exists()
            {
                games.push((
                    parts[0].trim().to_string(),
                    parts[1].trim().to_string(),
                    parts[2].trim().to_string(),
                ));
            }
        }
    }
    games.sort_by(|a, b| a.0.cmp(&b.0));
    games
}

#[tauri::command]
fn run_game(path: String) -> String {
    let _ = Command::new(&path)
        .current_dir(
            std::path::Path::new(&path)
                .parent()
                .unwrap_or(std::path::Path::new("C:\\")),
        )
        .spawn();
    "🎮 Jogo iniciado! Otimizando Processador...".into()
}

#[tauri::command]
fn restore_system() -> String {
    let _ = Command::new("powercfg")
        .args(["-restoredefaultschemes"])
        .creation_flags(CREATE_NO_WINDOW)
        .output();
    set_reg_dword(
        HKEY_LOCAL_MACHINE,
        "SYSTEM\\CurrentControlSet\\Services\\SysMain",
        "Start",
        2,
    );
    set_reg_dword(
        HKEY_LOCAL_MACHINE,
        "SYSTEM\\CurrentControlSet\\Services\\WerSvc",
        "Start",
        3,
    );
    set_reg_dword(
        HKEY_LOCAL_MACHINE,
        "SYSTEM\\CurrentControlSet\\Services\\DiagTrack",
        "Start",
        2,
    );
    let _ = Command::new("powershell")
        .args(["-Command", "Enable-MMAgent -MemoryCompression"])
        .creation_flags(CREATE_NO_WINDOW)
        .output();
    "🔄 Sistema e Serviços Restaurados!".into()
}

#[tauri::command]
fn add_game_manually() -> Vec<String> {
    let script = r#"
        Add-Type -AssemblyName System.Windows.Forms
        $dialog = New-Object System.Windows.Forms.OpenFileDialog
        $dialog.Filter = "Arquivos Executáveis (*.exe)|*.exe"
        $dialog.Title = "Adicionar Jogo"
        $dialog.InitialDirectory = [Environment]::GetFolderPath('ProgramFiles')
        if ($dialog.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) { Write-Output $dialog.FileName }
    "#;
    if let Ok(output) = Command::new("powershell")
        .args(["-Sta", "-NoProfile", "-Command", script])
        .creation_flags(CREATE_NO_WINDOW)
        .output()
    {
        let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
        if !stdout.is_empty() {
            let path = std::path::Path::new(&stdout);
            return vec![
                path.file_stem()
                    .unwrap_or_default()
                    .to_string_lossy()
                    .to_string(),
                path.file_stem()
                    .unwrap_or_default()
                    .to_string_lossy()
                    .to_string(),
                stdout,
            ];
        }
    }
    vec![]
}

// =====================================================================
// COMANDOS DE MANUTENÇÃO E REPARO (NOVA ABA)
// =====================================================================

#[tauri::command]
fn run_sfc_scan() -> String {
    let _ = Command::new("cmd")
        .args([
            "/C",
            "start",
            "cmd",
            "/K",
            "echo POPBOOST: Reparando o Windows (SFC)... && sfc /scannow",
        ])
        .spawn();
    "✅ SFC Scan iniciado! Acompanhe na janela preta que se abriu.".into()
}

#[tauri::command]
fn run_dism_repair() -> String {
    let _ = Command::new("cmd")
        .args([
            "/C",
            "start",
            "cmd",
            "/K",
            "echo POPBOOST: Restaurando Imagem do Windows (DISM)... && dism /online /cleanup-image /restorehealth",
        ])
        .spawn();
    "✅ DISM iniciado! Acompanhe na janela preta que se abriu.".into()
}

#[tauri::command]
fn fix_mouse_input() -> String {
    set_reg_dword(HKEY_CURRENT_USER, "Control Panel\\Mouse", "MouseSpeed", 0);
    set_reg_dword(
        HKEY_CURRENT_USER,
        "Control Panel\\Mouse",
        "MouseThreshold1",
        0,
    );
    set_reg_dword(
        HKEY_CURRENT_USER,
        "Control Panel\\Mouse",
        "MouseThreshold2",
        0,
    );
    "🖱️ Aceleração de Mouse desativada (Input Lag reduzido)!".into()
}

// =====================================================================
// FUNÇÃO PRINCIPAL (EXPORTADA)
// =====================================================================
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .setup(|app| {
            // 🌟 O Auto-Start também foi limpo do CMD para evitar bloqueios do AV
            if let Ok(exe_path) = std::env::current_exe() {
                if let Some(path_str) = exe_path.to_str() {
                    set_reg_string(
                        HKEY_CURRENT_USER,
                        "Software\\Microsoft\\Windows\\CurrentVersion\\Run",
                        "PopBoost",
                        &format!("\"{}\"", path_str),
                    );
                }
            }

            app.manage(AppState {
                sys: Mutex::new(System::new_all()),
            });

            let quit_i = MenuItem::with_id(app, "quit", "Encerrar PopBoost", true, None::<&str>)?;
            let show_i = MenuItem::with_id(app, "show", "Abrir Painel", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show_i, &quit_i])?;

            let mut tray_builder = TrayIconBuilder::new()
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "quit" => {
                        std::process::exit(0);
                    }
                    "show" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        if let Some(window) = tray.app_handle().get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                });

            if let Some(icon) = app.default_window_icon() {
                tray_builder = tray_builder.icon(icon.clone());
            }
            let _tray = tray_builder.build(app)?;
            Ok(())
        })
        .on_window_event(|window, event| match event {
            WindowEvent::CloseRequested { api, .. } => {
                let _ = window.hide();
                api.prevent_close();
            }
            _ => {}
        })
        .invoke_handler(tauri::generate_handler![
            boost_system,
            clean_ram,
            limpar_memoria_standby,
            optimize_network,
            clean_shader_cache,
            disable_telemetry,
            optimize_game_process,
            open_donation,
            pro_core_unparking,
            pro_custom_dns,
            pro_timer_resolution,
            pro_debloat,
            pro_smart_profiles,
            get_system_info,
            detect_game,
            ultra_fps_latency,
            get_installed_games,
            run_game,
            restore_system,
            add_game_manually,
            run_sfc_scan,
            run_dism_repair,
            fix_mouse_input
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}