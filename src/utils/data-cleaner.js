/**
 * Sistema de Lixeira Moderno e Robusto
 * Gerencia limpeza de dados com confirmação, backup e recuperação
 */

class DataCleaner {
    constructor() {
        this.isProcessing = false;
        this.backupEnabled = true;
        this.confirmationRequired = true;
        this.maxBackups = 5;
        
        // Configurações de limpeza
        this.cleanupRules = {
            oldAppointmentDays: 365,
            oldNotificationDays: 90,
            maxAppointmentsPerUser: 1000,
            maxNotificationsPerUser: 100,
            autoCleanupInterval: 24 * 60 * 60 * 1000 // 24 horas
        };
        
        // Inicializar sistema
        this.init();
    }

    /**
     * Inicializar o sistema de lixeira
     */
    init() {
        console.log('Sistema de Lixeira inicializado');
        
        // Verificar se há backup recente
        this.checkBackupStatus();
        
        // Configurar limpeza automática
        this.setupAutoCleanup();
        
        // Registrar métodos globais
        window.dataCleaner = this;
        window.trashSystem = this;
    }

    /**
     * Verificar status do backup
     */
    checkBackupStatus() {
        const lastBackup = localStorage.getItem('lastBackup');
        const now = Date.now();
        
        if (!lastBackup || (now - parseInt(lastBackup)) > this.cleanupRules.autoCleanupInterval) {
            console.log('Criando backup automático...');
            this.createBackup();
        }
    }

    /**
     * Configurar limpeza automática
     */
    setupAutoCleanup() {
        // Limpeza automática a cada 24 horas
        setInterval(() => {
            this.performAutoCleanup();
        }, this.cleanupRules.autoCleanupInterval);
    }

    /**
     * Criar backup dos dados
     */
    createBackup() {
        try {
            const backupData = {
                timestamp: Date.now(),
                agendamentos: JSON.parse(localStorage.getItem('agendamentos') || '[]'),
                notifications: JSON.parse(localStorage.getItem('notifications') || '[]'),
                settings: {
                    theme: localStorage.getItem('theme') || 'light',
                    soundEnabled: localStorage.getItem('soundEnabled') || 'true',
                    volume: localStorage.getItem('volume') || '0.5'
                }
            };

            // Salvar backup
            localStorage.setItem('backupData', JSON.stringify(backupData));
            localStorage.setItem('lastBackup', Date.now().toString());

            // Manter apenas os últimos 5 backups
            this.cleanOldBackups();

            console.log('Backup criado com sucesso');
            return true;
        } catch (error) {
            console.error('Erro ao criar backup:', error);
            return false;
        }
    }

    /**
     * Limpar backups antigos
     */
    cleanOldBackups() {
        const backups = [];
        
        // Coletar todos os backups
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('backup_')) {
                try {
                    const backup = JSON.parse(localStorage.getItem(key));
                    backups.push({ key, timestamp: backup.timestamp });
                } catch (e) {
                    // Backup corrompido, remover
                    localStorage.removeItem(key);
                }
            }
        }

        // Ordenar por timestamp e manter apenas os mais recentes
        backups.sort((a, b) => b.timestamp - a.timestamp);
        
        for (let i = this.maxBackups; i < backups.length; i++) {
            localStorage.removeItem(backups[i].key);
        }
    }

    /**
     * Restaurar dados do backup
     */
    restoreFromBackup() {
        try {
            const backupData = localStorage.getItem('backupData');
            if (!backupData) {
                throw new Error('Nenhum backup encontrado');
            }

            const backup = JSON.parse(backupData);
            
            // Restaurar dados
            localStorage.setItem('agendamentos', JSON.stringify(backup.agendamentos));
            localStorage.setItem('notifications', JSON.stringify(backup.notifications));
            
            // Restaurar configurações
            Object.entries(backup.settings).forEach(([key, value]) => {
                localStorage.setItem(key, value);
            });

            console.log('✅ Dados restaurados do backup');
            
            // Atualizar interface
            if (window.loadAgendamentos) {
                window.loadAgendamentos();
            }

            return { success: true, message: 'Dados restaurados com sucesso' };
        } catch (error) {
            console.error('❌ Erro ao restaurar backup:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Limpeza principal da lixeira com confirmação
     */
    async clearAllData() {
        if (this.isProcessing) {
            return { success: false, error: 'Operação já em andamento' };
        }

        this.isProcessing = true;

        try {
            // Criar backup antes da limpeza
            if (this.backupEnabled) {
                this.createBackup();
            }

            // Obter contagem antes da limpeza
            const agendamentos = JSON.parse(localStorage.getItem('agendamentos') || '[]');
            const deletedCount = agendamentos.length;

            // Confirmar ação se necessário
            if (this.confirmationRequired && deletedCount > 0) {
                const confirmed = await this.showConfirmationDialog(deletedCount);
                if (!confirmed) {
                    this.isProcessing = false;
                    return { success: false, error: 'Operação cancelada pelo usuário' };
                }
            }

            // Executar limpeza
            const result = await this.executeCleanup();
            
            if (result.success) {
                // Mostrar notificação de sucesso
                this.showSuccessNotification(deletedCount);
                
                // Atualizar interface
                await this.updateInterface();
                
                return { 
                    success: true, 
                    deletedCount, 
                    message: `${deletedCount} agendamentos deletados permanentemente` 
                };
            } else {
                throw new Error(result.error);
            }

        } catch (error) {
            console.error('❌ Erro na lixeira:', error);
            this.showErrorNotification(error.message);
            return { success: false, error: error.message };
        } finally {
            this.isProcessing = false;
        }
    }

    /**
     * Executar limpeza dos dados
     */
    async executeCleanup() {
        try {
            // Limpar dados principais via IPC (electron-store)
            if (window.ipcRenderer) {
                // Limpar agendamentos do electron-store
                await window.ipcRenderer.invoke('clearAllAgendamentos');
                
                // Limpar notificações do electron-store
                await window.ipcRenderer.invoke('clearAllNotifications');
            }

            // Limpar dados do localStorage (cache local e post-its)
            const dataToRemove = [
                'agendamentos',
                'notifications',
                'searchCache',
                'searchHistory',
                'tempData',
                'draftAgendamentos',
                'filterSettings',
                'lastFilter',
                'postits',
                'stickyNotes',
                'userNotes',
                'quickNotes',
                'reminders',
                'tempNotes'
            ];

            // Remover dados do localStorage
            dataToRemove.forEach(key => {
                localStorage.removeItem(key);
                sessionStorage.removeItem(key);
            });

            // Limpar dados da interface
            if (window.agendamentos) {
                window.agendamentos = [];
            }

            // Limpar post-its da interface
            const postitContainers = document.querySelectorAll('.postit-container, .sticky-notes-container, .notes-container');
            postitContainers.forEach(container => {
                if (container) {
                    container.innerHTML = '';
                }
            });

            // Limpar elementos de post-its individuais
            const postitElements = document.querySelectorAll('.postit, .sticky-note, .note-item, .agendamento-card.postit-style');
            postitElements.forEach(element => {
                if (element) {
                    element.remove();
                }
            });

            console.log('✅ Limpeza executada com sucesso - incluindo post-its');
            return { success: true };

        } catch (error) {
            console.error('❌ Erro durante limpeza:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Mostrar diálogo de confirmação
     */
    async showConfirmationDialog(count) {
        return new Promise((resolve) => {
            const message = `Tem certeza que deseja deletar ${count} agendamento${count !== 1 ? 's' : ''} permanentemente?\n\nEsta ação não pode ser desfeita.`;
            
            // Usar nossa versão personalizada do confirm
            if (window.showCustomConfirm) {
                window.showCustomConfirm(
                    'Limpeza de Dados', 
                    message, 
                    () => resolve(true), 
                    () => resolve(false)
                );
            } else {
                // Fallback para confirm padrão se nossa versão não estiver disponível
                const confirmed = confirm(message);
                resolve(confirmed);
            }
        });
    }

    /**
     * Mostrar notificação de sucesso
     */
    showSuccessNotification(count) {
        if (window.showToast) {
            window.showToast(
                `Lixeira: ${count} agendamento${count !== 1 ? 's' : ''} deletado${count !== 1 ? 's' : ''} permanentemente`, 
                'success'
            );
        }
    }

    /**
     * Mostrar notificação de erro
     */
    showErrorNotification(message) {
        if (window.showToast) {
            window.showToast(`Erro na lixeira: ${message}`, 'error');
        }
    }

    /**
     * Atualizar interface após limpeza
     */
    async updateInterface() {
        try {
            // Recarregar agendamentos
            if (window.loadAgendamentos) {
                await window.loadAgendamentos();
            }

            // Interface limpa - sem campos de busca

            // Resetar filtros
            if (window.clearAdvancedFilters) {
                window.clearAdvancedFilters();
            }

            // Atualizar estatísticas
            if (typeof updateDataStats === 'function') {
                updateDataStats();
            }

            console.log('✅ Interface atualizada');
        } catch (error) {
            console.error('❌ Erro ao atualizar interface:', error);
        }
    }

    /**
     * Limpeza automática (sem confirmação)
     */
    async performAutoCleanup() {
        try {
            console.log('🔄 Executando limpeza automática...');
            
            // Criar backup
            this.createBackup();
            
            // Limpar dados antigos
            const result = await this.executeCleanup();
            
            if (result.success) {
                console.log('✅ Limpeza automática concluída');
                
                // Notificação discreta
                if (window.showToast) {
                    window.showToast('Limpeza automática executada', 'info');
                }
            }
        } catch (error) {
            console.error('❌ Erro na limpeza automática:', error);
        }
    }

    /**
     * Obter estatísticas dos dados
     */
    getDataStats() {
        try {
            const agendamentos = JSON.parse(localStorage.getItem('agendamentos') || '[]');
            const notifications = JSON.parse(localStorage.getItem('notifications') || '[]');
            
            const now = new Date();
            const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
            
            return {
                totalAgendamentos: agendamentos.length,
                totalNotifications: notifications.length,
                agendamentosAntigos: agendamentos.filter(a => new Date(a.data) < thirtyDaysAgo).length,
                agendamentosConcluidos: agendamentos.filter(a => a.status === 'Concluído').length,
                agendamentosCancelados: agendamentos.filter(a => a.status === 'Cancelado').length,
                storageSize: this.getStorageSize(),
                lastBackup: localStorage.getItem('lastBackup') || null
            };
        } catch (error) {
            console.error('❌ Erro ao obter estatísticas:', error);
            return null;
        }
    }

    /**
     * Obter tamanho do storage
     */
    getStorageSize() {
        try {
            let totalSize = 0;
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                const value = localStorage.getItem(key);
                totalSize += (key.length + value.length) * 2; // UTF-16
            }
            return totalSize;
        } catch (error) {
            return 0;
        }
    }

    /**
     * Verificar se há dados para limpar
     */
    hasDataToClean() {
        try {
            const agendamentos = JSON.parse(localStorage.getItem('agendamentos') || '[]');
            return agendamentos.length > 0;
        } catch (error) {
            return false;
        }
    }

    /**
     * Limpeza rápida (sem backup)
     */
    async quickClear() {
        if (this.isProcessing) {
            return { success: false, error: 'Operação já em andamento' };
        }

        this.isProcessing = true;

        try {
            const result = await this.executeCleanup();
            
            if (result.success) {
                await this.updateInterface();
                return { success: true, message: 'Limpeza rápida executada' };
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('❌ Erro na limpeza rápida:', error);
            return { success: false, error: error.message };
        } finally {
            this.isProcessing = false;
        }
    }

    /**
     * Limpeza sem confirmação (função principal da lixeira)
     */
    async clearAllDataNoConfirm() {
        if (this.isProcessing) {
            return { success: false, error: 'Operação já em andamento' };
        }

        this.isProcessing = true;

        try {
            // Criar backup antes da limpeza
            if (this.backupEnabled) {
                this.createBackup();
            }

            // Obter contagem antes da limpeza
            const agendamentos = JSON.parse(localStorage.getItem('agendamentos') || '[]');
            const deletedCount = agendamentos.length;

            // Executar limpeza sem confirmação
            const result = await this.executeCleanup();
            
            if (result.success) {
                // Mostrar notificação de sucesso
                this.showSuccessNotification(deletedCount);
                
                // Atualizar interface
                await this.updateInterface();
                
                return { 
                    success: true, 
                    deletedCount, 
                    message: `${deletedCount} agendamentos deletados permanentemente` 
                };
            } else {
                throw new Error(result.error);
            }

        } catch (error) {
            console.error('❌ Erro na lixeira:', error);
            this.showErrorNotification(error.message);
            return { success: false, error: error.message };
        } finally {
            this.isProcessing = false;
        }
    }

    /**
     * Configurar opções da lixeira
     */
    configure(options) {
        if (options.backupEnabled !== undefined) {
            this.backupEnabled = options.backupEnabled;
        }
        
        if (options.confirmationRequired !== undefined) {
            this.confirmationRequired = options.confirmationRequired;
        }
        
        if (options.maxBackups !== undefined) {
            this.maxBackups = options.maxBackups;
        }
        
        console.log('⚙️ Configurações da lixeira atualizadas');
    }
}

// Instância global do sistema de lixeira
const dataCleaner = new DataCleaner();

// Exportar para uso global
window.dataCleaner = dataCleaner;
window.trashSystem = dataCleaner;

console.log('🗑️ Sistema de Lixeira Moderno carregado');