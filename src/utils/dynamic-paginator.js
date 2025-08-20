/**
 * Sistema de Paginação Dinâmica
 * Ajusta automaticamente o tamanho das páginas baseado na performance da máquina
 * Funciona de forma transparente sem alterar a interface visual
 */

class DynamicPaginator {
    constructor() {
        this.defaultPageSize = 50;
        this.slowMachinePageSize = 20;
        this.fastMachinePageSize = 100;
        this.currentPageSize = this.defaultPageSize;
        this.loadedPages = new Map();
        this.totalItems = 0;
        this.currentPage = 1;
        this.isLoading = false;
        this.loadingCallbacks = [];
        
        this.init();
    }

    init() {
        // Aguarda o detector de performance estar pronto
        const checkDetector = () => {
            if (window.performanceDetector) {
                this.configurePagination();
            } else {
                setTimeout(checkDetector, 100);
            }
        };
        checkDetector();
    }

    configurePagination() {
        if (window.performanceDetector?.shouldUsePagination()) {
            this.currentPageSize = window.performanceDetector.getPageSize();
            console.log(`Paginação dinâmica ativada com ${this.currentPageSize} itens por página`);
        } else {
            this.currentPageSize = this.fastMachinePageSize;
        }
    }

    // Método principal para paginar dados
    paginate(data, options = {}) {
        const {
            page = 1,
            pageSize = null,
            sortBy = null,
            sortOrder = 'asc',
            filters = {}
        } = options;

        const actualPageSize = pageSize || this.getOptimalPageSize();
        
        // Aplica filtros se fornecidos
        let filteredData = this.applyFilters(data, filters);
        
        // Aplica ordenação se fornecida
        if (sortBy) {
            filteredData = this.applySorting(filteredData, sortBy, sortOrder);
        }

        this.totalItems = filteredData.length;
        const totalPages = Math.ceil(this.totalItems / actualPageSize);
        const startIndex = (page - 1) * actualPageSize;
        const endIndex = Math.min(startIndex + actualPageSize, this.totalItems);
        
        const pageData = filteredData.slice(startIndex, endIndex);
        
        return {
            data: pageData,
            pagination: {
                currentPage: page,
                pageSize: actualPageSize,
                totalItems: this.totalItems,
                totalPages: totalPages,
                hasNextPage: page < totalPages,
                hasPreviousPage: page > 1,
                startIndex: startIndex + 1,
                endIndex: endIndex
            }
        };
    }

    // Paginação específica para agendamentos
    paginateAppointments(appointments, options = {}) {
        const {
            page = 1,
            searchTerm = '',
            dateFilter = null,
            statusFilter = null
        } = options;

        const filters = {};
        
        if (searchTerm) {
            filters.search = (item) => {
                const searchText = `${item.title || item.nome || ''} ${item.description || item.descricao || ''}`.toLowerCase();
                return searchText.includes(searchTerm.toLowerCase());
            };
        }
        
        if (dateFilter) {
            filters.date = (item) => {
                const itemDate = new Date(item.date || item.data);
                return this.matchesDateFilter(itemDate, dateFilter);
            };
        }
        
        if (statusFilter) {
            filters.status = (item) => item.status === statusFilter;
        }

        return this.paginate(appointments, {
            page,
            filters,
            sortBy: 'date',
            sortOrder: 'desc'
        });
    }

    // Carregamento incremental (infinite scroll)
    setupInfiniteScroll(container, dataLoader, options = {}) {
        const {
            threshold = 100,
            initialLoad = true,
            onLoad = null,
            onError = null
        } = options;

        if (!window.performanceDetector?.shouldUsePagination()) {
            // Em máquinas rápidas, carrega tudo de uma vez
            if (initialLoad) {
                this.loadAllData(dataLoader, onLoad, onError);
            }
            return;
        }

        let isLoading = false;
        let hasMoreData = true;
        let currentPage = 1;

        const loadNextPage = async () => {
            if (isLoading || !hasMoreData) return;
            
            isLoading = true;
            
            try {
                const result = await dataLoader({
                    page: currentPage,
                    pageSize: this.currentPageSize
                });
                
                if (result.data && result.data.length > 0) {
                    this.appendToContainer(container, result.data);
                    currentPage++;
                    hasMoreData = result.pagination.hasNextPage;
                    
                    if (onLoad) {
                        onLoad(result);
                    }
                } else {
                    hasMoreData = false;
                }
            } catch (error) {
                console.error('Erro ao carregar página:', error);
                if (onError) {
                    onError(error);
                }
            } finally {
                isLoading = false;
            }
        };

        // Configura scroll listener otimizado
        const scrollHandler = window.adaptiveThrottler?.throttleScroll(() => {
            const scrollTop = container.scrollTop;
            const scrollHeight = container.scrollHeight;
            const clientHeight = container.clientHeight;
            
            if (scrollTop + clientHeight >= scrollHeight - threshold) {
                loadNextPage();
            }
        }) || (() => {});

        container.addEventListener('scroll', scrollHandler);
        
        // Carregamento inicial
        if (initialLoad) {
            loadNextPage();
        }

        // Retorna função para limpar listeners
        return () => {
            container.removeEventListener('scroll', scrollHandler);
        };
    }

    // Carrega todos os dados de uma vez (para máquinas rápidas)
    async loadAllData(dataLoader, onLoad, onError) {
        try {
            const result = await dataLoader({ page: 1, pageSize: -1 }); // -1 = todos
            if (onLoad) {
                onLoad(result);
            }
        } catch (error) {
            console.error('Erro ao carregar todos os dados:', error);
            if (onError) {
                onError(error);
            }
        }
    }

    // Adiciona dados ao container
    appendToContainer(container, data) {
        const fragment = document.createDocumentFragment();
        
        data.forEach(item => {
            const element = this.createItemElement(item);
            fragment.appendChild(element);
        });
        
        container.appendChild(fragment);
    }

    // Cria elemento para um item (deve ser customizado conforme necessário)
    createItemElement(item) {
        const element = document.createElement('div');
        element.className = 'paginated-item';
        element.dataset.itemId = item.id;
        
        // Estrutura básica - deve ser adaptada para cada tipo de item
        element.innerHTML = `
            <div class="item-content">
                <div class="item-title">${item.title || item.nome || ''}</div>
                <div class="item-description">${item.description || item.descricao || ''}</div>
            </div>
        `;
        
        return element;
    }

    // Aplica filtros aos dados
    applyFilters(data, filters) {
        if (!filters || Object.keys(filters).length === 0) {
            return data;
        }

        return data.filter(item => {
            return Object.values(filters).every(filterFn => {
                if (typeof filterFn === 'function') {
                    return filterFn(item);
                }
                return true;
            });
        });
    }

    // Aplica ordenação aos dados
    applySorting(data, sortBy, sortOrder = 'asc') {
        return data.sort((a, b) => {
            let valueA = this.getNestedValue(a, sortBy);
            let valueB = this.getNestedValue(b, sortBy);
            
            // Converte para string se necessário
            if (typeof valueA === 'string') valueA = valueA.toLowerCase();
            if (typeof valueB === 'string') valueB = valueB.toLowerCase();
            
            let comparison = 0;
            if (valueA > valueB) {
                comparison = 1;
            } else if (valueA < valueB) {
                comparison = -1;
            }
            
            return sortOrder === 'desc' ? comparison * -1 : comparison;
        });
    }

    // Obtém valor aninhado de um objeto
    getNestedValue(obj, path) {
        return path.split('.').reduce((current, key) => {
            return current && current[key] !== undefined ? current[key] : '';
        }, obj);
    }

    // Verifica se uma data corresponde ao filtro
    matchesDateFilter(itemDate, dateFilter) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const itemDateOnly = new Date(itemDate);
        itemDateOnly.setHours(0, 0, 0, 0);
        
        switch (dateFilter) {
            case 'today':
                return itemDateOnly.getTime() === today.getTime();
            case 'tomorrow':
                const tomorrow = new Date(today);
                tomorrow.setDate(tomorrow.getDate() + 1);
                return itemDateOnly.getTime() === tomorrow.getTime();
            case 'week':
                const weekFromNow = new Date(today);
                weekFromNow.setDate(weekFromNow.getDate() + 7);
                return itemDateOnly >= today && itemDateOnly <= weekFromNow;
            case 'month':
                const monthFromNow = new Date(today);
                monthFromNow.setMonth(monthFromNow.getMonth() + 1);
                return itemDateOnly >= today && itemDateOnly <= monthFromNow;
            default:
                return true;
        }
    }

    getOptimalPageSize() {
        if (!window.performanceDetector) {
            return this.defaultPageSize;
        }

        if (window.performanceDetector.shouldUsePagination()) {
            return window.performanceDetector.getPageSize();
        }

        return this.fastMachinePageSize;
    }

    // Busca paginada com cache
    async searchWithPagination(searchTerm, searchFunction, options = {}) {
        const {
            page = 1,
            useCache = true
        } = options;

        const cacheKey = `search_${searchTerm}_${page}`;
        
        // Verifica cache se habilitado
        if (useCache && window.smartCache) {
            const cachedResult = window.smartCache.getCachedSearchResults(cacheKey);
            if (cachedResult) {
                return cachedResult;
            }
        }

        try {
            const result = await searchFunction({
                searchTerm,
                page,
                pageSize: this.getOptimalPageSize()
            });

            // Armazena no cache se habilitado
            if (useCache && window.smartCache) {
                window.smartCache.cacheSearchResults(cacheKey, result);
            }

            return result;
        } catch (error) {
            console.error('Erro na busca paginada:', error);
            throw error;
        }
    }

    // Navegação de páginas
    goToPage(page, dataLoader, container, options = {}) {
        if (page < 1 || this.isLoading) return;
        
        this.currentPage = page;
        this.loadPage(page, dataLoader, container, options);
    }

    nextPage(dataLoader, container, options = {}) {
        this.goToPage(this.currentPage + 1, dataLoader, container, options);
    }

    previousPage(dataLoader, container, options = {}) {
        this.goToPage(this.currentPage - 1, dataLoader, container, options);
    }

    async loadPage(page, dataLoader, container, options = {}) {
        if (this.isLoading) return;
        
        this.isLoading = true;
        
        try {
            const result = await dataLoader({
                page,
                pageSize: this.getOptimalPageSize(),
                ...options
            });
            
            // Limpa container e adiciona novos dados
            container.innerHTML = '';
            this.appendToContainer(container, result.data);
            
            // Executa callbacks de carregamento
            this.loadingCallbacks.forEach(callback => {
                try {
                    callback(result);
                } catch (error) {
                    console.warn('Erro em callback de carregamento:', error);
                }
            });
            
        } catch (error) {
            console.error('Erro ao carregar página:', error);
        } finally {
            this.isLoading = false;
        }
    }

    // Adiciona callback para quando uma página é carregada
    onPageLoad(callback) {
        this.loadingCallbacks.push(callback);
        
        // Retorna função para remover callback
        return () => {
            const index = this.loadingCallbacks.indexOf(callback);
            if (index > -1) {
                this.loadingCallbacks.splice(index, 1);
            }
        };
    }

    // Estatísticas da paginação
    getStats() {
        return {
            currentPageSize: this.currentPageSize,
            totalItems: this.totalItems,
            currentPage: this.currentPage,
            totalPages: Math.ceil(this.totalItems / this.currentPageSize),
            isOptimized: window.performanceDetector?.shouldUsePagination() || false,
            loadedPages: this.loadedPages.size
        };
    }

    // Limpa cache de páginas
    clearCache() {
        this.loadedPages.clear();
        if (window.smartCache) {
            window.smartCache.invalidateRelated('search_');
        }
    }

    // Limpa recursos
    destroy() {
        this.clearCache();
        this.loadingCallbacks = [];
        this.isLoading = false;
    }
}

// Instância global
window.dynamicPaginator = new DynamicPaginator();

// Exporta para uso em outros módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DynamicPaginator;
}