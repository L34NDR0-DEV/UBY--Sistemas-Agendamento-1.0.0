/**
 * Carregador de Sistemas de Otimização
 * Carrega todos os sistemas de otimização na ordem correta
 * e garante que estejam disponíveis antes da inicialização principal
 */

class OptimizationLoader {
    constructor() {
        this.loadedSystems = new Set();
        this.loadingPromises = new Map();
        this.isLoading = false;
        this.isLoaded = false;
        
        // Lista de sistemas na ordem de carregamento
        this.systemsToLoad = [
            {
                name: 'performanceDetector',
                path: './performance-detector.js',
                className: 'PerformanceDetector'
            },
            {
                name: 'smartCache',
                path: './smart-cache.js',
                className: 'SmartCache'
            },
            {
                name: 'adaptiveDebouncer',
                path: './adaptive-debouncer.js',
                className: 'AdaptiveDebouncer'
            },
            {
                name: 'adaptiveThrottler',
                path: './adaptive-throttler.js',
                className: 'AdaptiveThrottler'
            },
            {
                name: 'dynamicPaginator',
                path: './dynamic-paginator.js',
                className: 'DynamicPaginator'
            },
            {
                name: 'lazyLoader',
                path: './lazy-loader.js',
                className: 'LazyLoader'
            },
            {
                name: 'performanceOptimizer',
                path: './performance-optimizer.js',
                className: 'PerformanceOptimizer'
            }
        ];
    }

    async loadAllSystems() {
        if (this.isLoading || this.isLoaded) {
            return this.waitForLoad();
        }

        this.isLoading = true;
        console.log('Iniciando carregamento dos sistemas de otimização...');

        try {
            // Carrega sistemas em ordem
            for (const system of this.systemsToLoad) {
                await this.loadSystem(system);
            }

            this.isLoaded = true;
            this.isLoading = false;
            
            console.log('Todos os sistemas de otimização foram carregados com sucesso');
            
            // Dispara evento personalizado
            this.dispatchLoadedEvent();
            
            return true;
        } catch (error) {
            this.isLoading = false;
            console.error('Erro ao carregar sistemas de otimização:', error);
            throw error;
        }
    }

    async loadSystem(systemConfig) {
        const { name, path, className } = systemConfig;
        
        if (this.loadedSystems.has(name)) {
            return window[name];
        }

        if (this.loadingPromises.has(name)) {
            return this.loadingPromises.get(name);
        }

        console.log(`Carregando sistema: ${name}`);

        const loadPromise = this.loadSystemScript(systemConfig);
        this.loadingPromises.set(name, loadPromise);

        try {
            const result = await loadPromise;
            this.loadedSystems.add(name);
            this.loadingPromises.delete(name);
            
            console.log(`Sistema ${name} carregado com sucesso`);
            return result;
        } catch (error) {
            this.loadingPromises.delete(name);
            console.error(`Erro ao carregar sistema ${name}:`, error);
            throw error;
        }
    }

    async loadSystemScript(systemConfig) {
        const { name, path, className } = systemConfig;
        
        return new Promise((resolve, reject) => {
            // Verifica se já existe no window
            if (window[name]) {
                resolve(window[name]);
                return;
            }

            // Cria elemento script
            const script = document.createElement('script');
            script.src = path;
            script.async = true;
            
            script.onload = () => {
                // Aguarda um pouco para garantir que o script foi executado
                setTimeout(() => {
                    if (window[name] || window[className]) {
                        // Se a instância não existe, cria uma
                        if (!window[name] && window[className]) {
                            try {
                                window[name] = new window[className]();
                            } catch (error) {
                                console.warn(`Não foi possível instanciar ${className} automaticamente:`, error);
                                window[name] = window[className];
                            }
                        }
                        
                        resolve(window[name]);
                    } else {
                        reject(new Error(`Sistema ${name} não foi encontrado após carregamento`));
                    }
                }, 100);
            };
            
            script.onerror = () => {
                reject(new Error(`Falha ao carregar script: ${path}`));
            };
            
            // Adiciona ao head
            document.head.appendChild(script);
        });
    }

    async waitForLoad() {
        if (this.isLoaded) {
            return true;
        }

        return new Promise((resolve) => {
            const checkLoaded = () => {
                if (this.isLoaded) {
                    resolve(true);
                } else {
                    setTimeout(checkLoaded, 100);
                }
            };
            checkLoaded();
        });
    }

    dispatchLoadedEvent() {
        const event = new CustomEvent('optimizationSystemsLoaded', {
            detail: {
                loadedSystems: Array.from(this.loadedSystems),
                timestamp: Date.now()
            }
        });
        
        document.dispatchEvent(event);
        window.dispatchEvent(event);
    }

    // Verifica se todos os sistemas estão carregados
    areAllSystemsLoaded() {
        return this.systemsToLoad.every(system => 
            this.loadedSystems.has(system.name) && window[system.name]
        );
    }

    // Obtém status de carregamento
    getLoadingStatus() {
        return {
            isLoading: this.isLoading,
            isLoaded: this.isLoaded,
            loadedSystems: Array.from(this.loadedSystems),
            totalSystems: this.systemsToLoad.length,
            progress: (this.loadedSystems.size / this.systemsToLoad.length) * 100
        };
    }

    // Força recarregamento de um sistema específico
    async reloadSystem(systemName) {
        const systemConfig = this.systemsToLoad.find(s => s.name === systemName);
        if (!systemConfig) {
            throw new Error(`Sistema ${systemName} não encontrado`);
        }

        // Remove do cache
        this.loadedSystems.delete(systemName);
        if (window[systemName] && window[systemName].destroy) {
            window[systemName].destroy();
        }
        delete window[systemName];

        // Recarrega
        return this.loadSystem(systemConfig);
    }

    // Descarrega todos os sistemas
    unloadAllSystems() {
        console.log('Descarregando sistemas de otimização...');
        
        this.systemsToLoad.forEach(system => {
            if (window[system.name]) {
                if (window[system.name].destroy) {
                    window[system.name].destroy();
                }
                delete window[system.name];
            }
        });
        
        this.loadedSystems.clear();
        this.loadingPromises.clear();
        this.isLoaded = false;
        this.isLoading = false;
        
        console.log('Sistemas de otimização descarregados');
    }
}

// Função de conveniência para carregar sistemas
window.loadOptimizationSystems = async function() {
    if (!window.optimizationLoader) {
        window.optimizationLoader = new OptimizationLoader();
    }
    
    return window.optimizationLoader.loadAllSystems();
};

// Função para verificar se sistemas estão carregados
window.areOptimizationSystemsLoaded = function() {
    return window.optimizationLoader ? window.optimizationLoader.areAllSystemsLoaded() : false;
};

// Auto-carregamento se estiver em ambiente Electron
if (typeof window !== 'undefined' && window.electronAPI) {
    // Aguarda DOM estar pronto
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window.loadOptimizationSystems().catch(console.error);
        });
    } else {
        // DOM já está pronto
        setTimeout(() => {
            window.loadOptimizationSystems().catch(console.error);
        }, 100);
    }
}

// Exporta para uso em outros módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = OptimizationLoader;
}