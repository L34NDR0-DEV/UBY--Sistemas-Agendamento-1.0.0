/**
 * Sistema de Atualização UBY Agendamentos
 * Versão 2.0 - Completamente reformulado
 * 
 * Funcionalidades:
 * - Verificação automática de atualizações
 * - Interface moderna e intuitiva
 * - Notificações em tempo real
 * - Sistema de retry inteligente
 * - Logs detalhados para debug
 */

// Carregar ícones profissionais
const script = document.createElement('script');
script.src = '../assets/icons/update-icons.js';
document.head.appendChild(script);

// Utilitário para obter ipcRenderer de forma segura
function getIpcRenderer() {
    try {
        if (typeof window !== 'undefined' && window.require) {
            const { ipcRenderer } = window.require('electron');
            return ipcRenderer;
        }
        return null;
    } catch (error) {
        console.warn('[UPDATER] IPC Renderer não disponível:', error.message);
        return null;
    }
}

class ModernUpdateManager {
    constructor() {
        console.log('[UPDATER] Inicializando Sistema de Atualização v2.0...');
        
        // Estado do sistema
        this.state = {
            isChecking: false,
            isDownloading: false,
            isInstalling: false,
            isDisabled: false,
            hasUpdate: false,
            currentVersion: '1.0.0',
            latestVersion: null,
            updateInfo: null,
            downloadProgress: 0,
            errorCount: 0,
            maxRetries: 3,
            retryDelay: 5000
        };
        
        // Configurações
        this.config = {
            autoCheckInterval: 30 * 60 * 1000, // 30 minutos
            silentCheckInterval: 2 * 60 * 60 * 1000, // 2 horas
            maxErrors: 5,
            disableTimeout: 30 * 60 * 1000 // 30 minutos
        };
        
        // Elementos da UI
        this.elements = {
            updateButton: null,
            modal: null,
            toast: null
        };
        
        this.init();
    }
    
    /**
     * Inicialização do sistema
     */
    async init() {
        try {
            console.log('[UPDATER] Configurando sistema...');
            
            await this.getCurrentVersion();
            this.setupEventListeners();
            this.setupAutoCheck();
            
            console.log('[UPDATER] Sistema inicializado com sucesso');
            console.log('[UPDATER] Versão atual:', this.state.currentVersion);
            
        } catch (error) {
            console.error('[UPDATER] Erro na inicialização:', error);
            this.handleError(error);
        }
    }
    
    /**
     * Obter versão atual da aplicação
     */
    async getCurrentVersion() {
        try {
            const ipc = getIpcRenderer();
            if (ipc) {
                const version = await ipc.invoke('get-app-version');
                if (version) {
                    this.state.currentVersion = version;
                    console.log('[UPDATER] Versão detectada:', version);
                }
            }
        } catch (error) {
            console.warn('[UPDATER] Não foi possível obter versão:', error.message);
        }
    }
    
    /**
     * Configurar event listeners do IPC
     */
    setupEventListeners() {
        // Aguardar disponibilidade do IPC
        setTimeout(() => {
            const ipc = getIpcRenderer();
            if (!ipc) {
                console.warn('[UPDATER] IPC não disponível - modo web detectado');
                return;
            }
            
            console.log('[UPDATER] Configurando listeners IPC...');
            
            // Eventos de atualização
            ipc.on('update-available', (event, info) => {
                console.log('[UPDATER] Atualização disponível:', info);
                this.handleUpdateAvailable(info);
            });
            
            ipc.on('update-not-available', () => {
                console.log('[UPDATER] Sistema atualizado');
                this.handleNoUpdate();
            });
            
            ipc.on('download-progress', (event, progress) => {
                console.log('[UPDATER] Progresso:', Math.round(progress.percent) + '%');
                this.handleDownloadProgress(progress);
            });
            
            ipc.on('update-downloaded', () => {
                console.log('[UPDATER] Download concluído');
                this.handleUpdateDownloaded();
            });
            
            ipc.on('update-error', (event, error) => {
                console.error('[UPDATER] Erro de atualização:', error);
                this.handleError(error);
            });
            
            console.log('[UPDATER] Listeners configurados');
            
        }, 1000);
    }
    
    /**
     * Configurar verificação automática
     */
    setupAutoCheck() {
        // Verificação inicial após 10 segundos
        setTimeout(() => {
            this.checkForUpdates(true);
        }, 10000);
        
        // Verificação periódica
        setInterval(() => {
            if (!this.state.isDisabled) {
                this.checkForUpdates(true);
            }
        }, this.config.silentCheckInterval);
    }
    
    /**
     * Verificar atualizações
     */
    async checkForUpdates(silent = false) {
        if (this.state.isChecking || this.state.isDisabled) {
            console.log('[UPDATER] Verificação ignorada - sistema ocupado ou desabilitado');
            return;
        }
        
        try {
            this.state.isChecking = true;
            
            if (!silent) {
                this.showToast('Verificando atualizações...', 'info');
            }
            
            console.log('[UPDATER] Iniciando verificação...');
            
            const ipc = getIpcRenderer();
            if (!ipc) {
                throw new Error('Sistema de atualizações não disponível');
            }
            
            await ipc.invoke('check-for-updates');
            
        } catch (error) {
            console.error('[UPDATER] Erro na verificação:', error);
            this.handleError(error);
            
            if (!silent) {
                this.showToast('Erro ao verificar atualizações', 'error');
            }
        } finally {
            this.state.isChecking = false;
        }
    }
    
    /**
     * Manipular atualização disponível
     */
    handleUpdateAvailable(updateInfo) {
        this.state.hasUpdate = true;
        this.state.updateInfo = updateInfo;
        this.state.latestVersion = updateInfo.version;
        
        this.createUpdateButton();
        this.showUpdateDialog(updateInfo);
        
        console.log('[UPDATER] Atualização configurada:', {
            current: this.state.currentVersion,
            latest: this.state.latestVersion
        });
    }
    
    /**
     * Manipular ausência de atualização
     */
    handleNoUpdate() {
        this.state.hasUpdate = false;
        this.removeUpdateButton();
        
        if (!this.state.isChecking) {
            this.showToast('Sistema está atualizado', 'success');
        }
    }
    
    /**
     * Manipular progresso do download
     */
    handleDownloadProgress(progress) {
        this.state.downloadProgress = progress.percent;
        this.updateProgressDisplay(progress);
    }
    
    /**
     * Manipular download concluído
     */
    handleUpdateDownloaded() {
        this.state.isDownloading = false;
        this.showInstallDialog();
    }
    
    /**
     * Manipular erros
     */
    handleError(error) {
        this.state.errorCount++;
        
        console.error('[UPDATER] Erro capturado:', error);
        
        // Desabilitar temporariamente se muitos erros
        if (this.state.errorCount >= this.config.maxErrors) {
            this.state.isDisabled = true;
            console.warn('[UPDATER] Sistema desabilitado temporariamente');
            
            this.showToast('Sistema de atualizações temporariamente indisponível', 'warning');
            
            // Reabilitar após timeout
            setTimeout(() => {
                this.state.isDisabled = false;
                this.state.errorCount = 0;
                console.log('[UPDATER] Sistema reabilitado');
            }, this.config.disableTimeout);
        }
    }
    
    /**
     * Criar botão de atualização no header
     */
    createUpdateButton() {
        // Remover botão existente
        this.removeUpdateButton();
        
        const headerRight = document.querySelector('.header-right');
        if (!headerRight) {
            console.warn('[UPDATER] Header não encontrado');
            return;
        }
        
        // Aguardar carregamento dos ícones
        setTimeout(() => {
            const updateBtn = document.createElement('button');
            updateBtn.className = 'header-btn update-btn pulse-animation';
            updateBtn.id = 'modernUpdateBtn';
            updateBtn.title = 'Nova Atualização Disponível - Clique para Atualizar';
            
            // Usar ícone profissional
            const refreshIcon = window.UpdateIcons ? window.UpdateIcons.refresh : `
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
                    <path d="M21 3v5h-5"/>
                    <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
                    <path d="M3 21v-5h5"/>
                </svg>
            `;
            
            updateBtn.innerHTML = `
                ${refreshIcon}
                <span class="update-badge">!</span>
            `;
            
            // Event listener
            updateBtn.addEventListener('click', () => {
                this.showUpdateDialog(this.state.updateInfo);
            });
            
            // Inserir no header
            headerRight.insertBefore(updateBtn, headerRight.firstChild);
            this.elements.updateButton = updateBtn;
            
            console.log('[UPDATER] Botão de atualização criado');
        }, 100);
    }
    
    /**
     * Remover botão de atualização
     */
    removeUpdateButton() {
        const existingBtn = document.getElementById('modernUpdateBtn');
        if (existingBtn) {
            existingBtn.remove();
            this.elements.updateButton = null;
            console.log('[UPDATER] Botão removido');
        }
    }
    
    /**
     * Mostrar diálogo de atualização
     */
    showUpdateDialog(updateInfo) {
        this.closeModal(); // Fechar modal existente
        
        const modal = document.createElement('div');
        modal.className = 'modern-update-modal';
        modal.innerHTML = `
            <div class="modal-overlay" onclick="window.modernUpdateManager.closeModal()"></div>
            <div class="modal-content">
                <div class="modal-header">
                    <div class="update-icon">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M12 2v10l3-3m-3 3l-3-3"/>
                            <circle cx="12" cy="12" r="10"/>
                        </svg>
                    </div>
                    <div class="update-info">
                        <h3>Nova Atualização Disponível</h3>
                        <p>Versão ${updateInfo.version} está pronta para download</p>
                    </div>
                    <button class="close-btn" onclick="window.modernUpdateManager.closeModal()">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
                
                <div class="modal-body">
                    <div class="version-comparison">
                        <div class="version-item current">
                            <span class="version-label">Versão Atual</span>
                            <span class="version-number">${this.state.currentVersion}</span>
                        </div>
                        <div class="version-arrow">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="5" y1="12" x2="19" y2="12"></line>
                                <polyline points="12,5 19,12 12,19"></polyline>
                            </svg>
                        </div>
                        <div class="version-item new">
                            <span class="version-label">Nova Versão</span>
                            <span class="version-number">${updateInfo.version}</span>
                        </div>
                    </div>
                    
                    <div class="update-features">
                        <h4>Melhorias desta versão:</h4>
                        <ul>
                            <li><span class="feature-icon">${window.UpdateIcons ? window.UpdateIcons.performance : '⚡'}</span> Correções de bugs e melhorias de performance</li>
                            <li><span class="feature-icon">${window.UpdateIcons ? window.UpdateIcons.install : '🔧'}</span> Otimizações no sistema de agendamentos</li>
                            <li><span class="feature-icon">${window.UpdateIcons ? window.UpdateIcons.design : '🎨'}</span> Aprimoramentos na interface do usuário</li>
                            <li><span class="feature-icon">${window.UpdateIcons ? window.UpdateIcons.security : '🔒'}</span> Atualizações de segurança importantes</li>
                        </ul>
                    </div>
                </div>
                
                <div class="modal-actions">
                    <button class="btn-secondary" onclick="window.modernUpdateManager.closeModal()">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"/>
                            <path d="M12 6v6l4 2"/>
                        </svg>
                        Instalar Depois
                    </button>
                    <button class="btn-primary" onclick="window.modernUpdateManager.startDownload()">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                            <polyline points="7,10 12,15 17,10"/>
                            <line x1="12" y1="15" x2="12" y2="3"/>
                        </svg>
                        Baixar Agora
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        this.elements.modal = modal;
        
        // Animação de entrada
        setTimeout(() => modal.classList.add('show'), 10);
        
        console.log('[UPDATER] Diálogo de atualização exibido');
    }
    
    /**
     * Iniciar download da atualização
     */
    async startDownload() {
        if (this.state.isDownloading) return;
        
        try {
            this.state.isDownloading = true;
            this.showDownloadProgress();
            
            const ipc = getIpcRenderer();
            if (!ipc) {
                throw new Error('Sistema de atualizações não disponível');
            }
            
            await ipc.invoke('download-update');
            console.log('[UPDATER] Download iniciado');
            
        } catch (error) {
            console.error('[UPDATER] Erro ao iniciar download:', error);
            this.handleError(error);
            this.showToast('Erro ao baixar atualização', 'error');
        }
    }
    
    /**
     * Mostrar progresso do download
     */
    showDownloadProgress() {
        if (!this.elements.modal) return;
        
        const modalBody = this.elements.modal.querySelector('.modal-body');
        const modalActions = this.elements.modal.querySelector('.modal-actions');
        
        modalBody.innerHTML = `
            <div class="download-progress">
                <div class="progress-header">
                    <div class="progress-icon">
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                            <polyline points="7,10 12,15 17,10"/>
                            <line x1="12" y1="15" x2="12" y2="3"/>
                        </svg>
                    </div>
                    <div class="progress-info">
                        <h4>Baixando Atualização</h4>
                        <p>Por favor, aguarde enquanto a nova versão é baixada...</p>
                    </div>
                </div>
                
                <div class="progress-container">
                    <div class="progress-bar">
                        <div class="progress-fill" id="downloadProgressBar"></div>
                    </div>
                    <div class="progress-stats">
                        <span id="progressPercent">0%</span>
                        <span id="progressSpeed">Calculando...</span>
                    </div>
                </div>
                
                <div class="progress-details">
                    <div class="detail-item">
                        <span class="detail-label">Status:</span>
                        <span id="downloadStatus">Iniciando download...</span>
                    </div>
                </div>
            </div>
        `;
        
        modalActions.innerHTML = `
            <button class="btn-secondary" onclick="window.modernUpdateManager.cancelDownload()">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="15" y1="9" x2="9" y2="15"/>
                    <line x1="9" y1="9" x2="15" y2="15"/>
                </svg>
                Cancelar
            </button>
        `;
    }
    
    /**
     * Atualizar display do progresso
     */
    updateProgressDisplay(progress) {
        const progressBar = document.getElementById('downloadProgressBar');
        const progressPercent = document.getElementById('progressPercent');
        const progressSpeed = document.getElementById('progressSpeed');
        const downloadStatus = document.getElementById('downloadStatus');
        
        if (progressBar) {
            progressBar.style.width = `${progress.percent}%`;
        }
        
        if (progressPercent) {
            progressPercent.textContent = `${Math.round(progress.percent)}%`;
        }
        
        if (progressSpeed && progress.bytesPerSecond) {
            const speed = this.formatBytes(progress.bytesPerSecond);
            progressSpeed.textContent = `${speed}/s`;
        }
        
        if (downloadStatus) {
            if (progress.percent < 100) {
                downloadStatus.textContent = 'Baixando arquivos...';
            } else {
                downloadStatus.textContent = 'Finalizando download...';
            }
        }
    }
    
    /**
     * Mostrar diálogo de instalação
     */
    showInstallDialog() {
        if (!this.elements.modal) return;
        
        const modalBody = this.elements.modal.querySelector('.modal-body');
        const modalActions = this.elements.modal.querySelector('.modal-actions');
        
        modalBody.innerHTML = `
            <div class="install-ready">
                <div class="install-header">
                    <div class="install-icon">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                        </svg>
                    </div>
                    <div class="install-info">
                        <h4>Pronto para Instalar</h4>
                        <p>A atualização foi baixada com sucesso e está pronta para ser aplicada.</p>
                    </div>
                </div>
                
                <div class="install-details">
                    <div class="detail-card">
                        <div class="card-icon">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                            </svg>
                        </div>
                        <div class="card-content">
                            <h5>Instalação Rápida</h5>
                            <p>O processo levará apenas alguns segundos</p>
                        </div>
                    </div>
                    
                    <div class="detail-card">
                        <div class="card-icon">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M9 12l2 2 4-4"/>
                                <circle cx="12" cy="12" r="10"/>
                            </svg>
                        </div>
                        <div class="card-content">
                            <h5>Dados Preservados</h5>
                            <p>Todos os seus agendamentos serão mantidos</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        modalActions.innerHTML = `
            <button class="btn-secondary" onclick="window.modernUpdateManager.closeModal()">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M12 6v6l4 2"/>
                </svg>
                Instalar Depois
            </button>
            <button class="btn-primary" onclick="window.modernUpdateManager.installUpdate()">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                </svg>
                Instalar Agora
            </button>
        `;
    }
    
    /**
     * Instalar atualização
     */
    async installUpdate() {
        try {
            this.state.isInstalling = true;
            
            const ipc = getIpcRenderer();
            if (!ipc) {
                throw new Error('Sistema de atualizações não disponível');
            }
            
            this.showToast('Instalando atualização...', 'info');
            await ipc.invoke('quit-and-install');
            
        } catch (error) {
            console.error('[UPDATER] Erro na instalação:', error);
            this.handleError(error);
            this.showToast('Erro ao instalar atualização', 'error');
        }
    }
    
    /**
     * Cancelar download
     */
    async cancelDownload() {
        try {
            const ipc = getIpcRenderer();
            if (ipc) {
                await ipc.invoke('cancel-update');
            }
            
            this.state.isDownloading = false;
            this.closeModal();
            this.showToast('Download cancelado', 'warning');
            
        } catch (error) {
            console.error('[UPDATER] Erro ao cancelar:', error);
        }
    }
    
    /**
     * Fechar modal
     */
    closeModal() {
        if (this.elements.modal) {
            this.elements.modal.classList.add('hide');
            setTimeout(() => {
                if (this.elements.modal) {
                    this.elements.modal.remove();
                    this.elements.modal = null;
                }
            }, 300);
        }
    }
    
    /**
     * Mostrar toast de notificação
     */
    showToast(message, type = 'info') {
        // Remover toast existente
        const existingToast = document.querySelector('.update-toast');
        if (existingToast) {
            existingToast.remove();
        }
        
        const toast = document.createElement('div');
        toast.className = `update-toast toast-${type}`;
        toast.innerHTML = `
            <div class="toast-content">
                <span class="toast-message">${message}</span>
                <button class="toast-close" onclick="this.parentElement.parentElement.remove()">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            </div>
        `;
        
        document.body.appendChild(toast);
        
        // Animação de entrada
        setTimeout(() => toast.classList.add('show'), 10);
        
        // Auto-remover após 5 segundos
        setTimeout(() => {
            if (toast.parentElement) {
                toast.classList.add('hide');
                setTimeout(() => toast.remove(), 300);
            }
        }, 5000);
        
        console.log(`[UPDATER] Toast: ${message}`);
    }
    
    /**
     * Formatar bytes para display
     */
    formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }
    
    /**
     * Obter informações do sistema
     */
    getSystemInfo() {
        return {
            version: this.state.currentVersion,
            hasUpdate: this.state.hasUpdate,
            isChecking: this.state.isChecking,
            isDownloading: this.state.isDownloading,
            isInstalling: this.state.isInstalling,
            isDisabled: this.state.isDisabled,
            errorCount: this.state.errorCount
        };
    }
}

// Inicialização quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', () => {
    console.log('[UPDATER] Inicializando Sistema de Atualização Moderno...');
    
    // Criar instância global
    window.modernUpdateManager = new ModernUpdateManager();
    
    // Manter compatibilidade com código existente
    window.updateManager = window.modernUpdateManager;
    
    console.log('[UPDATER] Sistema moderno inicializado com sucesso');
});

// Exportar para uso em outros módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ModernUpdateManager;
}