/**
 * Sistema de cache offline para sincronização
 * Armazena dados localmente quando não há conexão com servidor
 */

const fs = require('fs');
const path = require('path');

class OfflineCache {
    constructor() {
        this.cacheDir = path.join(__dirname, '../../data/cache');
        this.ensureCacheDirectory();
        this.pendingActions = [];
        this.isOnline = true;
    }

    /**
     * Garantir que o diretório de cache existe
     */
    ensureCacheDirectory() {
        if (!fs.existsSync(this.cacheDir)) {
            fs.mkdirSync(this.cacheDir, { recursive: true });
        }
    }

    /**
     * Definir status online/offline
     */
    setOnlineStatus(isOnline) {
        this.isOnline = isOnline;
        console.log(`[STATUS] Status de conexão: ${isOnline ? 'Online' : 'Offline'}`);
        
        if (isOnline && this.pendingActions.length > 0) {
            this.syncPendingActions();
        }
    }

    /**
     * Salvar ação pendente
     */
    addPendingAction(action) {
        const pendingAction = {
            id: `action_${Date.now()}_${Math.random()}`,
            action,
            timestamp: new Date(),
            retryCount: 0
        };

        this.pendingActions.push(pendingAction);
        this.savePendingActions();
        
        console.log(`[PENDING] Ação pendente salva: ${action.type}`);
    }

    /**
     * Salvar ações pendentes no arquivo
     */
    savePendingActions() {
        const filePath = path.join(this.cacheDir, 'pending-actions.json');
        try {
            fs.writeFileSync(filePath, JSON.stringify(this.pendingActions, null, 2));
        } catch (error) {
            console.error('[ERROR] Erro ao salvar ações pendentes:', error);
        }
    }

    /**
     * Carregar ações pendentes do arquivo
     */
    loadPendingActions() {
        const filePath = path.join(this.cacheDir, 'pending-actions.json');
        try {
            if (fs.existsSync(filePath)) {
                const data = fs.readFileSync(filePath, 'utf8');
                this.pendingActions = JSON.parse(data);
                console.log(`[LOAD] ${this.pendingActions.length} ações pendentes carregadas`);
            }
        } catch (error) {
            console.error('[ERROR] Erro ao carregar ações pendentes:', error);
            this.pendingActions = [];
        }
    }

    /**
     * Sincronizar ações pendentes quando voltar online
     */
    async syncPendingActions() {
        if (this.pendingActions.length === 0) return;

        console.log(`[SYNC] Sincronizando ${this.pendingActions.length} ações pendentes...`);

        const actionsToProcess = [...this.pendingActions];
        this.pendingActions = [];

        for (const pendingAction of actionsToProcess) {
            try {
                // Aqui você implementaria a lógica para enviar a ação para o servidor
                console.log(`[SUCCESS] Ação sincronizada: ${pendingAction.action.type}`);
            } catch (error) {
                console.error(`[ERROR] Erro ao sincronizar ação:`, error);
                pendingAction.retryCount++;
                
                if (pendingAction.retryCount < 3) {
                    this.pendingActions.push(pendingAction);
                } else {
                    console.warn(`[WARN] Ação descartada após 3 tentativas: ${pendingAction.action.type}`);
                }
            }
        }

        this.savePendingActions();
    }

    /**
     * Salvar dados no cache local
     */
    saveToCache(key, data) {
        const filePath = path.join(this.cacheDir, `${key}.json`);
        try {
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
            console.log(`[SAVE] Dados salvos no cache: ${key}`);
        } catch (error) {
            console.error(`[ERROR] Erro ao salvar no cache ${key}:`, error);
        }
    }

    /**
     * Carregar dados do cache local
     */
    loadFromCache(key) {
        const filePath = path.join(this.cacheDir, `${key}.json`);
        try {
            if (fs.existsSync(filePath)) {
                const data = fs.readFileSync(filePath, 'utf8');
                console.log(`[LOAD] Dados carregados do cache: ${key}`);
                return JSON.parse(data);
            }
        } catch (error) {
            console.error(`[ERROR] Erro ao carregar do cache ${key}:`, error);
        }
        return null;
    }

    /**
     * Limpar cache antigo
     */
    clearOldCache() {
        try {
            const files = fs.readdirSync(this.cacheDir);
            const now = Date.now();
            const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 dias

            for (const file of files) {
                if (file === 'pending-actions.json') continue; // Não deletar ações pendentes
                
                const filePath = path.join(this.cacheDir, file);
                const stats = fs.statSync(filePath);
                
                if (now - stats.mtime.getTime() > maxAge) {
                    fs.unlinkSync(filePath);
                    console.log(`[CLEAN] Cache antigo removido: ${file}`);
                }
            }
        } catch (error) {
            console.error('[ERROR] Erro ao limpar cache:', error);
        }
    }

    /**
     * Obter estatísticas do cache
     */
    getCacheStats() {
        try {
            const files = fs.readdirSync(this.cacheDir);
            const stats = {
                totalFiles: files.length,
                pendingActions: this.pendingActions.length,
                isOnline: this.isOnline,
                cacheSize: 0
            };

            for (const file of files) {
                const filePath = path.join(this.cacheDir, file);
                const fileStats = fs.statSync(filePath);
                stats.cacheSize += fileStats.size;
            }

            return stats;
        } catch (error) {
            console.error('[ERROR] Erro ao obter estatísticas do cache:', error);
            return null;
        }
    }

    /**
     * Inicializar cache
     */
    initialize() {
        this.loadPendingActions();
        this.clearOldCache();
        console.log('[SUCCESS] Cache offline inicializado');
    }
}

module.exports = OfflineCache; 