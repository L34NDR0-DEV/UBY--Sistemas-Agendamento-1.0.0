/**
 * Sistema Principal de Otimização de Performance
 * Integra todos os sistemas de otimização e os ativa automaticamente
 * baseado na detecção de performance da máquina
 */

class PerformanceOptimizer {
    constructor() {
        this.isInitialized = false;
        this.optimizationSystems = {
            detector: null,
            lazyLoader: null,
            debouncer: null,
            cache: null,
            throttler: null,
            paginator: null
        };
        this.originalFunctions = new Map();
        this.isOptimizationActive = false;
        
        this.init();
    }

    async init() {
        try {
            console.log('Inicializando sistema de otimização de performance...');
            
            // Aguarda todos os sistemas estarem carregados
            await this.waitForSystems();
            
            // Configura os sistemas
            this.setupSystems();
            
            // Integra com o sistema existente
            this.integrateWithExistingSystem();
            
            this.isInitialized = true;
            
            console.log('Sistema de otimização inicializado com sucesso');
            
            // Monitora mudanças de performance
            this.startPerformanceMonitoring();
            
        } catch (error) {
            console.error('Erro ao inicializar sistema de otimização:', error);
        }
    }

    async waitForSystems() {
        const maxWaitTime = 10000; // 10 segundos
        const checkInterval = 100;
        let waitTime = 0;

        return new Promise((resolve, reject) => {
            const checkSystems = () => {
                if (waitTime >= maxWaitTime) {
                    reject(new Error('Timeout aguardando sistemas de otimização'));
                    return;
                }

                const systemsReady = [
                    window.performanceDetector,
                    window.lazyLoader,
                    window.adaptiveDebouncer,
                    window.smartCache,
                    window.adaptiveThrottler,
                    window.dynamicPaginator
                ].every(system => system !== undefined);

                if (systemsReady) {
                    resolve();
                } else {
                    waitTime += checkInterval;
                    setTimeout(checkSystems, checkInterval);
                }
            };

            checkSystems();
        });
    }

    setupSystems() {
        this.optimizationSystems = {
            detector: window.performanceDetector,
            lazyLoader: window.lazyLoader,
            debouncer: window.adaptiveDebouncer,
            cache: window.smartCache,
            throttler: window.adaptiveThrottler,
            paginator: window.dynamicPaginator
        };

        // Verifica se otimizações devem ser ativadas
        this.isOptimizationActive = this.optimizationSystems.detector.isSlowMachine;
        
        if (this.isOptimizationActive) {
            console.log('Máquina lenta detectada - ativando todas as otimizações');
        } else {
            console.log('Máquina com boa performance - otimizações em standby');
        }
    }

    integrateWithExistingSystem() {
        // Integra com o sistema de agendamentos existente
        this.optimizeAppointmentSystem();
        
        // Integra com o sistema de busca
        this.optimizeSearchSystem();
        
        // Integra com eventos de scroll e resize
        this.optimizeEventHandlers();
        
        // Integra com formulários
        this.optimizeForms();
    }

    optimizeAppointmentSystem() {
        // Otimiza carregamento de agendamentos
        const originalLoadAgendamentos = window.loadAgendamentos;
        if (originalLoadAgendamentos) {
            this.originalFunctions.set('loadAgendamentos', originalLoadAgendamentos);
            
            window.loadAgendamentos = async (...args) => {
                if (this.isOptimizationActive) {
                    return this.optimizedLoadAgendamentos(...args);
                }
                return originalLoadAgendamentos.apply(this, args);
            };
        }

        // Otimiza renderização de agendamentos
        const originalRenderAgendamentos = window.renderAgendamentos;
        if (originalRenderAgendamentos) {
            this.originalFunctions.set('renderAgendamentos', originalRenderAgendamentos);
            
            window.renderAgendamentos = (...args) => {
                if (this.isOptimizationActive) {
                    return this.optimizedRenderAgendamentos(...args);
                }
                return originalRenderAgendamentos.apply(this, args);
            };
        }
    }

    async optimizedLoadAgendamentos() {
        try {
            // Verifica cache primeiro
            const cachedData = this.optimizationSystems.cache.getCachedAppointments();
            if (cachedData) {
                console.log('Agendamentos carregados do cache');
                return cachedData;
            }

            // Carrega dados com paginação se necessário
            const appointments = await this.loadAppointmentsWithPagination();
            
            // Armazena no cache
            this.optimizationSystems.cache.cacheAppointments(appointments);
            
            return appointments;
        } catch (error) {
            console.error('Erro no carregamento otimizado:', error);
            // Fallback para função original
            const original = this.originalFunctions.get('loadAgendamentos');
            return original ? original() : [];
        }
    }

    async loadAppointmentsWithPagination() {
        // Implementa carregamento paginado baseado na capacidade da máquina
        const pageSize = this.optimizationSystems.paginator.getOptimalPageSize();
        
        // Simula carregamento paginado (adapte conforme sua API)
        const allAppointments = await this.loadAllAppointments();
        
        return this.optimizationSystems.paginator.paginate(allAppointments, {
            page: 1,
            pageSize: pageSize
        });
    }

    async loadAllAppointments() {
        // Chama a função original ou API para carregar agendamentos
        const original = this.originalFunctions.get('loadAgendamentos');
        if (original) {
            return await original();
        }
        
        // Fallback - carrega via IPC se disponível
        if (window.electronAPI && window.electronAPI.getAgendamentos) {
            return await window.electronAPI.getAgendamentos();
        }
        
        return [];
    }

    optimizedRenderAgendamentos(appointments, container) {
        if (!container) {
            container = document.getElementById('agendamentos-list') || 
                       document.querySelector('.appointments-container') ||
                       document.querySelector('#appointments');
        }

        if (!container) {
            console.warn('Container de agendamentos não encontrado');
            return;
        }

        // Usa lazy loading se necessário
        if (this.optimizationSystems.detector.shouldUseLazyLoading()) {
            this.optimizationSystems.lazyLoader.processAppointmentsList(appointments, container);
        } else {
            // Renderização normal
            const original = this.originalFunctions.get('renderAgendamentos');
            if (original) {
                original(appointments, container);
            } else {
                this.fallbackRenderAppointments(appointments, container);
            }
        }
    }

    fallbackRenderAppointments(appointments, container) {
        container.innerHTML = '';
        
        appointments.forEach(appointment => {
            const element = document.createElement('div');
            element.className = 'appointment-item';
            element.innerHTML = `
                <div class="appointment-content">
                    <h3>${appointment.title || appointment.nome || 'Sem título'}</h3>
                    <p>${appointment.description || appointment.descricao || ''}</p>
                    <span class="appointment-date">${appointment.date || appointment.data || ''}</span>
                </div>
            `;
            container.appendChild(element);
        });
    }

    optimizeSearchSystem() {
        // Otimiza função de busca
        const originalSearch = window.searchAppointments || window.buscarAgendamentos;
        if (originalSearch) {
            this.originalFunctions.set('searchAppointments', originalSearch);
            
            const optimizedSearch = this.optimizationSystems.debouncer.debounceSearch(
                async (searchTerm) => {
                    return this.optimizedSearch(searchTerm);
                }
            );
            
            window.searchAppointments = optimizedSearch;
            window.buscarAgendamentos = optimizedSearch;
        }

        // Otimiza inputs de busca
        this.optimizeSearchInputs();
    }

    async optimizedSearch(searchTerm) {
        if (!searchTerm || searchTerm.length < 2) {
            return this.optimizedLoadAgendamentos();
        }

        try {
            // Verifica cache de busca
            const cachedResults = this.optimizationSystems.cache.getCachedSearchResults(searchTerm);
            if (cachedResults) {
                return cachedResults;
            }

            // Executa busca
            const original = this.originalFunctions.get('searchAppointments');
            let results;
            
            if (original) {
                results = await original(searchTerm);
            } else {
                // Fallback - busca local
                const allAppointments = await this.loadAllAppointments();
                results = allAppointments.filter(appointment => {
                    const searchText = `${appointment.title || appointment.nome || ''} ${appointment.description || appointment.descricao || ''}`.toLowerCase();
                    return searchText.includes(searchTerm.toLowerCase());
                });
            }

            // Armazena no cache
            this.optimizationSystems.cache.cacheSearchResults(searchTerm, results);
            
            return results;
        } catch (error) {
            console.error('Erro na busca otimizada:', error);
            return [];
        }
    }

    optimizeSearchInputs() {
        const searchInputs = document.querySelectorAll('input[type="search"], input[placeholder*="busca"], input[placeholder*="search"], .search-input');
        
        searchInputs.forEach(input => {
            this.optimizationSystems.debouncer.attachToInput(input, (event) => {
                const searchTerm = event.target.value;
                if (window.searchAppointments) {
                    window.searchAppointments(searchTerm);
                }
            }, {
                delay: this.optimizationSystems.debouncer.getSearchDelay(),
                immediate: true
            });
        });
    }

    optimizeEventHandlers() {
        // Otimiza eventos de scroll
        const scrollContainers = document.querySelectorAll('.scrollable, .appointments-list, .scroll-container');
        scrollContainers.forEach(container => {
            this.optimizationSystems.throttler.attachToElement(container, 'scroll', (event) => {
                this.handleOptimizedScroll(event, container);
            });
        });

        // Otimiza eventos de resize
        this.optimizationSystems.throttler.attachToElement(window, 'resize', () => {
            this.handleOptimizedResize();
        });
    }

    handleOptimizedScroll(event, container) {
        // Implementa lazy loading durante scroll se necessário
        if (this.optimizationSystems.detector.shouldUseLazyLoading()) {
            // Lógica de lazy loading já está no LazyLoader
        }
        
        // Outras otimizações de scroll podem ser adicionadas aqui
    }

    handleOptimizedResize() {
        // Recalcula layouts se necessário
        if (this.isOptimizationActive) {
            // Implementa otimizações de resize
            this.recalculateLayouts();
        }
    }

    recalculateLayouts() {
        // Recalcula layouts de forma otimizada
        const containers = document.querySelectorAll('.appointment-item, .paginated-item');
        
        // Usa RAF otimizado
        const optimizedRAF = this.optimizationSystems.throttler.createOptimizedRAF();
        
        optimizedRAF(() => {
            containers.forEach(container => {
                // Força recálculo de layout se necessário
                container.style.height = 'auto';
            });
        });
    }

    optimizeForms() {
        const forms = document.querySelectorAll('form');
        
        forms.forEach(form => {
            this.optimizationSystems.debouncer.attachToForm(form, (event) => {
                this.handleFormValidation(event, form);
            }, {
                validateOnChange: true,
                validateOnBlur: true
            });
        });
    }

    handleFormValidation(event, form) {
        // Implementa validação otimizada
        if (this.isOptimizationActive) {
            // Validação mais conservadora para máquinas lentas
            this.validateFormConservatively(form);
        } else {
            // Validação normal
            this.validateFormNormally(form);
        }
    }

    validateFormConservatively(form) {
        // Validação básica apenas
        const requiredFields = form.querySelectorAll('[required]');
        requiredFields.forEach(field => {
            if (!field.value.trim()) {
                field.classList.add('error');
            } else {
                field.classList.remove('error');
            }
        });
    }

    validateFormNormally(form) {
        // Validação completa
        const inputs = form.querySelectorAll('input, textarea, select');
        inputs.forEach(input => {
            if (input.checkValidity) {
                if (!input.checkValidity()) {
                    input.classList.add('error');
                } else {
                    input.classList.remove('error');
                }
            }
        });
    }

    startPerformanceMonitoring() {
        // Monitora performance continuamente
        setInterval(() => {
            this.checkPerformanceChanges();
        }, 30000); // A cada 30 segundos
    }

    checkPerformanceChanges() {
        const currentOptimizationState = this.optimizationSystems.detector.isSlowMachine;
        
        if (currentOptimizationState !== this.isOptimizationActive) {
            console.log(`Mudança de performance detectada: ${currentOptimizationState ? 'ativando' : 'desativando'} otimizações`);
            this.isOptimizationActive = currentOptimizationState;
            
            // Reaplica otimizações se necessário
            this.reapplyOptimizations();
        }
    }

    reapplyOptimizations() {
        // Reaplica todas as otimizações baseado no novo estado
        if (this.isOptimizationActive) {
            console.log('Reaplicando otimizações...');
            this.integrateWithExistingSystem();
        }
    }

    // Métodos públicos para controle manual
    enableOptimizations() {
        this.isOptimizationActive = true;
        this.reapplyOptimizations();
    }

    disableOptimizations() {
        this.isOptimizationActive = false;
        this.restoreOriginalFunctions();
    }

    restoreOriginalFunctions() {
        this.originalFunctions.forEach((originalFunc, functionName) => {
            window[functionName] = originalFunc;
        });
    }

    // Estatísticas gerais
    getOptimizationStats() {
        return {
            isInitialized: this.isInitialized,
            isOptimizationActive: this.isOptimizationActive,
            detector: this.optimizationSystems.detector?.getPerformanceInfo(),
            cache: this.optimizationSystems.cache?.getStats(),
            debouncer: this.optimizationSystems.debouncer?.getStats(),
            throttler: this.optimizationSystems.throttler?.getStats(),
            paginator: this.optimizationSystems.paginator?.getStats()
        };
    }

    // Método para debug
    logOptimizationStatus() {
        console.table(this.getOptimizationStats());
    }

    // Limpa todos os recursos
    destroy() {
        this.restoreOriginalFunctions();
        
        Object.values(this.optimizationSystems).forEach(system => {
            if (system && system.destroy) {
                system.destroy();
            }
        });
        
        this.isInitialized = false;
    }
}

// Inicializa automaticamente quando o DOM estiver pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.performanceOptimizer = new PerformanceOptimizer();
    });
} else {
    window.performanceOptimizer = new PerformanceOptimizer();
}

// Exporta para uso em outros módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PerformanceOptimizer;
}