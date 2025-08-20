/**
 * Sistema de Detecção de Performance
 * Detecta automaticamente máquinas lentas e ativa otimizações transparentes
 * Não altera a interface visual, apenas o comportamento interno
 */

class PerformanceDetector {
    constructor() {
        this.isSlowMachine = false;
        this.performanceMetrics = {
            cpuScore: 0,
            memoryScore: 0,
            renderScore: 0,
            overallScore: 0
        };
        this.optimizationsEnabled = {
            lazyLoading: false,
            debouncing: false,
            throttling: false,
            caching: false,
            pagination: false
        };
        
        this.init();
    }

    async init() {
        try {
            await this.detectPerformance();
            this.enableOptimizations();
            this.startMonitoring();
        } catch (error) {
            console.warn('Performance detector initialization failed:', error);
            // Em caso de erro, assume máquina lenta para segurança
            this.isSlowMachine = true;
            this.enableAllOptimizations();
        }
    }

    async detectPerformance() {
        const startTime = performance.now();
        
        // Teste de CPU - operações matemáticas intensivas
        const cpuScore = await this.testCPU();
        
        // Teste de memória - disponibilidade e uso
        const memoryScore = await this.testMemory();
        
        // Teste de renderização - tempo de DOM manipulation
        const renderScore = await this.testRender();
        
        const detectionTime = performance.now() - startTime;
        
        this.performanceMetrics = {
            cpuScore,
            memoryScore,
            renderScore,
            detectionTime,
            overallScore: (cpuScore + memoryScore + renderScore) / 3
        };

        // Máquina é considerada lenta se:
        // - Score geral < 50
        // - Tempo de detecção > 1000ms
        // - Memória disponível < 2GB
        this.isSlowMachine = (
            this.performanceMetrics.overallScore < 50 ||
            detectionTime > 1000 ||
            this.performanceMetrics.memoryScore < 30
        );

        console.log('Performance Detection Results:', {
            isSlowMachine: this.isSlowMachine,
            metrics: this.performanceMetrics
        });
    }

    async testCPU() {
        const iterations = 100000;
        const startTime = performance.now();
        
        // Operações matemáticas para testar CPU
        let result = 0;
        for (let i = 0; i < iterations; i++) {
            result += Math.sqrt(i) * Math.sin(i) + Math.cos(i);
        }
        
        const cpuTime = performance.now() - startTime;
        
        // Score baseado no tempo (menor tempo = maior score)
        // Máquinas rápidas: < 10ms = 100 pontos
        // Máquinas lentas: > 100ms = 0 pontos
        return Math.max(0, Math.min(100, 100 - (cpuTime - 10) * 1.1));
    }

    async testMemory() {
        try {
            // Tenta obter informações de memória (se disponível)
            if (navigator.deviceMemory) {
                // deviceMemory em GB
                const memoryGB = navigator.deviceMemory;
                // Score baseado na memória disponível
                return Math.min(100, (memoryGB / 8) * 100); // 8GB = 100 pontos
            }
            
            // Fallback: teste de alocação de memória
            const testArrays = [];
            const startTime = performance.now();
            
            try {
                // Tenta alocar arrays para testar memória
                for (let i = 0; i < 10; i++) {
                    testArrays.push(new Array(100000).fill(Math.random()));
                }
                
                const allocationTime = performance.now() - startTime;
                
                // Limpa os arrays
                testArrays.length = 0;
                
                // Score baseado no tempo de alocação
                return Math.max(0, Math.min(100, 100 - allocationTime * 2));
            } catch (error) {
                // Se falhou na alocação, memória limitada
                return 20;
            }
        } catch (error) {
            return 50; // Score neutro em caso de erro
        }
    }

    async testRender() {
        const startTime = performance.now();
        
        // Cria elementos DOM temporários para testar renderização
        const testContainer = document.createElement('div');
        testContainer.style.position = 'absolute';
        testContainer.style.left = '-9999px';
        testContainer.style.visibility = 'hidden';
        
        document.body.appendChild(testContainer);
        
        try {
            // Adiciona múltiplos elementos
            for (let i = 0; i < 100; i++) {
                const element = document.createElement('div');
                element.innerHTML = `<span>Test ${i}</span><button>Button ${i}</button>`;
                element.className = 'test-element';
                testContainer.appendChild(element);
            }
            
            // Força reflow
            testContainer.offsetHeight;
            
            const renderTime = performance.now() - startTime;
            
            // Score baseado no tempo de renderização
            return Math.max(0, Math.min(100, 100 - renderTime * 5));
        } finally {
            // Remove elementos de teste
            document.body.removeChild(testContainer);
        }
    }

    enableOptimizations() {
        if (this.isSlowMachine) {
            this.optimizationsEnabled = {
                lazyLoading: true,
                debouncing: true,
                throttling: true,
                caching: true,
                pagination: true
            };
            
            console.log('Optimizations enabled for slow machine');
        } else {
            console.log('Machine performance is adequate, optimizations disabled');
        }
    }

    enableAllOptimizations() {
        this.optimizationsEnabled = {
            lazyLoading: true,
            debouncing: true,
            throttling: true,
            caching: true,
            pagination: true
        };
    }

    startMonitoring() {
        // Monitora performance continuamente (a cada 5 minutos)
        setInterval(() => {
            this.monitorCurrentPerformance();
        }, 5 * 60 * 1000);
    }

    async monitorCurrentPerformance() {
        try {
            // Monitora uso de memória atual
            if (performance.memory) {
                const memoryUsage = performance.memory.usedJSHeapSize / performance.memory.totalJSHeapSize;
                
                // Se uso de memória > 80%, ativa otimizações temporariamente
                if (memoryUsage > 0.8 && !this.isSlowMachine) {
                    console.log('High memory usage detected, enabling temporary optimizations');
                    this.enableAllOptimizations();
                    
                    // Desativa após 2 minutos se memória normalizar
                    setTimeout(() => {
                        if (!this.isSlowMachine) {
                            this.enableOptimizations();
                        }
                    }, 2 * 60 * 1000);
                }
            }
        } catch (error) {
            console.warn('Performance monitoring error:', error);
        }
    }

    // Métodos públicos para verificar se otimizações devem ser aplicadas
    shouldUseLazyLoading() {
        return this.optimizationsEnabled.lazyLoading;
    }

    shouldUseDebouncing() {
        return this.optimizationsEnabled.debouncing;
    }

    shouldUseThrottling() {
        return this.optimizationsEnabled.throttling;
    }

    shouldUseCaching() {
        return this.optimizationsEnabled.caching;
    }

    shouldUsePagination() {
        return this.optimizationsEnabled.pagination;
    }

    getDebounceDelay() {
        return this.isSlowMachine ? 500 : 300;
    }

    getThrottleDelay() {
        return this.isSlowMachine ? 200 : 100;
    }

    getPageSize() {
        return this.isSlowMachine ? 20 : 50;
    }

    getCacheSize() {
        return this.isSlowMachine ? 50 : 100;
    }

    // Método para obter informações de performance
    getPerformanceInfo() {
        return {
            isSlowMachine: this.isSlowMachine,
            metrics: this.performanceMetrics,
            optimizations: this.optimizationsEnabled
        };
    }
}

// Instância global
window.performanceDetector = new PerformanceDetector();

// Exporta para uso em outros módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PerformanceDetector;
}