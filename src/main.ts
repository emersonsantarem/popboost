import "./styles.css";
import { invoke } from "@tauri-apps/api/core";
import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import { message, ask } from '@tauri-apps/plugin-dialog';

// --- 1. ESTADO GLOBAL ---
let currentLang = localStorage.getItem("popboost_lang") || "pt";
let gameDetected = false;
let currentGameName = ""; 
let manualGames: [string, string, string][] = JSON.parse(localStorage.getItem("popboost_manual_games") || "[]");

// --- 2. TRADUÇÕES ---
const i18n: Record<string, Record<string, string>> = {
  pt: {
    "ram-title": "RAM EM USO", "waiting": "Aguardando jogo...", "placeholder": "Nome do .exe (ex: roblox)",
    "status-ready": "Status: Sistema Pronto", "boost-btn": "⚡ BOOST TOTAL", "ram-btn": "🧹 LIMPAR RAM",
    "network-btn": "🌐 OTIMIZAR PING", "clean-cache-btn": "🗑️ LIMPAR LIXO", "telemetry-btn": "🛡️ DESATIVAR TELEMETRIA",
    "adv-title": "⚙ OTIMIZAÇÕES AVANÇADAS", "pro-core": "🔓 CORE UNPARKING", "pro-dns": "🌍 DNS GAMER FAST",
    "pro-timer": "⏱️ TIMER EXTREMO (0.5ms)", "pro-debloat": "🗑️ DEBLOAT WINDOWS", "pro-profile": "🧠 PERFIL INTELIGENTE AUTO",
    "ultra-fps": "🚀 ULTRA FPS & LAG", "my-games-btn": "🎮 MEUS JOGOS", "hub-title": "🎮 JOGOS INSTALADOS",
    "donate-btn": "☕ AJUDE A MANTER O APP ATIVO (DOAR)", "settings-title": "Configurações", "close-btn": "Fechar",
    "restore-btn": "🔄 RESTAURAR PADRÃO DO WINDOWS", "restore-desc": "Desfaz as otimizações e volta ao padrão de fábrica.",
    "add-manual": "➕ PROCURAR .EXE", "standby-btn": "🧠 PURGE STANDBY (DEEP CLEAN)",
    "update-btn": "🔄 VERIFICAR ATUALIZAÇÕES",
    "tab-opt": "⚡ OTIMIZAÇÃO", "tab-maint": "🛠️ MANUTENÇÃO PRO",
    "sfc-btn": "🔍 REPARAR WINDOWS (SFC SCAN)", "sfc-desc": "Verifica e corrige ficheiros corrompidos do sistema operacional.",
    "dism-btn": "♻️ RESTAURAR IMAGEM (DISM)", "dism-desc": "Repara a imagem raiz do Windows utilizando o Windows Update.",
    "mouse-btn": "🖱️ MOUSE GAMING (ZERO LAG)", "mouse-desc": "Remove a aceleração do rato via registo para precisão 1:1 perfeita em jogos."
  },
  en: {
    "ram-title": "RAM USAGE", "waiting": "Waiting for game...", "placeholder": ".exe name (e.g., roblox)",
    "status-ready": "Status: System Ready", "boost-btn": "⚡ FULL BOOST", "ram-btn": "🧹 CLEAN RAM",
    "network-btn": "🌐 OPTIMIZE PING", "clean-cache-btn": "🗑️ JUNK CLEANER", "telemetry-btn": "🛡️ DISABLE TELEMETRY",
    "adv-title": "⚙ ADVANCED OPTIMIZATIONS", "pro-core": "🔓 CORE UNPARKING", "pro-dns": "🌍 FAST GAMING DNS",
    "pro-timer": "⏱️ EXTREME TIMER", "pro-debloat": "🗑️ WINDOWS DEBLOAT", "pro-profile": "🧠 SMART AUTO PROFILE",
    "ultra-fps": "🚀 ULTRA FPS & LAG", "my-games-btn": "🎮 MY GAMES", "hub-title": "🎮 INSTALLED GAMES",
    "donate-btn": "☕ SUPPORT OUR APP (DONATE)", "settings-title": "Settings", "close-btn": "Close",
    "restore-btn": "🔄 RESTORE WINDOWS DEFAULT", "restore-desc": "Undo all optimizations and restore factory settings.",
    "add-manual": "➕ FIND .EXE", "standby-btn": "🧠 PURGE STANDBY (DEEP CLEAN)",
    "update-btn": "🔄 CHECK FOR UPDATES",
    "tab-opt": "⚡ OPTIMIZATION", "tab-maint": "🛠️ PRO MAINTENANCE",
    "sfc-btn": "🔍 REPAIR WINDOWS (SFC SCAN)", "sfc-desc": "Scans and fixes corrupted operating system files.",
    "dism-btn": "♻️ RESTORE IMAGE (DISM)", "dism-desc": "Repairs the root Windows image using Windows Update.",
    "mouse-btn": "🖱️ GAMING MOUSE (ZERO LAG)", "mouse-desc": "Removes mouse acceleration via registry for perfect 1:1 aim precision."
  }
};

// --- 3. ESTRUTURA HTML (DESIGN PREMIUM SLEEK COM TABS) ---
document.querySelector("#app")!.innerHTML = `
  <style>
    * { box-sizing: border-box; outline: none; }
    ::-webkit-scrollbar { width: 6px; }
    ::-webkit-scrollbar-track { background: #0b0e14; }
    ::-webkit-scrollbar-thumb { background: #2a3142; border-radius: 3px; }
    ::-webkit-scrollbar-thumb:hover { background: #00ff99; }
    body { font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; background: #0b0e14; color: white; overflow: hidden; }
    .glass-btn:hover { filter: brightness(1.2); transform: translateY(-1px); }
    .glass-btn:active { transform: translateY(1px); }
    
    .tab-active { background: #2a3142 !important; color: #00ff99 !important; border: 1px solid #00ff99 !important; box-shadow: 0 0 10px rgba(0,255,153,0.1); }
    .tab-inactive { background: transparent !important; color: #64748b !important; border: 1px solid transparent !important; }
    .tab-inactive:hover { color: #fff !important; }
  </style>

  <div style="position: relative; display: flex; flex-direction: column; height: 100vh; overflow-y: auto; overflow-x: hidden; padding: 20px; padding-bottom: 40px; background: #0b0e14;">
    
    <div id="settings-modal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(11, 14, 20, 0.95); z-index: 2000; flex-direction: column; justify-content: center; align-items: center; padding: 20px;">
      <h2 id="settings-title" style="color: #00ff99; margin-bottom: 20px; font-size: 20px;">Configurações</h2>
      
      <div style="display: flex; gap: 10px; margin-bottom: 25px;">
        <button class="lang-btn glass-btn" data-lang="pt" style="background: #151a25; color: white; padding: 10px 20px; border-radius: 6px; border: 1px solid #00ff99; cursor: pointer; font-weight: bold;">🇧🇷 PT-BR</button>
        <button class="lang-btn glass-btn" data-lang="en" style="background: #151a25; color: white; padding: 10px 20px; border-radius: 6px; border: 1px solid #38bdf8; cursor: pointer; font-weight: bold;">🇺🇸 EN-US</button>
      </div>

      <div style="margin-bottom: 25px; border-top: 1px solid #2a3142; padding-top: 25px; width: 100%; max-width: 300px; text-align: center;">
        <button id="update-btn" class="glass-btn" style="width: 100%; margin-bottom: 15px; background: transparent; color: #38bdf8; border: 1px solid #38bdf8; padding: 10px; border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 12px; transition: 0.2s;">🔄 VERIFICAR ATUALIZAÇÕES</button>
        <button id="restore-btn" class="glass-btn" style="width: 100%; background: transparent; color: #ef4444; border: 1px solid #ef4444; padding: 10px; border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 12px; transition: 0.2s;">🔄 RESTAURAR PADRÃO DO WINDOWS</button>
        <p id="restore-desc" style="font-size: 11px; color: #888; margin-top: 8px;">Desfaz as otimizações e volta ao padrão de fábrica.</p>
      </div>

      <button id="close-settings-btn" class="glass-btn" style="background: #2a3142; color: white; padding: 8px 30px; border-radius: 6px; border: none; cursor: pointer; font-weight: bold; font-size: 13px;">Fechar</button>
    </div>

    <div id="games-modal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(11, 14, 20, 0.95); z-index: 2500; flex-direction: column; padding: 20px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; border-bottom: 1px solid #2a3142; padding-bottom: 10px;">
        <h2 id="hub-title" style="color: #a855f7; margin: 0; font-size: 16px; letter-spacing: 1px;">🎮 JOGOS INSTALADOS</h2>
        <div style="display: flex; gap: 8px;">
          <button id="add-manual-btn" class="glass-btn" style="background: #10b981; color: white; padding: 6px 12px; border-radius: 4px; border: none; cursor: pointer; font-weight: bold; font-size: 11px;">➕ PROCURAR .EXE</button>
          <button id="close-games-btn" class="glass-btn" style="background: #e11d48; color: white; padding: 6px 12px; border-radius: 4px; border: none; cursor: pointer; font-weight: bold; font-size: 11px;">X</button>
        </div>
      </div>
      <div id="games-list-container" style="flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 6px; padding-right: 5px;"></div>
    </div>

    <div style="position: relative; width: 100%; height: 40px; margin-bottom: 15px; display: flex; justify-content: center; align-items: center; flex-shrink: 0;">
      <h1 style="margin: 0; color: #00ff99; font-size: 26px; letter-spacing: 4px; font-weight: 900; text-shadow: 0 0 10px rgba(0,255,153,0.3);">POPBOOST</h1>
      <button id="settings-btn" class="glass-btn" style="position: absolute; right: 0; background: #151a25; border: 1px solid #2a3142; border-radius: 6px; font-size: 16px; cursor: pointer; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; z-index: 1000; color: #888;">⚙️</button>
    </div>

    <div style="display: flex; gap: 5px; margin-bottom: 15px; background: #151a25; padding: 5px; border-radius: 8px; border: 1px solid #1e2532; flex-shrink: 0;">
      <button id="tab-btn-opt" class="glass-btn tab-active" style="flex: 1; padding: 10px; border-radius: 6px; font-weight: bold; font-size: 11px; cursor: pointer; transition: 0.2s;">⚡ OTIMIZAÇÃO</button>
      <button id="tab-btn-maint" class="glass-btn tab-inactive" style="flex: 1; padding: 10px; border-radius: 6px; font-weight: bold; font-size: 11px; cursor: pointer; transition: 0.2s;">🛠️ MANUTENÇÃO PRO</button>
    </div>
    
    <div id="log-box" style="background: #0b0e14; padding: 0 12px; border-radius: 6px; border: 1px solid #1e2532; font-family: monospace; font-size: 11px; color: #888; margin-bottom: 15px; text-align: center; height: 32px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-weight: bold; text-transform: uppercase;">Status: Sistema Pronto</div>

    <div id="view-opt" style="display: flex; flex-direction: column; flex: 1;">
        <div style="display: flex; gap: 10px; margin-bottom: 15px; flex-shrink: 0;">
          <div style="flex: 1; background: #151a25; padding: 10px 15px; border-radius: 8px; text-align: center; border-bottom: 2px solid #00ff99; box-shadow: 0 4px 10px rgba(0,0,0,0.3);">
            <h2 id="ram-title" style="font-size: 10px; color: #888; margin: 0 0 4px 0; letter-spacing: 1.5px; font-weight: bold;">RAM EM USO</h2>
            <span id="ram" style="font-size: 20px; font-weight: 900; color: #fff;">...</span>
          </div>
          <div style="flex: 1; background: #151a25; padding: 10px 15px; border-radius: 8px; text-align: center; border-bottom: 2px solid #38bdf8; box-shadow: 0 4px 10px rgba(0,0,0,0.3);">
            <h2 style="font-size: 10px; color: #888; margin: 0 0 4px 0; letter-spacing: 1.5px; font-weight: bold;">CPU</h2>
            <span id="cpu" style="font-size: 20px; font-weight: 900; color: #fff;">...</span>
          </div>
        </div>

        <div style="background: #151a25; padding: 12px; border-radius: 8px; margin-bottom: 15px; flex-shrink: 0; border: 1px solid #1e2532;">
            <div id="game-status" style="padding: 8px; border-radius: 6px; text-align: center; font-size: 12px; color: #00ff99; margin-bottom: 10px; background: rgba(0,255,153,0.05); border: 1px dashed rgba(0,255,153,0.2); font-weight: bold;">Aguardando jogo...</div>
            <div style="display: flex; height: 38px; gap: 8px; width: 100%;">
                <input type="text" id="manual-game" style="flex: 1; height: 100%; padding: 0 12px; border-radius: 6px; border: 1px solid #2a3142; background: #0b0e14; color: white; font-size: 12px; text-align: center;" placeholder="Nome do .exe (ex: roblox)">
                <button id="games-list-btn" class="glass-btn" style="height: 100%; background: #a855f7; color: white; font-weight: bold; padding: 0 16px; border-radius: 6px; border: none; cursor: pointer; font-size: 11px; white-space: nowrap; display: flex; align-items: center; justify-content: center; gap: 5px; box-shadow: 0 2px 8px rgba(168,85,247,0.3);">🎮 MEUS JOGOS</button>
            </div>
        </div>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 15px; flex-shrink: 0;">
            <button id="boost-btn" class="glass-btn" style="grid-column: span 2; background: linear-gradient(90deg, #38bdf8, #2563eb); color: #fff; font-weight: 900; height: 42px; border-radius: 6px; border: none; cursor: pointer; font-size: 14px; box-shadow: 0 4px 15px rgba(56,189,248,0.3); transition: all 0.2s;">⚡ BOOST TOTAL</button>
            <button id="btn-limpar-ram" class="glass-btn" style="grid-column: span 2; background: transparent; color: #a855f7; font-weight: bold; height: 38px; border-radius: 6px; border: 1px dashed #a855f7; cursor: pointer; font-size: 12px; transition: all 0.2s;">🧠 PURGE STANDBY (DEEP CLEAN)</button>
            <button id="ram-btn" class="glass-btn" style="background: #151a25; color: #10b981; font-weight: bold; height: 38px; border-radius: 6px; border: 1px solid rgba(16,185,129,0.3); cursor: pointer; font-size: 11px;">🧹 LIMPAR RAM</button>
            <button id="network-btn" class="glass-btn" style="background: #151a25; color: #38bdf8; font-weight: bold; height: 38px; border-radius: 6px; border: 1px solid rgba(56,189,248,0.3); cursor: pointer; font-size: 11px;">🌐 PING</button>
            <button id="clean-cache-btn" class="glass-btn" style="background: #151a25; color: #d97706; font-weight: bold; height: 38px; border-radius: 6px; border: 1px solid rgba(217,119,6,0.3); cursor: pointer; font-size: 11px;">🗑️ LIMPAR LIXO</button>
            <button id="telemetry-btn" class="glass-btn" style="background: #151a25; color: #e11d48; font-weight: bold; height: 38px; border-radius: 6px; border: 1px solid rgba(225,29,72,0.3); cursor: pointer; font-size: 11px;">🛡️ TELEMETRIA</button>
        </div>

        <div style="background: transparent; flex-shrink: 0;">
            <h2 id="adv-title" style="color: #64748b; font-size: 11px; text-align: center; margin: 0 0 10px 0; letter-spacing: 2px; font-weight: 800; text-transform: uppercase;">⚙ OTIMIZAÇÕES AVANÇADAS</h2>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px;">
                <button id="pro-core" class="glass-btn" style="background: #151a25; color: #cbd5e1; height: 36px; border-radius: 6px; border: 1px solid #1e2532; cursor: pointer; font-weight: bold; font-size: 11px;">🔓 CORES</button>
                <button id="pro-dns" class="glass-btn" style="background: #151a25; color: #cbd5e1; height: 36px; border-radius: 6px; border: 1px solid #1e2532; cursor: pointer; font-weight: bold; font-size: 11px;">🌍 DNS</button>
                <button id="pro-timer" class="glass-btn" style="background: #151a25; color: #cbd5e1; height: 36px; border-radius: 6px; border: 1px solid #1e2532; cursor: pointer; font-weight: bold; font-size: 11px;">⏱️ TIMER</button>
                <button id="pro-debloat" class="glass-btn" style="background: #151a25; color: #cbd5e1; height: 36px; border-radius: 6px; border: 1px solid #1e2532; cursor: pointer; font-weight: bold; font-size: 11px;">🗑️ DEBLOAT</button>
                <button id="ultra-fps" class="glass-btn" style="background: #151a25; color: #fbbf24; height: 36px; border-radius: 6px; border: 1px solid rgba(251,191,36,0.3); cursor: pointer; font-weight: 900; font-size: 11px; grid-column: span 2;">🚀 ULTRA FPS</button>
                <button id="pro-profile" class="glass-btn" style="background: #151a25; color: #cbd5e1; height: 36px; border-radius: 6px; border: 1px solid #1e2532; cursor: pointer; font-weight: bold; font-size: 11px; grid-column: span 2;">🧠 AUTO PROFILE</button>
            </div>
        </div>
    </div>

    <div id="view-maint" style="display: none; flex-direction: column; flex: 1;">
        <div style="background: #151a25; padding: 15px; border-radius: 8px; border: 1px solid #1e2532; margin-bottom: 12px; display: flex; flex-direction: column; gap: 8px;">
            <button id="sfc-btn" class="glass-btn" style="background: transparent; color: #38bdf8; font-weight: bold; padding: 12px; border-radius: 6px; border: 1px dashed #38bdf8; cursor: pointer; font-size: 13px; transition: 0.2s;">🔍 REPARAR WINDOWS (SFC SCAN)</button>
            <span id="sfc-desc" style="color: #64748b; font-size: 11px; text-align: center; margin-top: -4px;">Verifica e corrige ficheiros corrompidos do sistema operacional.</span>
        </div>

        <div style="background: #151a25; padding: 15px; border-radius: 8px; border: 1px solid #1e2532; margin-bottom: 12px; display: flex; flex-direction: column; gap: 8px;">
            <button id="dism-btn" class="glass-btn" style="background: transparent; color: #a855f7; font-weight: bold; padding: 12px; border-radius: 6px; border: 1px dashed #a855f7; cursor: pointer; font-size: 13px; transition: 0.2s;">♻️ RESTAURAR IMAGEM (DISM)</button>
            <span id="dism-desc" style="color: #64748b; font-size: 11px; text-align: center; margin-top: -4px;">Repara a imagem raiz do Windows utilizando o Windows Update.</span>
        </div>

        <div style="background: #151a25; padding: 15px; border-radius: 8px; border: 1px solid #1e2532; margin-bottom: 12px; display: flex; flex-direction: column; gap: 8px;">
            <button id="mouse-btn" class="glass-btn" style="background: transparent; color: #00ff99; font-weight: bold; padding: 12px; border-radius: 6px; border: 1px dashed #00ff99; cursor: pointer; font-size: 13px; transition: 0.2s;">🖱️ MOUSE GAMING (ZERO LAG)</button>
            <span id="mouse-desc" style="color: #64748b; font-size: 11px; text-align: center; margin-top: -4px;">Remove a aceleração do rato via registo para precisão 1:1 perfeita em jogos.</span>
        </div>
    </div>

    <div style="margin-top: auto; padding-top: 15px; flex-shrink: 0;">
        <button id="donate-btn" class="glass-btn" style="width: 100%; background: linear-gradient(90deg, #d4af37, #b8860b); color: #000; font-weight: 900; height: 40px; border-radius: 6px; border: none; cursor: pointer; font-size: 12px; text-transform: uppercase; box-shadow: 0 4px 10px rgba(212,175,55,0.2);">☕ AJUDE A MANTER O APP ATIVO (DOAR)</button>
    </div>

  </div>
`;

// --- 4. LÓGICA DE TABS ---
document.querySelector("#tab-btn-opt")?.addEventListener("click", () => {
    (document.querySelector("#view-opt") as HTMLElement).style.display = "flex";
    (document.querySelector("#view-maint") as HTMLElement).style.display = "none";
    (document.querySelector("#tab-btn-opt") as HTMLElement).className = "glass-btn tab-active";
    (document.querySelector("#tab-btn-maint") as HTMLElement).className = "glass-btn tab-inactive";
});

document.querySelector("#tab-btn-maint")?.addEventListener("click", () => {
    (document.querySelector("#view-opt") as HTMLElement).style.display = "none";
    (document.querySelector("#view-maint") as HTMLElement).style.display = "flex";
    (document.querySelector("#tab-btn-maint") as HTMLElement).className = "glass-btn tab-active";
    (document.querySelector("#tab-btn-opt") as HTMLElement).className = "glass-btn tab-inactive";
});

// --- 5. FUNÇÕES DE LÓGICA E UPDATER ---
async function verificarAtualizacao(isManual = false) {
  try {
    const update = await check();
    if (update) {
      const proceed = await ask(`Nova versão ${update.version} encontrada!\n\nDeseja atualizar o PopBoost agora?`, { title: 'PopBoost Update', kind: 'info' });
      if (proceed) { await update.downloadAndInstall(); await relaunch(); }
    } else if (isManual) {
      await message("Seu PopBoost já está na versão mais recente!", { title: "PopBoost", kind: "info" });
    }
  } catch (error) {
    if (isManual) await message(`Falha ao buscar atualizações.\n\nDetalhes técnicos:\n${String(error)}`, { title: "Erro de Conexão", kind: "error" });
  }
}

function applyLanguage(lang: string) {
  currentLang = lang;
  localStorage.setItem("popboost_lang", lang); 
  const t = i18n[lang];

  document.querySelector("#ram-title")!.innerHTML = t["ram-title"];
  document.querySelector("#boost-btn")!.innerHTML = t["boost-btn"];
  (document.querySelector("#manual-game") as HTMLInputElement).placeholder = t["placeholder"];
  document.querySelector("#adv-title")!.innerHTML = t["adv-title"];
  document.querySelector("#pro-core")!.innerHTML = t["pro-core"];
  document.querySelector("#pro-dns")!.innerHTML = t["pro-dns"];
  document.querySelector("#pro-timer")!.innerHTML = t["pro-timer"];
  document.querySelector("#pro-debloat")!.innerHTML = t["pro-debloat"];
  document.querySelector("#pro-profile")!.innerHTML = t["pro-profile"];
  document.querySelector("#ultra-fps")!.innerHTML = t["ultra-fps"];
  document.querySelector("#donate-btn")!.innerHTML = t["donate-btn"];
  document.querySelector("#clean-cache-btn")!.innerHTML = t["clean-cache-btn"];
  document.querySelector("#settings-title")!.innerHTML = t["settings-title"];
  document.querySelector("#close-settings-btn")!.innerHTML = t["close-btn"];
  document.querySelector("#games-list-btn")!.innerHTML = t["my-games-btn"];
  document.querySelector("#hub-title")!.innerHTML = t["hub-title"];
  document.querySelector("#restore-btn")!.innerHTML = t["restore-btn"];
  document.querySelector("#restore-desc")!.innerHTML = t["restore-desc"];
  document.querySelector("#add-manual-btn")!.innerHTML = t["add-manual"];
  
  // Tabs e Manutenção
  document.querySelector("#tab-btn-opt")!.innerHTML = t["tab-opt"];
  document.querySelector("#tab-btn-maint")!.innerHTML = t["tab-maint"];
  document.querySelector("#sfc-btn")!.innerHTML = t["sfc-btn"];
  document.querySelector("#sfc-desc")!.innerHTML = t["sfc-desc"];
  document.querySelector("#dism-btn")!.innerHTML = t["dism-btn"];
  document.querySelector("#dism-desc")!.innerHTML = t["dism-desc"];
  document.querySelector("#mouse-btn")!.innerHTML = t["mouse-btn"];
  document.querySelector("#mouse-desc")!.innerHTML = t["mouse-desc"];
  
  if (document.querySelector("#btn-limpar-ram")) document.querySelector("#btn-limpar-ram")!.innerHTML = t["standby-btn"];
  if (document.querySelector("#update-btn")) document.querySelector("#update-btn")!.innerHTML = t["update-btn"];
}

function createGameRow(gameName: string, exeName: string, fullPath: string, container: HTMLElement, modal: HTMLElement) {
    const row = document.createElement("button");
    row.className = "glass-btn";
    row.style.width = "100%"; row.style.background = "#0b0e14"; row.style.color = "white"; row.style.border = "1px solid #1e2532";
    row.style.padding = "12px 15px"; row.style.borderRadius = "6px"; row.style.textAlign = "left"; row.style.cursor = "pointer";
    row.style.fontWeight = "bold"; row.style.display = "flex"; row.style.justifyContent = "space-between"; row.style.alignItems = "center"; 
    row.innerHTML = `<span style="font-size: 13px;">🎮 ${gameName}</span> <span style='font-size: 10px; color: #a855f7; border: 1px solid rgba(168,85,247,0.3); background: rgba(168,85,247,0.1); padding: 3px 6px; border-radius: 4px; font-weight: bold;'>${exeName}.exe</span>`;
    
    row.addEventListener("click", async () => {
        modal.style.display = "none";
        (document.querySelector("#manual-game") as HTMLInputElement).value = exeName;
        const logBox = document.querySelector("#log-box") as HTMLElement;
        logBox.innerHTML = `Iniciando ${gameName}...`;
        try {
            const res = await invoke<string>("run_game", { path: fullPath });
            logBox.innerHTML = res;
        } catch (err) {
            logBox.innerHTML = "❌ ERRO AO ABRIR JOGO";
            await message(String(err), { title: "Erro de Execução", kind: "error" });
        }
    });
    container.appendChild(row);
}

// --- 6. INICIALIZAÇÃO E EVENTOS ---
applyLanguage(currentLang);
verificarAtualizacao(false);

document.querySelector("#settings-btn")?.addEventListener("click", () => { (document.querySelector("#settings-modal") as HTMLElement).style.display = "flex"; });
document.querySelector("#close-settings-btn")?.addEventListener("click", () => { (document.querySelector("#settings-modal") as HTMLElement).style.display = "none"; });
document.querySelectorAll(".lang-btn").forEach(b => b.addEventListener("click", (e) => {
    const l = (e.target as HTMLElement).getAttribute("data-lang");
    if(l) applyLanguage(l);
}));

document.querySelector("#update-btn")?.addEventListener("click", () => verificarAtualizacao(true));

document.querySelector("#restore-btn")?.addEventListener("click", async () => {
    const logBox = document.querySelector("#log-box") as HTMLElement;
    const btn = document.querySelector("#restore-btn") as HTMLButtonElement;
    btn.innerHTML = "⏳ RESTAURANDO..."; btn.style.opacity = "0.7";
    
    try {
        const res = await invoke<string>("restore_system");
        logBox.innerHTML = res; logBox.style.color = "#ef4444";
    } catch (err) {
        logBox.innerHTML = "❌ ERRO NA RESTAURAÇÃO"; logBox.style.color = "#ef4444";
        await message(`Não foi possível restaurar o Windows.\nDetalhes:\n${err}`, { title: "Erro", kind: "error" });
    } finally {
        (document.querySelector("#settings-modal") as HTMLElement).style.display = "none";
        setTimeout(() => { btn.innerHTML = i18n[currentLang]["restore-btn"]; btn.style.opacity = "1"; logBox.style.color = "#888"; logBox.innerHTML = "Status: Sistema Pronto"; }, 3000);
    }
});

document.querySelector("#games-list-btn")?.addEventListener("click", () => {
    const modal = document.querySelector("#games-modal") as HTMLElement;
    const container = document.querySelector("#games-list-container") as HTMLElement;
    container.innerHTML = "<div style='color: #00ff99; text-align: center; padding: 40px; font-weight: bold; font-size: 14px;'>⏳ Escaneando Discos...</div>";
    modal.style.display = "flex";
    
    setTimeout(async () => {
        try {
            const games = await invoke<[string, string, string][]>("get_installed_games");
            container.innerHTML = "";
            manualGames.forEach(g => createGameRow(g[0], g[1], g[2], container, modal));
            games.forEach(g => createGameRow(g[0], g[1], g[2], container, modal));
            if (games.length === 0 && manualGames.length === 0) container.innerHTML = "<div style='color: #ef4444; text-align: center; padding: 30px; font-size: 13px;'>Nenhum jogo encontrado. Clique em + PROCURAR .EXE</div>"; 
        } catch (err) { container.innerHTML = "<div style='color: #ef4444; text-align: center; padding: 30px;'>Erro ao escanear discos.</div>"; }
    }, 150);
});

document.querySelector("#close-games-btn")?.addEventListener("click", () => { (document.querySelector("#games-modal") as HTMLElement).style.display = "none"; });

document.querySelector("#add-manual-btn")?.addEventListener("click", async () => {
    try {
        const jogoInfo = await invoke<string[]>("add_game_manually");
        if (jogoInfo && jogoInfo.length === 3) {
            manualGames.push([jogoInfo[0], jogoInfo[1], jogoInfo[2]]);
            localStorage.setItem("popboost_manual_games", JSON.stringify(manualGames));
            const container = document.querySelector("#games-list-container") as HTMLElement;
            if (container.innerHTML.includes("Nenhum jogo")) container.innerHTML = "";
            createGameRow(jogoInfo[0], jogoInfo[1], jogoInfo[2], container, document.querySelector("#games-modal") as HTMLElement);
        }
    } catch (err) {}
});

document.querySelector("#donate-btn")?.addEventListener("click", async () => { await invoke("open_donation"); });

// Monitoramento Contínuo
setInterval(async () => {
  const [ram, cpu] = await invoke<[number, number]>("get_system_info");
  document.querySelector("#ram")!.innerHTML = `${ram} MB`;
  document.querySelector("#cpu")!.innerHTML = `${cpu.toFixed(0)}%`;
  
  const manualName = (document.querySelector("#manual-game") as HTMLInputElement).value;
  const gameData = await invoke<string[]>("detect_game", { manualName });
  const status = document.querySelector("#game-status") as HTMLElement;

  if (gameData.length > 0) {
    status.innerHTML = `🎮 JOGO DETECTADO: ${gameData[0].toUpperCase()}`; status.style.color = "#00ff99"; status.style.borderColor = "rgba(0,255,153,0.3)";
    currentGameName = gameData[0];
    if (!gameDetected) { await invoke("optimize_game_process", { pid: parseInt(gameData[1]) }); gameDetected = true; }
  } else {
    status.innerHTML = i18n[currentLang]["waiting"]; status.style.color = "#64748b"; status.style.borderColor = "rgba(100,116,139,0.2)";
    gameDetected = false;
  }
}, 2000);

// --- 7. EXECUTOR DE OTIMIZAÇÕES ---
function run(cmd: string) { 
    const box = document.querySelector("#log-box") as HTMLElement;
    box.innerHTML = "⏳ Aplicando..."; box.style.color = "#38bdf8";

    invoke(cmd).then(r => { 
        box.innerHTML = r as string; box.style.color = "#00ff99";
        setTimeout(() => { box.style.color = "#888"; box.innerHTML = "Status: Sistema Pronto"; }, 6000);
    }).catch(async err => {
        box.innerHTML = "❌ FALHA NA APLICAÇÃO"; box.style.color = "#ef4444";
        await message(`Erro interno ao aplicar a otimização.\n\nDetalhes:\n${err}`, { title: "Otimização Bloqueada", kind: "error" });
        setTimeout(() => { box.style.color = "#888"; box.innerHTML = "Status: Sistema Pronto"; }, 4000);
    }); 
}

// Botões Aba 1 (Otimização)
document.querySelector("#ram-btn")?.addEventListener("click", () => run("clean_ram"));
document.querySelector("#network-btn")?.addEventListener("click", () => run("optimize_network"));
document.querySelector("#clean-cache-btn")?.addEventListener("click", () => run("clean_shader_cache"));
document.querySelector("#telemetry-btn")?.addEventListener("click", () => run("disable_telemetry"));
document.querySelector("#pro-core")?.addEventListener("click", () => run("pro_core_unparking"));
document.querySelector("#pro-dns")?.addEventListener("click", () => run("pro_custom_dns"));
document.querySelector("#pro-timer")?.addEventListener("click", () => run("pro_timer_resolution"));
document.querySelector("#pro-debloat")?.addEventListener("click", () => run("pro_debloat"));
document.querySelector("#ultra-fps")?.addEventListener("click", () => run("ultra_fps_latency"));

document.querySelector("#pro-profile")?.addEventListener("click", () => {
    if(!currentGameName) return run("error_no_game");
    run(`pro_smart_profiles`);
});

document.querySelector("#boost-btn")?.addEventListener("click", async () => {
    const log = document.querySelector("#log-box") as HTMLElement;
    const btn = document.querySelector("#boost-btn") as HTMLButtonElement;
    
    btn.disabled = true; btn.style.opacity = "0.7"; btn.innerHTML = "⏳ OTIMIZANDO...";
    
    const steps = [
      { msg: "1/8: Energia e Disco...", cmd: "boost_system" }, { msg: "2/8: Internet e Ping...", cmd: "optimize_network" },
      { msg: "3/8: Telemetria...", cmd: "disable_telemetry" }, { msg: "4/8: Processador...", cmd: "pro_core_unparking" },
      { msg: "5/8: DNS Gamer...", cmd: "pro_custom_dns" }, { msg: "6/8: Timer Resolution...", cmd: "pro_timer_resolution" },
      { msg: "7/8: Ultra FPS...", cmd: "ultra_fps_latency" }, { msg: "8/8: Debloat...", cmd: "pro_debloat" }
    ];

    let hasError = false;
    for (const step of steps) { 
        log.innerHTML = step.msg; 
        try { await invoke(step.cmd); } 
        catch(err) { hasError = true; await message(`Falha na etapa: ${step.msg}\n\nO Boost Total foi interrompido.\nMotivo: ${err}`, { title: "Boost Interrompido", kind: "error" }); break; }
    }

    if (hasError) {
        log.innerHTML = "⚠️ BOOST CANCELADO"; log.style.color = "#ef4444";
        btn.innerHTML = "⚡ BOOST TOTAL"; btn.style.background = "linear-gradient(90deg, #38bdf8, #2563eb)"; btn.style.opacity = "1"; btn.disabled = false;
    } else {
        log.innerHTML = "✅ TUDO PRONTO! (REINICIE O PC)"; log.style.color = "#00ff99";
        btn.innerHTML = "⚡ BOOST ATIVADO"; btn.style.background = "#059669"; btn.style.opacity = "1";
        setTimeout(() => { btn.innerHTML = "⚡ BOOST TOTAL"; btn.disabled = false; btn.style.background = "linear-gradient(90deg, #38bdf8, #2563eb)"; log.style.color = "#888"; log.innerHTML = "Status: Sistema Pronto"; }, 5000);
    }
});

document.querySelector("#btn-limpar-ram")?.addEventListener("click", async () => {
    const btn = document.querySelector("#btn-limpar-ram") as HTMLButtonElement;
    const logBox = document.querySelector("#log-box") as HTMLElement;
    btn.innerText = "⏳ LIMPANDO NÚCLEO..."; btn.disabled = true;
    try {
        const resultado = await invoke("limpar_memoria_standby");
        logBox.innerHTML = resultado as string; logBox.style.color = "#00ff99";
    } catch (erro) {
        logBox.innerHTML = "❌ ACESSO NEGADO"; logBox.style.color = "#ef4444";
        await message(`Não foi possível limpar a Memória Profunda.\n\n${erro}`, { title: "Ação Bloqueada", kind: "error" });
    } finally {
        btn.innerText = i18n[currentLang]["standby-btn"]; btn.disabled = false;
        setTimeout(() => { logBox.style.color = "#888"; logBox.innerHTML = "Status: Sistema Pronto"; }, 4000);
    }
});

// Botões Aba 2 (Manutenção Pro)
document.querySelector("#sfc-btn")?.addEventListener("click", () => {
    run("run_sfc_scan");
    message("A verificação do SFC foi iniciada num terminal à parte. Por favor, aguarde que chegue aos 100%.", { title: "Aviso de Sistema", kind: "info" });
});
document.querySelector("#dism-btn")?.addEventListener("click", () => {
    run("run_dism_repair");
    message("A restauração do DISM foi iniciada. Isto pode demorar alguns minutos e o processo será mostrado num terminal à parte.", { title: "Aviso de Sistema", kind: "info" });
});
document.querySelector("#mouse-btn")?.addEventListener("click", () => run("fix_mouse_input"));