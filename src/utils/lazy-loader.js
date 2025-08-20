/**
 * Sistema de Lazy Loading Condicional
 * Carrega agendamentos sob demanda apenas em máquinas lentas
 * Mantém a experiência visual idêntica
 */

class LazyLoader {
    constructor() {
        this.loadedItems = new Set();
        this.loadingQueue = [];
        this.isLoading = false;
        this.observer = null;
        this.batchSize = 10;
        this.loadDelay = 100;
        
        this.init();
    }

    init() {
        // Aguarda o detector de performance estar pronto
        const checkDetector = () => {
            if (window.performanceDetector) {
                this.setupLazyLoading();
            } else {
                setTimeout(checkDetector, 100);
            }
        };
        checkDetector();
    }

    setupLazyLoading() {
        // Só ativa lazy loading se necessário
        if (!window.performanceDetector.shouldUseLazyLoading()) {
            return;
        }

        this.batchSize = window.performanceDetector.getPageSize() / 2;
        this.loadDelay = window.performanceDetector.getDebounceDelay() / 5;

        // Configura Intersection Observer para detectar elementos visíveis
        this.setupIntersectionObserver();
        
        console.log('Lazy loading ativado para máquina lenta');
    }

    setupIntersectionObserver() {
        const options = {
            root: null,
            rootMargin: '100px', // Carrega 100px antes de ficar visível
            threshold: 0.1
        };

        this.observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    this.loadItem(entry.target);
                }
            });
        }, options);
    }

    // Método principal para processar lista de agendamentos
    processAppointmentsList(appointments, container) {
        if (!window.performanceDetector?.shouldUseLazyLoading()) {
            // Se não precisa de lazy loading, renderiza tudo normalmente
            return this.renderAllAppointments(appointments, container);
        }

        // Limpa container
        container.innerHTML = '';
        this.loadedItems.clear();

        // Cria placeholders para todos os agendamentos
        appointments.forEach((appointment, index) => {
            const placeholder = this.createPlaceholder(appointment, index);
            container.appendChild(placeholder);
            
            // Observa o placeholder
            this.observer.observe(placeholder);
        });

        // Carrega os primeiros itens imediatamente
        this.loadInitialBatch(container);
    }

    createPlaceholder(appointment, index) {
        const placeholder = document.createElement('div');
        placeholder.className = 'appointment-placeholder';
        placeholder.dataset.appointmentId = appointment.id || index;
        placeholder.dataset.appointmentData = JSON.stringify(appointment);
        
        // Mantém a altura aproximada para evitar layout shift
        placeholder.style.height = '80px';
        placeholder.style.marginBottom = '10px';
        placeholder.style.backgroundColor = 'transparent';
        placeholder.style.border = 'none';
        
        return placeholder;
    }

    loadInitialBatch(container) {
        const placeholders = container.querySelectorAll('.appointment-placeholder');
        const initialCount = Math.min(this.batchSize, placeholders.length);
        
        for (let i = 0; i < initialCount; i++) {
            this.loadItem(placeholders[i]);
        }
    }

    loadItem(placeholder) {
        const appointmentId = placeholder.dataset.appointmentId;
        
        if (this.loadedItems.has(appointmentId)) {
            return;
        }

        this.loadedItems.add(appointmentId);
        
        // Adiciona à fila de carregamento
        this.loadingQueue.push(placeholder);
        
        // Processa fila se não estiver carregando
        if (!this.isLoading) {
            this.processLoadingQueue();
        }
    }

    async processLoadingQueue() {
        if (this.isLoading || this.loadingQueue.length === 0) {
            return;
        }

        this.isLoading = true;

        while (this.loadingQueue.length > 0) {
            const batch = this.loadingQueue.splice(0, this.batchSize);
            
            await Promise.all(batch.map(placeholder => this.renderAppointment(placeholder)));
            
            // Pequeno delay entre batches para não travar a UI
            if (this.loadingQueue.length > 0) {
                await this.delay(this.loadDelay);
            }
        }

        this.isLoading = false;
    }

    async renderAppointment(placeholder) {
        try {
            const appointmentData = JSON.parse(placeholder.dataset.appointmentData);
            
            // Cria o elemento real do agendamento
            const appointmentElement = this.createAppointmentElement(appointmentData);
            
            // Substitui o placeholder pelo elemento real
            placeholder.parentNode.replaceChild(appointmentElement, placeholder);
            
            // Para de observar o placeholder
            this.observer.unobserve(placeholder);
            
        } catch (error) {
            console.error('Erro ao renderizar agendamento:', error);
            // Em caso de erro, remove o placeholder
            placeholder.remove();
        }
    }

    createAppointmentElement(appointment) {
        // Cria o elemento HTML do agendamento
        // Esta função deve ser adaptada para o formato específico do seu sistema
        const element = document.createElement('div');
        element.className = 'appointment-item';
        element.dataset.appointmentId = appointment.id;
        
        element.innerHTML = `
            <div class="appointment-content">
                <div class="appointment-time">${appointment.time || ''}</div>
                <div class="appointment-title">${appointment.title || appointment.nome || ''}</div>
                <div class="appointment-description">${appointment.description || appointment.descricao || ''}</div>
                <div class="appointment-actions">
                    <button onclick="editarAgendamento('${appointment.id}')" class="btn-edit">Editar</button>
                    <button onclick="excluirAgendamento('${appointment.id}')" class="btn-delete">Excluir</button>
                </div>
            </div>
        `;
        
        return element;
    }

    renderAllAppointments(appointments, container) {
        // Renderização normal para máquinas rápidas
        container.innerHTML = '';
        
        appointments.forEach(appointment => {
            const element = this.createAppointmentElement(appointment);
            container.appendChild(element);
        });
    }

    // Método para busca com lazy loading
    filterAppointments(searchTerm, allAppointments, container) {
        const filteredAppointments = allAppointments.filter(appointment => {
            const searchText = `${appointment.title || appointment.nome || ''} ${appointment.description || appointment.descricao || ''}`.toLowerCase();
            return searchText.includes(searchTerm.toLowerCase());
        });

        this.processAppointmentsList(filteredAppointments, container);
    }

    // Método para atualizar um agendamento específico
    updateAppointment(appointmentId, newData, container) {
        const existingElement = container.querySelector(`[data-appointment-id="${appointmentId}"]`);
        
        if (existingElement) {
            const updatedElement = this.createAppointmentElement(newData);
            existingElement.parentNode.replaceChild(updatedElement, existingElement);
        }
    }

    // Método para adicionar novo agendamento
    addAppointment(appointmentData, container) {
        if (!window.performanceDetector?.shouldUseLazyLoading()) {
            // Adiciona normalmente se não precisa de lazy loading
            const element = this.createAppointmentElement(appointmentData);
            container.insertBefore(element, container.firstChild);
            return;
        }

        // Com lazy loading, adiciona no topo e carrega imediatamente
        const element = this.createAppointmentElement(appointmentData);
        container.insertBefore(element, container.firstChild);
        this.loadedItems.add(appointmentData.id);
    }

    // Método para remover agendamento
    removeAppointment(appointmentId, container) {
        const element = container.querySelector(`[data-appointment-id="${appointmentId}"]`);
        if (element) {
            element.remove();
            this.loadedItems.delete(appointmentId);
        }
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Método para limpar recursos
    destroy() {
        if (this.observer) {
            this.observer.disconnect();
        }
        this.loadedItems.clear();
        this.loadingQueue = [];
    }
}

// Instância global
window.lazyLoader = new LazyLoader();

// Exporta para uso em outros módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LazyLoader;
}