// Sistema de Gerenciamento de Preferências de Usuário
// Salva e carrega preferências específicas por usuário

class UserPreferencesManager {
    constructor() {
        this.currentUser = null;
        this.preferences = {
            theme: 'light',
            ttsEnabled: true,
            ttsVolume: 70,
            soundEnabled: true,
            notificationsEnabled: true,
            autoBackup: true,
            language: 'pt-BR'
        };
        
        this.defaultPreferences = { ...this.preferences };
        this.isLoading = false;
        this.isInitialized = false;
    }

    /**
     * Inicializar o sistema de preferências
     */
    async initialize() {
        if (this.isInitialized) {
            console.log('[PREFERENCES] Sistema já inicializado, ignorando');
            return;
        }
        
        try {
            this.isInitialized = true;
            
            // Obter usuário atual do Electron
            if (window.ipcRenderer) {
                this.currentUser = await window.ipcRenderer.invoke('getCurrentUser');
            }
            
            if (this.currentUser) {
                console.log(`[PREFERENCES] Inicializando preferências para usuário: ${this.currentUser.username}`);
                await this.loadUserPreferences();
            } else {
                console.log('[PREFERENCES] Nenhum usuário logado, usando preferências padrão');
                this.loadDefaultPreferences();
            }
        } catch (error) {
            console.error('[PREFERENCES] Erro ao inicializar preferências:', error);
            this.loadDefaultPreferences();
        }
    }

    /**
     * Carregar preferências do usuário
     */
    async loadUserPreferences() {
        if (!this.currentUser) {
            console.log('[PREFERENCES] Nenhum usuário definido, carregando preferências padrão');
            this.loadDefaultPreferences();
            return;
        }

        if (this.isLoading) {
            console.log('[PREFERENCES] Carregamento já em andamento, ignorando');
            return;
        }

        this.isLoading = true;
        
        try {
            console.log(`[PREFERENCES] Carregando preferências para usuário ID: ${this.currentUser.id}`);
            
            // Buscar preferências salvas no Electron Store
            const savedPreferences = await window.ipcRenderer.invoke('getUserPreferences', this.currentUser.id);
            
            if (savedPreferences && Object.keys(savedPreferences).length > 0) {
                this.preferences = { ...this.defaultPreferences, ...savedPreferences };
                console.log('[PREFERENCES] Preferências carregadas do banco:', this.preferences);
            } else {
                console.log('[PREFERENCES] Nenhuma preferência salva encontrada, usando padrões');
                this.preferences = { ...this.defaultPreferences };
            }
            
            // Aplicar preferências carregadas
            await this.applyPreferences();
            
        } catch (error) {
            console.error('[PREFERENCES] Erro ao carregar preferências:', error);
            this.loadDefaultPreferences();
        } finally {
            this.isLoading = false;
        }
    }

    /**
     * Carregar preferências padrão
     */
    loadDefaultPreferences() {
        this.preferences = { ...this.defaultPreferences };
        this.applyPreferences();
        console.log('[PREFERENCES] Preferências padrão carregadas');
    }

    /**
     * Salvar preferências do usuário
     */
    async saveUserPreferences() {
        if (!this.currentUser || this.isLoading) {
            return;
        }

        try {
            await window.ipcRenderer.invoke('saveUserPreferences', this.currentUser.id, this.preferences);
            console.log('[PREFERENCES] Preferências salvas:', this.preferences);
        } catch (error) {
            console.error('[PREFERENCES] Erro ao salvar preferências:', error);
        }
    }

    /**
     * Aplicar preferências carregadas
     */
    async applyPreferences() {
        try {
            // Aplicar tema
            this.applyTheme(this.preferences.theme);
            
            // Aplicar configurações de TTS
            this.applyTTSSettings();
            
            // Aplicar configurações de som
            this.applySoundSettings();
            
            // Aplicar configurações de notificações
            this.applyNotificationSettings();
            
            console.log('[PREFERENCES] Preferências aplicadas com sucesso');
        } catch (error) {
            console.error('[PREFERENCES] Erro ao aplicar preferências:', error);
        }
    }

    /**
     * Aplicar tema
     */
    applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        
        // Atualizar ícone do botão de tema
        const themeBtn = document.getElementById('themeBtn');
        if (themeBtn) {
            const icon = themeBtn.querySelector('svg');
            if (icon) {
                if (theme === 'dark') {
                    icon.innerHTML = `<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>`;
                } else {
                    icon.innerHTML = `
                        <circle cx="12" cy="12" r="5"></circle>
                        <line x1="12" y1="1" x2="12" y2="3"></line>
                        <line x1="12" y1="21" x2="12" y2="23"></line>
                        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                        <line x1="1" y1="12" x2="3" y2="12"></line>
                        <line x1="21" y1="12" x2="23" y2="12"></line>
                        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
                    `;
                }
            }
        }
        
        console.log(`[PREFERENCES] Tema aplicado: ${theme}`);
    }

    /**
     * Aplicar configurações de TTS
     */
    applyTTSSettings() {
        // Atualizar Voice Manager se disponível
        if (window.voiceManager) {
            window.voiceManager.setEnabled(this.preferences.ttsEnabled);
            window.voiceManager.setVolume(this.preferences.ttsVolume / 100);
        }
        
        console.log(`[PREFERENCES] TTS configurado: enabled=${this.preferences.ttsEnabled}, volume=${this.preferences.ttsVolume}`);
    }

    /**
     * Aplicar configurações de som
     */
    applySoundSettings() {
        // Atualizar Sound Manager se disponível
        if (window.soundManager) {
            window.soundManager.setEnabled(this.preferences.soundEnabled);
        }
        
        console.log(`[PREFERENCES] Som configurado: enabled=${this.preferences.soundEnabled}`);
    }

    /**
     * Aplicar configurações de notificações
     */
    applyNotificationSettings() {
        // Atualizar sistema de notificações se disponível
        if (window.notificationSystem) {
            window.notificationSystem.settings.enabled = this.preferences.notificationsEnabled;
        }
        
        console.log(`[PREFERENCES] Notificações configuradas: enabled=${this.preferences.notificationsEnabled}`);
    }

    /**
     * Atualizar uma preferência específica
     */
    async updatePreference(key, value) {
        if (this.preferences.hasOwnProperty(key)) {
            this.preferences[key] = value;
            
            // Aplicar a mudança imediatamente
            switch (key) {
                case 'theme':
                    this.applyTheme(value);
                    break;
                case 'ttsEnabled':
                case 'ttsVolume':
                    this.applyTTSSettings();
                    break;
                case 'soundEnabled':
                    this.applySoundSettings();
                    break;
                case 'notificationsEnabled':
                    this.applyNotificationSettings();
                    break;
            }
            
            // Salvar preferências
            await this.saveUserPreferences();
            
            console.log(`[PREFERENCES] Preferência atualizada: ${key} = ${value}`);
        }
    }

    /**
     * Obter uma preferência específica
     */
    getPreference(key) {
        return this.preferences[key];
    }

    /**
     * Obter todas as preferências
     */
    getAllPreferences() {
        return { ...this.preferences };
    }

    /**
     * Resetar preferências para padrão
     */
    async resetToDefaults() {
        this.preferences = { ...this.defaultPreferences };
        await this.applyPreferences();
        await this.saveUserPreferences();
        console.log('[PREFERENCES] Preferências resetadas para padrão');
    }

    /**
     * Exportar preferências
     */
    exportPreferences() {
        return {
            user: this.currentUser ? this.currentUser.username : 'unknown',
            preferences: this.preferences,
            exportedAt: new Date().toISOString()
        };
    }

    /**
     * Importar preferências
     */
    async importPreferences(data) {
        if (data && data.preferences) {
            this.preferences = { ...this.defaultPreferences, ...data.preferences };
            await this.applyPreferences();
            await this.saveUserPreferences();
            console.log('[PREFERENCES] Preferências importadas com sucesso');
        }
    }
}

// Instância global do gerenciador de preferências
const userPreferencesManager = new UserPreferencesManager();

// Exportar para uso global
window.userPreferencesManager = userPreferencesManager;

console.log('[PREFERENCES] Sistema de preferências de usuário carregado');