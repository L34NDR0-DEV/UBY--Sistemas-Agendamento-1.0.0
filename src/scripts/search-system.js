/**
 * Sistema de Busca para Agendamentos
 * Permite buscar por nome de cliente e nome de atendente
 */

class SearchSystem {
    constructor() {
        this.searchInput = null;
        this.clearButton = null;
        this.currentSearchTerm = '';
        this.searchDebounceTimer = null;
        this.debounceDelay = 300; // ms
        
        this.init();
    }

    init() {
        // Aguarda o DOM estar carregado
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setupElements());
        } else {
            this.setupElements();
        }
    }

    setupElements() {
        this.searchInput = document.querySelector('.search-compact .search-input');
        this.clearButton = document.querySelector('.search-compact .clear-search');

        if (!this.searchInput || !this.clearButton) {
            console.warn('Elementos do sistema de busca não encontrados');
            return;
        }

        this.setupEventListeners();
    }

    setupEventListeners() {
        // Event listener para o input de busca
        this.searchInput.addEventListener('input', (e) => {
            const value = e.target.value;
            clearTimeout(this.searchDebounceTimer);
            this.searchDebounceTimer = setTimeout(() => {
                this.handleSearch(value);
                this.toggleClearButton(value);
            }, this.debounceDelay);
        });

        // Event listener para o botão de limpar
        this.clearButton.addEventListener('click', () => {
            this.clearSearch();
        });

        // Limpar busca com ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.searchInput.value) {
                this.clearSearch();
            }
        });
    }

    handleSearch(searchTerm) {
        const term = searchTerm.toLowerCase().trim();
        
        if (!term) {
            this.showAllAgendamentos();
            return;
        }

        this.filterAgendamentos(term);
    }

    filterAgendamentos(searchTerm) {
        // Buscar em todas as abas, não apenas na aba ativa
        const agendamentoCards = document.querySelectorAll('.agendamento-card');
        let foundCards = [];
        let visibleCount = 0;

        // Primeiro, remove todas as classes de busca existentes
        agendamentoCards.forEach(card => {
            card.classList.remove('search-found', 'search-hidden');
            card.style.display = 'flex';
        });

        // Depois, aplica a busca
        agendamentoCards.forEach(card => {
            const shouldShow = this.shouldShowCard(card, searchTerm);
            
            if (shouldShow) {
                // Adiciona contorno verde para post-its encontrados
                card.classList.add('search-found');
                foundCards.push(card);
                visibleCount++;
            } else {
                // Esconde post-its que não correspondem à busca
                card.style.display = 'none';
                card.classList.add('search-hidden');
            }
        });

        // Se encontrou resultados, mostra todas as abas para exibir os resultados
        if (foundCards.length > 0) {
            this.showAllTabsForSearch();
        }

        this.updateEmptyState(visibleCount, searchTerm);
    }

    shouldShowCard(card, searchTerm) {
        // Buscar pelo nome do cliente na estrutura específica dos cards
        const clienteElement = card.querySelector('.cliente-nome');
        const cliente = clienteElement ? clienteElement.textContent.toLowerCase() : '';
        
        // Buscar pelo atendente na estrutura específica dos cards
        const atendenteRows = card.querySelectorAll('.postit-row');
        let atendente = '';
        
        atendenteRows.forEach(row => {
            const label = row.querySelector('.postit-label');
            if (label && label.textContent.includes('Atendente:')) {
                const value = row.querySelector('.postit-value');
                if (value) {
                    atendente = value.textContent.toLowerCase();
                }
            }
        });

        // Busca integrada em cliente e atendente
        return cliente.includes(searchTerm) || atendente.includes(searchTerm);
    }



    toggleClearButton(value) {
        if (value.trim()) {
            this.clearButton.classList.add('visible');
        } else {
            this.clearButton.classList.remove('visible');
        }
    }

    clearSearch() {
        this.searchInput.value = '';
        this.clearButton.classList.remove('visible');
        this.showAllAgendamentos();
        this.restoreTabVisibility();
        this.searchInput.focus();
    }

    showAllAgendamentos() {
        const agendamentoCards = document.querySelectorAll('.agendamento-card');
        
        agendamentoCards.forEach(card => {
            card.style.display = 'flex';
            card.classList.remove('search-hidden', 'search-found');
        });

        // Usa NodeList length apenas uma vez para evitar leituras repetidas do DOM
        const total = agendamentoCards.length;
        this.updateEmptyState(total);
    }

    showAllTabsForSearch() {
        // Mostra todas as abas temporariamente para exibir resultados da busca
        const tabContents = document.querySelectorAll('.tab-content');
        tabContents.forEach(content => {
            content.style.display = 'block';
        });
    }

    restoreTabVisibility() {
        // Restaura a visibilidade normal das abas (apenas a aba ativa visível)
        const tabContents = document.querySelectorAll('.tab-content');
        const activeTab = document.querySelector('.tab-button.active');
        
        if (activeTab) {
            const activeTabId = activeTab.getAttribute('data-tab');
            
            tabContents.forEach(content => {
                if (content.id === activeTabId) {
                    content.style.display = 'block';
                } else {
                    content.style.display = 'none';
                }
            });
        }
    }

    updateEmptyState(visibleCount, searchTerm = '') {
        const emptyState = document.querySelector('.empty-state');
        const agendamentosContainer = document.getElementById('agendamentosContainer');
        
        if (!emptyState || !agendamentosContainer) return;

        if (visibleCount === 0) {
            if (searchTerm) {
                // Mostra mensagem de busca sem resultados
                emptyState.innerHTML = `
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#ccc" stroke-width="1">
                        <circle cx="11" cy="11" r="8"></circle>
                        <path d="m21 21-4.35-4.35"></path>
                    </svg>
                    <h3>Nenhum resultado encontrado</h3>
                    <p>Não foram encontrados agendamentos para "${searchTerm}"</p>
                    <button class="clear-search-btn" onclick="searchSystem.clearSearch()">Limpar busca</button>
                `;
            } else {
                // Mostra mensagem padrão
                emptyState.innerHTML = `
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#ccc" stroke-width="1">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                        <line x1="16" y1="2" x2="16" y2="6"></line>
                        <line x1="8" y1="2" x2="8" y2="6"></line>
                        <line x1="3" y1="10" x2="21" y2="10"></line>
                    </svg>
                    <h3>Nenhum agendamento encontrado</h3>
                    <p>Os agendamentos aparecerão aqui quando criados.</p>
                `;
            }
            emptyState.style.display = 'block';
        } else {
            emptyState.style.display = 'none';
        }
    }

    // Método público para atualizar a busca quando novos agendamentos são adicionados
    refresh() {
        if (this.searchInput && this.searchInput.value) {
            this.handleSearch(this.searchInput.value);
        }
    }

    // Método para destacar termos de busca (opcional)
    highlightSearchTerm(text, searchTerm) {
        if (!searchTerm) return text;
        
        const regex = new RegExp(`(${searchTerm})`, 'gi');
        return text.replace(regex, '<mark class="search-highlight">$1</mark>');
    }
}

// Inicializa o sistema de busca
const searchSystem = new SearchSystem();

// Exporta para uso global
window.searchSystem = searchSystem;