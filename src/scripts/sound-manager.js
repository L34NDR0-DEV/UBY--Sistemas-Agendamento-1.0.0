// Sistema de Gerenciamento de Sons e Efeitos Sonoros
// Responsável por tocar sons de alerta, notificações e efeitos

class SoundManager {
    constructor() {
        this.enabled = localStorage.getItem('soundEnabled') !== 'false';
        this.volume = parseFloat(localStorage.getItem('soundVolume') || '70') / 100;
        this.sounds = {};
        this.audioContext = null;
        
        this.initializeAudioContext();
        this.loadSounds();
        this.setupEventListeners();
    }
    
    initializeAudioContext() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            console.log('[SoundManager] AudioContext inicializado');
        } catch (error) {
            console.warn('[SoundManager] AudioContext não suportado:', error);
        }
    }
    
    loadSounds() {
        // Definir sons disponíveis
        this.soundFiles = {
            alert: '../../assets/som.mp3',
            notification: '../../assets/notification.mp3',
            success: '../../assets/success.mp3',
            error: '../../assets/error.mp3',
            reminder: '../../assets/reminder.mp3'
        };
        
        // Pré-carregar sons principais
        this.preloadSound('alert');
    }
    
    preloadSound(soundName) {
        if (!this.soundFiles[soundName]) return;
        
        const audio = new Audio(this.soundFiles[soundName]);
        audio.preload = 'auto';
        audio.volume = 0; // Silencioso para pré-carregamento
        
        audio.addEventListener('canplaythrough', () => {
            console.log(`[SoundManager] Som "${soundName}" pré-carregado`);
        });
        
        audio.addEventListener('error', (error) => {
            console.warn(`[SoundManager] Erro ao carregar som "${soundName}":`, error);
        });
        
        this.sounds[soundName] = audio;
    }
    
    setupEventListeners() {
        document.addEventListener('DOMContentLoaded', () => {
            const soundToggle = document.getElementById('soundEnabled');
            const soundVolumeSlider = document.getElementById('soundVolumeSlider');
            
            if (soundToggle) {
                soundToggle.checked = this.enabled;
                soundToggle.addEventListener('change', (e) => {
                    this.enabled = e.target.checked;
                    localStorage.setItem('soundEnabled', this.enabled);
                    console.log('[SoundManager] Som', this.enabled ? 'habilitado' : 'desabilitado');
                });
            }
            
            if (soundVolumeSlider) {
                soundVolumeSlider.value = this.volume * 100;
                soundVolumeSlider.addEventListener('input', (e) => {
                    this.volume = parseFloat(e.target.value) / 100;
                    localStorage.setItem('soundVolume', e.target.value);
                    document.getElementById('soundVolumeValue').textContent = e.target.value + '%';
                    console.log('[SoundManager] Volume do som:', this.volume);
                });
            }
        });
    }
    
    /**
     * Tocar som específico
     */
    playSound(soundName, options = {}) {
        if (!this.enabled) {
            console.log('[SoundManager] Som desabilitado');
            return Promise.resolve();
        }
        
        return new Promise((resolve, reject) => {
            try {
                let audio;
                
                // Usar som pré-carregado ou criar novo
                if (this.sounds[soundName]) {
                    audio = this.sounds[soundName].cloneNode();
                } else if (this.soundFiles[soundName]) {
                    audio = new Audio(this.soundFiles[soundName]);
                } else {
                    console.warn(`[SoundManager] Som "${soundName}" não encontrado`);
                    resolve();
                    return;
                }
                
                // Configurar volume
                const volume = options.volume !== undefined ? options.volume : this.volume;
                audio.volume = Math.max(0, Math.min(1, volume));
                
                // Configurar eventos
                audio.onended = () => {
                    console.log(`[SoundManager] Som "${soundName}" finalizado`);
                    resolve();
                };
                
                audio.onerror = (error) => {
                    console.error(`[SoundManager] Erro ao tocar som "${soundName}":`, error);
                    reject(error);
                };
                
                // Tocar som
                const playPromise = audio.play();
                
                if (playPromise !== undefined) {
                    playPromise
                        .then(() => {
                            console.log(`[SoundManager] Som "${soundName}" iniciado`);
                        })
                        .catch((error) => {
                            console.error(`[SoundManager] Erro ao iniciar som "${soundName}":`, error);
                            reject(error);
                        });
                } else {
                    console.log(`[SoundManager] Som "${soundName}" iniciado (fallback)`);
                }
                
            } catch (error) {
                console.error(`[SoundManager] Erro geral ao tocar som "${soundName}":`, error);
                reject(error);
            }
        });
    }
    
    /**
     * Sons específicos para diferentes situações
     */
    playAlert(options = {}) {
        return this.playSound('alert', { volume: Math.min(this.volume + 0.2, 1), ...options });
    }
    
    playNotification(options = {}) {
        return this.playSound('notification', options);
    }
    
    playSuccess(options = {}) {
        return this.playSound('success', options);
    }
    
    playError(options = {}) {
        return this.playSound('error', options);
    }
    
    playReminder(options = {}) {
        return this.playSound('reminder', options);
    }
    

    
    /**
     * Controle de volume
     */
    setVolume(volume) {
        this.volume = Math.max(0, Math.min(1, volume));
        localStorage.setItem('soundVolume', this.volume * 100);
        console.log('[SoundManager] Volume alterado para:', this.volume);
    }
    
    getVolume() {
        return this.volume;
    }
    
    /**
     * Habilitar/desabilitar som
     */
    enable() {
        this.enabled = true;
        localStorage.setItem('soundEnabled', 'true');
        console.log('[SoundManager] Som habilitado');
    }
    
    disable() {
        this.enabled = false;
        localStorage.setItem('soundEnabled', 'false');
        console.log('[SoundManager] Som desabilitado');
    }
    
    setEnabled(enabled) {
        if (enabled) {
            this.enable();
        } else {
            this.disable();
        }
    }
    
    isEnabled() {
        return this.enabled;
    }
    
    /**
     * Parar todos os sons
     */
    stopAllSounds() {
        Object.values(this.sounds).forEach(audio => {
            if (audio && !audio.paused) {
                audio.pause();
                audio.currentTime = 0;
            }
        });
        console.log('[SoundManager] Todos os sons parados');
    }
}

// Instância global do SoundManager
const soundManager = new SoundManager();

// Exportar para uso em outros scripts
window.soundManager = soundManager;

// Funções globais para compatibilidade
window.playAlert = (options) => soundManager.playAlert(options);
window.playNotification = (options) => soundManager.playNotification(options);
window.playSuccess = (options) => soundManager.playSuccess(options);
window.playError = (options) => soundManager.playError(options);
window.playReminder = (options) => soundManager.playReminder(options);

console.log('[SoundManager] Sistema de som inicializado');