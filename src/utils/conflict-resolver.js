/**
 * Sistema de resolução de conflitos
 * Resolve conflitos quando múltiplas instâncias editam o mesmo item
 */

class ConflictResolver {
    constructor() {
        this.conflictHistory = new Map();
        this.resolutionStrategies = {
            'last-wins': this.lastWinsStrategy,
            'manual': this.manualResolutionStrategy,
            'merge': this.mergeStrategy
        };
    }

    /**
     * Detectar conflito entre duas versões
     */
    detectConflict(original, current, incoming) {
        const conflicts = [];

        // Verificar se houve mudanças no mesmo campo
        for (const key in current) {
            if (original[key] !== current[key] && original[key] !== incoming[key] && current[key] !== incoming[key]) {
                conflicts.push({
                    field: key,
                    original: original[key],
                    current: current[key],
                    incoming: incoming[key]
                });
            }
        }

        return conflicts.length > 0 ? conflicts : null;
    }

    /**
     * Resolver conflito automaticamente
     */
    async resolveConflict(conflicts, strategy = 'last-wins', metadata = {}) {
        const resolver = this.resolutionStrategies[strategy];
        
        if (!resolver) {
            throw new Error(`Estratégia de resolução não encontrada: ${strategy}`);
        }

        const resolution = await resolver(conflicts, metadata);
        
        // Registrar resolução no histórico
        this.logConflictResolution(conflicts, resolution, metadata);
        
        return resolution;
    }

    /**
     * Estratégia: última versão vence
     */
    lastWinsStrategy(conflicts, metadata) {
        const resolution = {
            strategy: 'last-wins',
            resolvedData: {},
            conflicts: conflicts,
            timestamp: new Date(),
            metadata: metadata
        };

        for (const conflict of conflicts) {
            // Usar a versão mais recente baseada no timestamp
            const currentTimestamp = metadata.currentTimestamp || Date.now();
            const incomingTimestamp = metadata.incomingTimestamp || Date.now();
            
            resolution.resolvedData[conflict.field] = 
                incomingTimestamp > currentTimestamp ? conflict.incoming : conflict.current;
        }

        return resolution;
    }

    /**
     * Estratégia: resolução manual
     */
    manualResolutionStrategy(conflicts, metadata) {
        return {
            strategy: 'manual',
            requiresUserInput: true,
            conflicts: conflicts,
            timestamp: new Date(),
            metadata: metadata,
            message: 'Conflito detectado. Resolução manual necessária.'
        };
    }

    /**
     * Estratégia: mesclar dados
     */
    mergeStrategy(conflicts, metadata) {
        const resolution = {
            strategy: 'merge',
            resolvedData: {},
            conflicts: conflicts,
            timestamp: new Date(),
            metadata: metadata
        };

        for (const conflict of conflicts) {
            // Lógica de mesclagem específica por tipo de campo
            switch (conflict.field) {
                case 'description':
                    // Mesclar descrições
                    resolution.resolvedData[conflict.field] = 
                        `${conflict.current}\n\n---\n\n${conflict.incoming}`;
                    break;
                    
                case 'title':
                    // Usar a versão mais longa (assumindo que é mais detalhada)
                    resolution.resolvedData[conflict.field] = 
                        conflict.current.length > conflict.incoming.length ? 
                        conflict.current : conflict.incoming;
                    break;
                    
                case 'startDate':
                case 'endDate':
                    // Usar a data mais recente
                    const currentDate = new Date(conflict.current);
                    const incomingDate = new Date(conflict.incoming);
                    resolution.resolvedData[conflict.field] = 
                        currentDate > incomingDate ? conflict.current : conflict.incoming;
                    break;
                    
                default:
                    // Para outros campos, usar a versão mais recente
                    resolution.resolvedData[conflict.field] = conflict.incoming;
            }
        }

        return resolution;
    }

    /**
     * Registrar resolução de conflito
     */
    logConflictResolution(conflicts, resolution, metadata) {
        const logEntry = {
            id: `conflict_${Date.now()}_${Math.random()}`,
            conflicts: conflicts,
            resolution: resolution,
            metadata: metadata,
            timestamp: new Date()
        };

        this.conflictHistory.set(logEntry.id, logEntry);
        
        // Manter apenas os últimos 100 conflitos
        if (this.conflictHistory.size > 100) {
            const keys = Array.from(this.conflictHistory.keys());
            this.conflictHistory.delete(keys[0]);
        }

        console.log(`[RESOLVE] Conflito resolvido usando estratégia: ${resolution.strategy}`);
    }

    /**
     * Obter estatísticas de conflitos
     */
    getConflictStats() {
        const stats = {
            totalConflicts: this.conflictHistory.size,
            strategies: {},
            recentConflicts: []
        };

        for (const [id, entry] of this.conflictHistory) {
            const strategy = entry.resolution.strategy;
            stats.strategies[strategy] = (stats.strategies[strategy] || 0) + 1;
            
            // Últimos 10 conflitos
            if (stats.recentConflicts.length < 10) {
                stats.recentConflicts.push({
                    id: id,
                    strategy: strategy,
                    timestamp: entry.timestamp,
                    conflictCount: entry.conflicts.length
                });
            }
        }

        return stats;
    }

    /**
     * Aplicar resolução a um objeto
     */
    applyResolution(originalObject, resolution) {
        const result = { ...originalObject };
        
        for (const [field, value] of Object.entries(resolution.resolvedData)) {
            result[field] = value;
        }
        
        // Adicionar metadados de resolução
        result._conflictResolution = {
            strategy: resolution.strategy,
            timestamp: resolution.timestamp,
            resolvedFields: Object.keys(resolution.resolvedData)
        };
        
        return result;
    }

    /**
     * Verificar se um objeto foi resolvido
     */
    hasConflictResolution(obj) {
        return obj && obj._conflictResolution;
    }

    /**
     * Limpar metadados de resolução
     */
    cleanResolutionMetadata(obj) {
        const cleaned = { ...obj };
        delete cleaned._conflictResolution;
        return cleaned;
    }

    /**
     * Sugerir estratégia baseada no tipo de conflito
     */
    suggestStrategy(conflicts, metadata) {
        const fieldTypes = conflicts.map(c => c.field);
        
        // Se há conflitos em campos de texto longo, sugerir merge
        if (fieldTypes.some(f => ['description', 'notes'].includes(f))) {
            return 'merge';
        }
        
        // Se há conflitos em datas, usar last-wins
        if (fieldTypes.some(f => ['startDate', 'endDate', 'createdAt', 'updatedAt'].includes(f))) {
            return 'last-wins';
        }
        
        // Para outros casos, usar last-wins como padrão
        return 'last-wins';
    }
}

module.exports = ConflictResolver; 