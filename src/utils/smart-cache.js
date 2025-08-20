/**
 * Sistema de Cache Inteligente
 * Otimiza armazenamento e recuperação de dados baseado na performance da máquina
 * Funciona de forma transparente sem alterar a interface
 */

class SmartCache {
    constructor() {
        this.cache = new Map();
        this.accessTimes = new Map();
        this.accessCount = new Map();
        this.maxSize = 100;
        this.ttl = 5 * 60 * 1000; // 5 minutos padrão
        this.cleanupInterval = null;
        this.compressionEnabled = false;
        
        this.init();
    }

    init() {
        // Aguarda o detector de performance estar pronto
        const checkDetector = () => {
            if (window.performanceDetector) {
                this.configureCache();
                this.startCleanup();
            } else {
                setTimeout(checkDetector, 100);
            }
        };
        checkDetector();
    }

    configureCache() {
        if (!window.performanceDetector?.shouldUseCaching()) {
            // Máquina rápida - cache menor e mais agressivo
            this.maxSize = 50;
            this.ttl = 2 * 60 * 1000; // 2 minutos
            this.compressionEnabled = false;
            return;
        }

        // Máquina lenta - cache maior e mais conservador
        this.maxSize = window.performanceDetector.getCacheSize();
        this.ttl = 10 * 60 * 1000; // 10 minutos
        this.compressionEnabled = true;
        
        console.log(`Cache inteligente configurado: tamanho=${this.maxSize}, TTL=${this.ttl}ms, compressão=${this.compressionEnabled}`);
    }

    // Método principal para armazenar dados
    set(key, value, customTTL = null) {
        try {
            const ttl = customTTL || this.ttl;
            const now = Date.now();
            
            // Comprime dados se necessário
            const processedValue = this.compressionEnabled ? this.compress(value) : value;
            
            const cacheEntry = {
                value: processedValue,
                timestamp: now,
                ttl: ttl,
                compressed: this.compressionEnabled,
                size: this.calculateSize(processedValue)
            };

            // Remove entrada antiga se existir
            if (this.cache.has(key)) {
                this.cache.delete(key);
                this.accessTimes.delete(key);
                this.accessCount.delete(key);
            }

            // Verifica se precisa fazer limpeza
            if (this.cache.size >= this.maxSize) {
                this.evictLeastUsed();
            }

            // Adiciona nova entrada
            this.cache.set(key, cacheEntry);
            this.accessTimes.set(key, now);
            this.accessCount.set(key, 0);

            return true;
        } catch (error) {
            console.warn('Erro ao armazenar no cache:', error);
            return false;
        }
    }

    // Método principal para recuperar dados
    get(key) {
        try {
            if (!this.cache.has(key)) {
                return null;
            }

            const entry = this.cache.get(key);
            const now = Date.now();

            // Verifica se expirou
            if (now - entry.timestamp > entry.ttl) {
                this.delete(key);
                return null;
            }

            // Atualiza estatísticas de acesso
            this.accessTimes.set(key, now);
            this.accessCount.set(key, (this.accessCount.get(key) || 0) + 1);

            // Descomprime se necessário
            const value = entry.compressed ? this.decompress(entry.value) : entry.value;
            
            return value;
        } catch (error) {
            console.warn('Erro ao recuperar do cache:', error);
            this.delete(key);
            return null;
        }
    }

    // Verifica se uma chave existe e não expirou
    has(key) {
        if (!this.cache.has(key)) {
            return false;
        }

        const entry = this.cache.get(key);
        const now = Date.now();

        if (now - entry.timestamp > entry.ttl) {
            this.delete(key);
            return false;
        }

        return true;
    }

    // Remove uma entrada específica
    delete(key) {
        this.cache.delete(key);
        this.accessTimes.delete(key);
        this.accessCount.delete(key);
    }

    // Limpa todo o cache
    clear() {
        this.cache.clear();
        this.accessTimes.clear();
        this.accessCount.clear();
    }

    // Cache específico para agendamentos
    cacheAppointments(appointments, filters = {}) {
        const key = this.generateAppointmentKey(filters);
        return this.set(key, appointments, this.ttl * 2); // TTL maior para agendamentos
    }

    getCachedAppointments(filters = {}) {
        const key = this.generateAppointmentKey(filters);
        return this.get(key);
    }

    generateAppointmentKey(filters) {
        const filterString = Object.keys(filters)
            .sort()
            .map(key => `${key}:${filters[key]}`)
            .join('|');
        return `appointments_${filterString}`;
    }

    // Cache específico para resultados de busca
    cacheSearchResults(query, results) {
        const key = `search_${query.toLowerCase().trim()}`;
        return this.set(key, results, this.ttl / 2); // TTL menor para buscas
    }

    getCachedSearchResults(query) {
        const key = `search_${query.toLowerCase().trim()}`;
        return this.get(key);
    }

    // Cache específico para dados de usuário
    cacheUserData(userId, data) {
        const key = `user_${userId}`;
        return this.set(key, data, this.ttl * 3); // TTL maior para dados de usuário
    }

    getCachedUserData(userId) {
        const key = `user_${userId}`;
        return this.get(key);
    }

    // Cache específico para configurações
    cacheSettings(settings) {
        return this.set('app_settings', settings, this.ttl * 5); // TTL muito maior para configurações
    }

    getCachedSettings() {
        return this.get('app_settings');
    }

    // Método para invalidar cache relacionado
    invalidateRelated(pattern) {
        const keysToDelete = [];
        
        for (const key of this.cache.keys()) {
            if (key.includes(pattern)) {
                keysToDelete.push(key);
            }
        }

        keysToDelete.forEach(key => this.delete(key));
        return keysToDelete.length;
    }

    // Remove entradas menos usadas
    evictLeastUsed() {
        if (this.cache.size === 0) return;

        // Calcula score baseado em frequência e recência
        const scores = new Map();
        
        for (const key of this.cache.keys()) {
            const accessCount = this.accessCount.get(key) || 0;
            const lastAccess = this.accessTimes.get(key) || 0;
            const age = Date.now() - lastAccess;
            
            // Score menor = menos importante
            const score = accessCount / (1 + age / 1000); // Normaliza por segundos
            scores.set(key, score);
        }

        // Ordena por score e remove os piores
        const sortedKeys = Array.from(scores.entries())
            .sort((a, b) => a[1] - b[1])
            .map(entry => entry[0]);

        // Remove 25% das entradas menos usadas
        const toRemove = Math.ceil(this.cache.size * 0.25);
        for (let i = 0; i < toRemove && i < sortedKeys.length; i++) {
            this.delete(sortedKeys[i]);
        }
    }

    // Compressão simples para strings
    compress(data) {
        if (typeof data !== 'string') {
            data = JSON.stringify(data);
        }
        
        // Compressão básica removendo espaços desnecessários
        return data.replace(/\s+/g, ' ').trim();
    }

    decompress(data) {
        try {
            return JSON.parse(data);
        } catch {
            return data;
        }
    }

    // Calcula tamanho aproximado dos dados
    calculateSize(data) {
        if (typeof data === 'string') {
            return data.length;
        }
        return JSON.stringify(data).length;
    }

    // Inicia limpeza automática
    startCleanup() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
        }

        // Limpeza a cada 2 minutos
        this.cleanupInterval = setInterval(() => {
            this.cleanup();
        }, 2 * 60 * 1000);
    }

    // Limpeza de entradas expiradas
    cleanup() {
        const now = Date.now();
        const keysToDelete = [];

        for (const [key, entry] of this.cache.entries()) {
            if (now - entry.timestamp > entry.ttl) {
                keysToDelete.push(key);
            }
        }

        keysToDelete.forEach(key => this.delete(key));
        
        if (keysToDelete.length > 0) {
            console.log(`Cache cleanup: removidas ${keysToDelete.length} entradas expiradas`);
        }
    }

    // Estatísticas do cache
    getStats() {
        const totalSize = Array.from(this.cache.values())
            .reduce((sum, entry) => sum + entry.size, 0);

        return {
            size: this.cache.size,
            maxSize: this.maxSize,
            totalDataSize: totalSize,
            compressionEnabled: this.compressionEnabled,
            ttl: this.ttl,
            hitRate: this.calculateHitRate()
        };
    }

    calculateHitRate() {
        const totalAccesses = Array.from(this.accessCount.values())
            .reduce((sum, count) => sum + count, 0);
        
        return totalAccesses > 0 ? (this.cache.size / totalAccesses) * 100 : 0;
    }

    // Método para pré-carregar dados importantes
    preload(dataLoader, keys) {
        if (!window.performanceDetector?.shouldUseCaching()) {
            return; // Não pré-carrega em máquinas rápidas
        }

        keys.forEach(async (key) => {
            if (!this.has(key)) {
                try {
                    const data = await dataLoader(key);
                    this.set(key, data);
                } catch (error) {
                    console.warn(`Erro ao pré-carregar ${key}:`, error);
                }
            }
        });
    }

    // Limpa recursos
    destroy() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
        }
        this.clear();
    }
}

// Instância global
window.smartCache = new SmartCache();

// Exporta para uso em outros módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SmartCache;
}