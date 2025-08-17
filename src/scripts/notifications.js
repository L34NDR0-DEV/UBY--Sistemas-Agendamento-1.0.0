/**
 * Sistema de Notificações Profissional
 * Gerencia notificações para agendamentos esquecidos, atrasados e próximos
 */

class NotificationSystem {
    constructor() {
        console.log('[DEBUG] Inicializando NotificationSystem...');
        this.notifications = new Map();
        this.panel = null;
        this.list = null;
        this.badge = null;
        this.emptyState = null;
        this.checkInterval = null;
        this.isDocumentHidden = false;
        this.settings = {
            maxNotifications: 10,
            defaultDuration: 8000,
            urgentDuration: 15000,
            position: 'dropdown'
        };
        
        this.init();
        this.setupVisibilityListener();
        console.log('[DEBUG] NotificationSystem inicializado com sucesso');
    }

    /**
     * Inicializar sistema de notificações
     */
    init() {
        console.log('[DEBUG] Inicializando painel de notificações...');
        this.createPanel();
        this.loadSettings();
        this.setupVisibilityListener();
        this.startPeriodicCheck();
        this.updateBadge();
        console.log('[DEBUG] Painel de notificações criado:', this.panel);
    }

    /**
     * Criar painel de notificações
     */
    createPanel() {
        this.panel = document.getElementById('notificationPanel');
        this.list = document.getElementById('notificationList');
        this.badge = document.getElementById('notificationBadge');
        this.emptyState = document.getElementById('notificationEmpty');
        
        if (!this.panel || !this.list) {
            console.error('[ERROR] Elementos do painel de notificações não encontrados!');
            return;
        }

        // Configurar botão de limpar todas
        const clearAllBtn = document.getElementById('clearAllNotifications');
        if (clearAllBtn) {
            clearAllBtn.addEventListener('click', () => {
                this.clearAll();
            });
        }

        // Configurar toggle do painel
        const notificationBtn = document.getElementById('notificationBtn');
        if (notificationBtn) {
            notificationBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.togglePanel();
            });
        }

        // Fechar painel ao clicar fora
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.notification-dropdown')) {
                this.closePanel();
            }
        });
    }

    /**
     * Alternar visibilidade do painel
     */
    togglePanel() {
        if (this.panel.classList.contains('show')) {
            this.closePanel();
        } else {
            this.openPanel();
        }
    }

    /**
     * Abrir painel
     */
    openPanel() {
        this.panel.classList.add('show');
        this.updatePanel();
    }

    /**
     * Fechar painel
     */
    closePanel() {
        this.panel.classList.remove('show');
    }

    /**
     * Atualizar conteúdo do painel
     */
    updatePanel() {
        if (!this.list || !this.emptyState) return;

        const notifications = Array.from(this.notifications.values());
        
        if (notifications.length === 0) {
            this.list.style.display = 'none';
            this.emptyState.style.display = 'flex';
        } else {
            this.list.style.display = 'block';
            this.emptyState.style.display = 'none';
            
            // Limpar lista atual
            this.list.innerHTML = '';
            
            // Adicionar notificações
            notifications.forEach(notification => {
                const item = this.createNotificationItem(notification);
                this.list.appendChild(item);
            });
        }
    }

    /**
     * Criar item de notificação no painel
     */
    createNotificationItem(notification) {
        const item = document.createElement('div');
        item.className = 'notification-item';
        item.dataset.id = notification.id;
        
        // Aplicar cor personalizada se especificada
        if (notification.color) {
            item.style.borderLeft = `4px solid ${notification.color}`;
            item.style.backgroundColor = `${notification.color}10`; // 10% de opacidade
        }

        const icon = this.getIcon(notification.type);

        item.innerHTML = `
            <div class="notification-item-header">
                <div class="notification-item-title">
                    <div class="notification-item-icon ${notification.type}">
                        ${icon}
                    </div>
                    ${notification.title}
                </div>
                <button class="notification-item-close" data-notification-id="${notification.id}">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </button>
            </div>
            <div class="notification-item-content">${notification.message}</div>
            ${this.createDetailsHtml(notification.data)}
        `;

        // Adicionar event listeners apenas para o botão de fechar
        this.attachItemEventListeners(item, notification);

        return item;
    }

    /**
     * Anexar event listeners aos itens do painel
     */
    attachItemEventListeners(item, notification) {
        console.log('[DEBUG] Anexando event listeners para notificação:', notification.id);
        
        // Event listener para botão de fechar
        const closeButton = item.querySelector('.notification-item-close');
        if (closeButton) {
            console.log('[DEBUG] Botão de fechar encontrado');
            
            closeButton.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('[DEBUG] Fechando notificação:', notification.id);
                this.removeNotification(notification.id);
            });
        }
    }

    /**
     * Carregar configurações do localStorage
     */
    loadSettings() {
        const saved = localStorage.getItem('notificationSettings');
        if (saved) {
            this.settings = { ...this.settings, ...JSON.parse(saved) };
        }
    }

    /**
     * Salvar configurações no localStorage
     */
    saveSettings() {
        localStorage.setItem('notificationSettings', JSON.stringify(this.settings));
    }

    /**
     * Criar notificação
     */
    createNotification(options) {
        console.log('[DEBUG] Criando notificação:', options);

        const {
            id = this.generateId(),
            type = 'info',
            title,
            message,
            duration = this.settings.defaultDuration,
            actions = [],
            data = {},
            persistent = false,
            color = null
        } = options;

        // Verificar se já existe
        if (this.notifications.has(id)) {
            this.updateNotification(id, options);
            return id;
        }

        // Limitar número de notificações
        if (this.notifications.size >= this.settings.maxNotifications) {
            this.removeOldest();
        }

        const notification = {
            id,
            type,
            title,
            message,
            duration,
            actions,
            data,
            persistent,
            color,
            createdAt: new Date()
        };
        
        // Armazenar notificação
        this.notifications.set(id, notification);

        // Atualizar painel se estiver aberto
        if (this.panel && this.panel.classList.contains('show')) {
            this.updatePanel();
        }
        
        // Atualizar badge
        this.updateBadge();

        // Auto-remover se não for persistente
        if (!persistent && duration > 0) {
            setTimeout(() => {
                this.removeNotification(id);
            }, duration);
        }

        return id;
    }

    /**
     * Atualizar notificação existente
     */
    updateNotification(id, options) {
        const notification = this.notifications.get(id);
        if (!notification) return;

        // Atualizar dados
        Object.assign(notification, options);
        
        // Atualizar painel se estiver aberto
        if (this.panel && this.panel.classList.contains('show')) {
            this.updatePanel();
        }
    }

    /**
     * Remover notificação
     */
    removeNotification(id) {
        console.log(`[DEBUG] removeNotification chamado para ID: ${id}`);
        
        const notification = this.notifications.get(id);
        if (!notification) {
            console.error(`[ERROR] Notificação não encontrada: ${id}`);
            return;
        }

        // Remover do Map
        this.notifications.delete(id);
        
        // Atualizar painel se estiver aberto
        if (this.panel && this.panel.classList.contains('show')) {
            this.updatePanel();
        }
        
        // Atualizar badge
        this.updateBadge();
        
        console.log(`[DEBUG] Notificação removida com sucesso. Total restante: ${this.notifications.size}`);
    }

    /**
     * Atualizar badge de notificações
     */
    updateBadge() {
        if (!this.badge) return;
        
        const count = this.notifications.size;
        if (count > 0) {
            this.badge.textContent = count > 99 ? '99+' : count.toString();
            this.badge.style.display = 'flex';
        } else {
            this.badge.style.display = 'none';
        }
    }

    /**
     * Remover notificação mais antiga
     */
    removeOldest() {
        const oldest = Array.from(this.notifications.values())
            .filter(n => !n.persistent)
            .sort((a, b) => a.createdAt - b.createdAt)[0];
        
        if (oldest) {
            this.removeNotification(oldest.id);
        }
    }

    /**
     * Manipular ação da notificação
     */
    handleAction(notificationId, actionId) {
        console.log(`[DEBUG] handleAction chamado: notificationId=${notificationId}, actionId=${actionId}`);
        
        const notification = this.notifications.get(notificationId);
        if (!notification) {
            console.error(`[ERROR] Notificação não encontrada: ${notificationId}`);
            return;
        }

        const action = notification.actions.find(a => a.id === actionId);
        if (!action) {
            console.error(`[ERROR] Ação não encontrada: ${actionId} na notificação ${notificationId}`);
            return;
        }

        console.log(`[DEBUG] Executando ação: ${action.label}`);

        // Executar callback se existir
        if (action.callback) {
            try {
                action.callback(notification.data);
                console.log(`[DEBUG] Callback executado com sucesso para ação: ${actionId}`);
            } catch (error) {
                console.error(`[ERROR] Erro ao executar callback da ação ${actionId}:`, error);
            }
        } else {
            console.warn(`[WARN] Nenhum callback definido para ação: ${actionId}`);
        }

        // Remover notificação se especificado
        if (action.dismissOnClick !== false) {
            console.log(`[DEBUG] Removendo notificação após ação: ${notificationId}`);
            this.removeNotification(notificationId);
        }
    }

    /**
     * Gerar ID único
     */
    generateId() {
        return `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Verificação periódica de agendamentos
     */
    startPeriodicCheck() {
        // Evita múltiplos intervalos
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
        }
        // Verificar a cada minuto quando visível
        this.checkInterval = setInterval(() => {
            if (!this.isDocumentHidden) {
                this.checkAppointments();
            }
        }, 60000);

        // Verificação inicial com pequeno atraso para aguardar carregamento de dados
        setTimeout(() => {
            if (!this.isDocumentHidden) {
                this.checkAppointments();
            }
        }, 1500);
    }

    // Pausar/retomar verificações com base na visibilidade da aba
    
    setupVisibilityListener() {
        const handleVisibility = () => {
            this.isDocumentHidden = document.hidden;
            if (this.isDocumentHidden) {
                // Pausar verificações quando oculto
                if (this.checkInterval) {
                    clearInterval(this.checkInterval);
                    this.checkInterval = null;
                }
            } else {
                // Retomar verificações quando voltar a ficar visível
                this.startPeriodicCheck();
            }
        };
        document.addEventListener('visibilitychange', handleVisibility);
        // Inicializa o estado conforme a visibilidade atual
        this.isDocumentHidden = document.hidden;
        if (!this.isDocumentHidden && !this.checkInterval) {
            this.startPeriodicCheck();
        }
    }

    /**
     * Verificar agendamentos e criar notificações
     */
    checkAppointments() {
        if (!window.agendamentos) return;

        const now = new Date();
        // Filtrar agendamentos que não estão concluídos ou cancelados
        const appointments = window.agendamentos.filter(a => 
            a.status !== 'Concluído' && 
            a.status !== 'Cancelado' &&
            a.status !== 'concluido' &&
            a.status !== 'cancelado'
        );
        
        console.log('[DEBUG] Agendamentos para verificação:', {
            total: window.agendamentos.length,
            paraVerificar: appointments.length,
            agendamentos: appointments.map(a => ({
                cliente: a.nomeCliente,
                status: a.status,
                data: a.data,
                horario: a.horario || a.hora
            }))
        });

        appointments.forEach(appointment => {
            // Filtrar agendamentos concluídos e cancelados
            if (appointment.status === 'concluido' || appointment.status === 'cancelado') {
                return;
            }
            
            // Usar horario (usado no main.js) ou hora como fallback
            const timeField = appointment.horario || appointment.hora;
            if (!timeField) {
                console.warn('[WARNING] Agendamento sem horário definido:', appointment);
                return;
            }
            const appointmentTime = new Date(`${appointment.data}T${timeField}:00`);
            const timeDiff = appointmentTime - now;
            const minutesDiff = Math.floor(timeDiff / (1000 * 60));
            
            console.log('[DEBUG] Verificando agendamento:', {
                cliente: appointment.nomeCliente,
                data: appointment.data,
                horario: timeField,
                minutesDiff,
                status: appointment.status
            });

            // Sistema de prevenção de atrasos - alertas antecipados a cada 20 minutos
            if (minutesDiff > 0 && minutesDiff <= 120 && minutesDiff % 20 === 0) {
                const timeText = minutesDiff === 20 ? '20 minutos' : 
                                minutesDiff === 40 ? '40 minutos' : 
                                minutesDiff === 60 ? '1 hora' : 
                                minutesDiff === 80 ? '1 hora e 20 minutos' : 
                                minutesDiff === 100 ? '1 hora e 40 minutos' : 
                                minutesDiff === 120 ? '2 horas' : `${minutesDiff} minutos`;
                this.createPreventionNotification(appointment, timeText);
            }
            
            // Agendamentos próximos (apenas os mais importantes)
            if (minutesDiff === 60) {
                this.createReminderNotification(appointment, '1 hora');
            } else if (minutesDiff === 15) {
                this.createReminderNotification(appointment, '15 minutos');
            } else if (minutesDiff === 5) {
                this.createReminderNotification(appointment, '5 minutos');
            }

            // Agendamentos atrasados - a cada 10 minutos
            if (minutesDiff < 0) {
                const delayMinutes = Math.abs(minutesDiff);
                console.log('[DEBUG] Agendamento atrasado detectado:', {
                    cliente: appointment.nomeCliente,
                    minutosAtraso: delayMinutes,
                    deveNotificar: delayMinutes % 10 === 0
                });
                
                if (delayMinutes % 10 === 0) { // A cada 10 minutos
                    console.log('[DEBUG] Criando notificação de atraso para:', appointment.nomeCliente);
                    this.createLateNotification(appointment, delayMinutes);
                }
            }

            // Agendamentos esquecidos (mais de 2 horas de atraso)
            if (minutesDiff < -120) {
                this.createForgottenNotification(appointment, Math.abs(minutesDiff));
            }
        });
    }

    /**
     * Criar notificação de lembrete
     */
    createReminderNotification(appointment, timeText) {
        const id = `reminder_${appointment.id}_${timeText.replace(' ', '_')}`;
        
        // Determinar urgência baseada no tempo restante
        let type = 'reminder';
        let title = 'Próximo Agendamento';
        let urgencyText = '';
        
        if (timeText.includes('2 minutos')) {
            type = 'urgent';
            title = 'AGENDAMENTO IMINENTE';
            urgencyText = ' - PREPARE-SE!';
        } else if (timeText.includes('5 minutos')) {
            type = 'warning';
            title = 'Agendamento Muito Próximo';
            urgencyText = ' - Últimos preparativos!';
        } else if (timeText.includes('10 minutos') || timeText.includes('15 minutos')) {
            type = 'warning';
            title = 'Agendamento Próximo';
            urgencyText = ' - Prepare-se!';
        }
        
        // Formatar data e hora de forma mais legível
        const dataFormatada = this.formatDate(appointment.data);
        const horaFormatada = appointment.hora;
        
        this.createNotification({
            id,
            type,
            title,
            message: `${appointment.nomeCliente || appointment.cliente} • ${dataFormatada} às ${horaFormatada} • ${timeText} restante`,
            data: {
                cliente: appointment.nomeCliente || appointment.cliente,
                data: dataFormatada,
                hora: horaFormatada,
                tempo_restante: timeText
            },
            color: '#007bff', // Azul para lembretes
            actions: [
                {
                    id: 'view',
                    label: 'Ver Detalhes',
                    style: 'primary',
                    callback: (data) => {
                        // Abrir detalhes do agendamento
                        if (window.openAgendamentoDetails) {
                            window.openAgendamentoDetails(appointment.id);
                        }
                    }
                },
                {
                    id: 'call',
                    label: 'Ligar Cliente',
                    style: 'secondary',
                    callback: (data) => {
                        if (data.telefone) {
                            window.open(`tel:${data.telefone}`);
                        }
                    }
                },
                {
                    id: 'prepare',
                    label: 'Marcar Preparado',
                    style: 'secondary',
                    callback: (data) => {
                        // Marcar como preparado e remover notificação
                        this.removeNotification(id);
                        if (window.showToast) {
                            window.showToast(`Preparado para ${data.cliente}`, 'success');
                        }
                    }
                }
            ],
            duration: type === 'urgent' ? 0 : this.settings.defaultDuration, // Urgentes não expiram automaticamente
            persistent: type === 'urgent' || type === 'warning'
        });
    }

    /**
     * Criar notificação de atraso
     */
    createLateNotification(appointment, delayMinutes, alertCount = 1, maxAlerts = 2) {
        const id = `late_${appointment.id}`;
        
        // Determinar nível de urgência baseado no tempo de atraso
        let urgencyLevel = '';
        let urgencyMessage = '';
        
        if (delayMinutes >= 60) {
            urgencyLevel = 'CRÍTICO';
            urgencyMessage = ' - SITUAÇÃO CRÍTICA!';
        } else if (delayMinutes >= 30) {
            urgencyLevel = 'ALTO';
            urgencyMessage = ' - Ação necessária!';
        } else if (delayMinutes >= 15) {
            urgencyLevel = 'MODERADO';
            urgencyMessage = ' - Verifique status';
        } else {
            urgencyLevel = 'BAIXO';
            urgencyMessage = '';
        }
        
        const dataFormatada = this.formatDate(appointment.data);
        const horaFormatada = appointment.hora;
        const atrasoFormatado = this.formatDuration(delayMinutes);
        
        this.createNotification({
            id,
            type: 'late',
            title: `Cliente em Atraso (${urgencyLevel})`,
            message: `${appointment.nomeCliente || appointment.cliente} • ${dataFormatada} às ${horaFormatada} • ${atrasoFormatado} de atraso`,
            data: {
                cliente: appointment.nomeCliente || appointment.cliente,
                data: dataFormatada,
                hora: horaFormatada,
                atraso: atrasoFormatado
            },
            color: '#dc3545', // Vermelho para atrasos
            actions: [
                {
                    id: 'call',
                    label: 'Contatar Cliente',
                    style: 'primary',
                    callback: (data) => {
                        if (data.telefone) {
                            window.open(`tel:${data.telefone}`);
                        }
                    }
                },
                {
                    id: 'whatsapp',
                    label: 'WhatsApp',
                    style: 'secondary',
                    callback: (data) => {
                        if (data.telefone) {
                            const message = encodeURIComponent(`Olá ${data.cliente}, notamos que você está atrasado(a) para seu agendamento das ${data.hora}. Está tudo bem? Podemos reagendar se necessário.`);
                            window.open(`https://wa.me/55${data.telefone.replace(/\D/g, '')}?text=${message}`);
                        }
                    }
                },
                {
                    id: 'reschedule',
                    label: 'Reagendar',
                    style: 'secondary',
                    callback: (data) => {
                        // Abrir modal de reagendamento
                        if (window.openRescheduleModal) {
                            window.openRescheduleModal(appointment.id);
                        }
                    }
                },
                {
                    id: 'arrived',
                    label: 'Cliente Chegou',
                    style: 'secondary',
                    callback: (data) => {
                        // Marcar como chegou e remover notificação
                        this.removeNotification(id);
                        if (window.showToast) {
                            window.showToast(`${data.cliente} marcado como chegou`, 'success');
                        }
                    }
                },
                {
                    id: 'cancel',
                    label: 'Cancelar',
                    style: 'secondary',
                    callback: (data) => {
                        // Cancelar agendamento
                        if (window.cancelAppointment) {
                            window.cancelAppointment(appointment.id);
                        }
                    }
                }
            ],
            duration: 0, // Notificações de atraso não expiram automaticamente
            persistent: true // Sempre persistentes
        });
    }

    /**
     * Criar notificação de prevenção de atrasos
     */
    createPreventionNotification(appointment, timeText) {
        const id = `prevention_${appointment.id}_${timeText.replace(/\s/g, '_')}`;
        
        // Determinar urgência baseada no tempo restante
        let type = 'info';
        let title = 'Lembrete de Agendamento';
        let urgencyText = '';
        
        if (timeText.includes('20 minutos')) {
            type = 'warning';
            title = 'Agendamento Próximo';
            urgencyText = ' - Prepare-se!';
        } else if (timeText.includes('40 minutos')) {
            type = 'reminder';
            title = 'Agendamento se Aproximando';
            urgencyText = ' - Organize-se';
        }
        
        // Formatar data e hora de forma mais legível
        const dataFormatada = this.formatDate(appointment.data);
        const horaFormatada = appointment.horario || appointment.hora;
        
        this.createNotification({
            id,
            type,
            title,
            message: `${appointment.nomeCliente || appointment.cliente} • ${dataFormatada} às ${horaFormatada} • ${timeText} restante`,
            data: {
                cliente: appointment.nomeCliente || appointment.cliente,
                data: dataFormatada,
                hora: horaFormatada,
                adiantamento: timeText
            },
            color: '#007bff', // Azul para adiantamentos
            actions: [
                {
                    id: 'prepare',
                    label: 'Preparar Atendimento',
                    style: 'primary',
                    callback: (data) => {
                        this.removeNotification(id);
                        if (window.showToast) {
                            window.showToast(`Preparando para atender ${data.cliente}`, 'info');
                        }
                    }
                },
                {
                    id: 'call',
                    label: 'Contatar Cliente',
                    style: 'secondary',
                    callback: (data) => {
                        if (data.telefone) {
                            window.open(`tel:${data.telefone}`);
                        }
                    }
                },
                {
                    id: 'whatsapp',
                    label: 'WhatsApp',
                    style: 'secondary',
                    callback: (data) => {
                        if (data.telefone) {
                            const message = encodeURIComponent(`Olá ${data.cliente}, lembrando que você tem um agendamento às ${data.hora} hoje. Nos vemos em breve!`);
                            window.open(`https://wa.me/55${data.telefone.replace(/\D/g, '')}?text=${message}`);
                        }
                    }
                }
            ],
            duration: this.settings.defaultDuration,
            persistent: false
        });
    }

    /**
     * Criar notificação de adiantamento
     */
    createEarlyNotification(appointment, earlyMinutes) {
        const id = `early_${appointment.id}`;
        
        // Determinar nível de adiantamento
        let levelText = '';
        let actionMessage = '';
        
        if (earlyMinutes >= 60) {
            levelText = 'MUITO CEDO';
            actionMessage = ' - Considere reagendar';
        } else if (earlyMinutes >= 30) {
            levelText = 'CEDO';
            actionMessage = ' - Verifique disponibilidade';
        } else if (earlyMinutes >= 15) {
            levelText = 'ANTECIPADO';
            actionMessage = ' - Pode atender?';
        } else {
            levelText = 'PONTUAL';
            actionMessage = ' - Pronto para atender';
        }
        
        const dataFormatada = this.formatDate(appointment.data);
        const horaFormatada = appointment.hora;
        const adiantamentoFormatado = this.formatDuration(earlyMinutes);
        
        this.createNotification({
            id,
            type: 'info',
            title: `Cliente Adiantado (${levelText})`,
            message: `${appointment.cliente} • ${adiantamentoFormatado} adiantado${actionMessage}`,
            data: {
                cliente: appointment.cliente,
                data: dataFormatada,
                hora: horaFormatada,
                telefone: appointment.telefone,
                servico: appointment.servico || 'Não especificado',
                earlyMinutes: earlyMinutes,
                earlyFormatted: adiantamentoFormatado,
                levelText: levelText,
                observacoes: appointment.observacoes || 'Nenhuma observação'
            },
            actions: [
                {
                    id: 'attend_now',
                    label: 'Atender Agora',
                    style: 'primary',
                    callback: (data) => {
                        // Marcar como atendendo agora
                        this.removeNotification(id);
                        if (window.showToast) {
                            window.showToast(`Atendendo ${data.cliente} agora`, 'success');
                        }
                        if (window.startAppointment) {
                            window.startAppointment(appointment.id);
                        }
                    }
                },
                {
                    id: 'wait',
                    label: 'Pedir para Aguardar',
                    style: 'secondary',
                    callback: (data) => {
                        if (data.telefone) {
                            const message = encodeURIComponent(`Olá ${data.cliente}, você chegou ${data.earlyFormatted} adiantado(a). Por favor, aguarde um momento. Seu horário é às ${data.hora}.`);
                            window.open(`https://wa.me/55${data.telefone.replace(/\D/g, '')}?text=${message}`);
                        }
                    }
                },
                {
                    id: 'reschedule_earlier',
                    label: 'Reagendar Mais Cedo',
                    style: 'secondary',
                    callback: (data) => {
                        // Abrir modal de reagendamento para horário mais cedo
                        if (window.openRescheduleModal) {
                            window.openRescheduleModal(appointment.id, 'earlier');
                        }
                    }
                },
                {
                    id: 'call',
                    label: 'Ligar Cliente',
                    style: 'secondary',
                    callback: (data) => {
                        if (data.telefone) {
                            window.open(`tel:${data.telefone}`);
                        }
                    }
                }
            ],
            duration: this.settings.defaultDuration,
            persistent: earlyMinutes >= 30 // Persistente se muito adiantado
        });
    }

    /**
     * Criar notificação de adiamento
     */
    createPostponementNotification(appointment, newDate, newTime, reason = '') {
        const id = `postponement_${appointment.id}_${Date.now()}`;
        
        // Calcular diferença de tempo
        const originalDate = new Date(`${appointment.data}T${appointment.hora}`);
        const newDateTime = new Date(`${newDate}T${newTime}`);
        const diffMs = newDateTime.getTime() - originalDate.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        
        let postponementText = '';
        let urgencyLevel = 'info';
        
        if (diffDays > 7) {
            postponementText = `${diffDays} dias`;
            urgencyLevel = 'warning';
        } else if (diffDays > 0) {
            postponementText = diffDays === 1 ? '1 dia' : `${diffDays} dias`;
        } else if (diffHours > 0) {
            postponementText = diffHours === 1 ? '1 hora' : `${diffHours} horas`;
        } else {
            postponementText = 'mesmo dia';
        }
        
        const originalDateFormatted = this.formatDate(appointment.data);
        const newDateFormatted = this.formatDate(newDate);
        
        this.createNotification({
            id,
            type: urgencyLevel,
            title: `Agendamento Adiado`,
            message: `${appointment.cliente} • Adiado ${postponementText}${reason ? ` - ${reason}` : ''}`,
            data: {
                cliente: appointment.cliente,
                dataOriginal: originalDateFormatted,
                horaOriginal: appointment.hora,
                dataNova: newDateFormatted,
                horaNova: newTime,
                telefone: appointment.telefone,
                servico: appointment.servico || 'Não especificado',
                motivo: reason || 'Não informado',
                postponementText: postponementText,
                observacoes: appointment.observacoes || 'Nenhuma observação'
            },
            actions: [
                {
                    id: 'confirm',
                    label: 'Confirmar Novo Horário',
                    style: 'primary',
                    callback: (data) => {
                        // Confirmar novo agendamento
                        this.removeNotification(id);
                        if (window.showToast) {
                            window.showToast(`Novo horário confirmado para ${data.cliente}: ${data.dataNova} às ${data.horaNova}`, 'success');
                        }
                        if (window.confirmReschedule) {
                            window.confirmReschedule(appointment.id, newDate, newTime);
                        }
                    }
                },
                {
                    id: 'notify_client',
                    label: 'Notificar Cliente',
                    style: 'secondary',
                    callback: (data) => {
                        if (data.telefone) {
                            const message = encodeURIComponent(`Olá ${data.cliente}, seu agendamento foi reagendado de ${data.dataOriginal} às ${data.horaOriginal} para ${data.dataNova} às ${data.horaNova}. ${data.motivo !== 'Não informado' ? `Motivo: ${data.motivo}.` : ''} Confirme se está tudo certo!`);
                            window.open(`https://wa.me/55${this.formatPhoneForWhatsApp(data.telefone)}?text=${message}`);
                        }
                    }
                },
                {
                    id: 'call',
                    label: 'Ligar Cliente',
                    style: 'secondary',
                    callback: (data) => {
                        if (data.telefone) {
                            window.open(`tel:${data.telefone}`);
                        }
                    }
                },
                {
                    id: 'view_details',
                    label: 'Ver Detalhes',
                    style: 'secondary',
                    callback: (data) => {
                        if (window.openAgendamentoDetails) {
                            window.openAgendamentoDetails(appointment.id);
                        }
                    }
                }
            ],
            duration: this.settings.defaultDuration,
            persistent: diffDays > 3 // Persistente se adiado por mais de 3 dias
        });
    }

    /**
     * Criar notificação de esquecimento
     */
    createForgottenNotification(appointment, delayMinutes) {
        const id = `forgotten_${appointment.id}`;
        
        this.createNotification({
            id,
            type: 'urgent',
            title: 'Agendamento Crítico',
            message: `${appointment.cliente} • Esquecido há ${this.formatDuration(delayMinutes)}`,
            data: {
                cliente: appointment.cliente,
                data: this.formatDate(appointment.data),
                hora: appointment.hora,
                telefone: appointment.telefone,
                delay: delayMinutes,
                delayFormatted: this.formatDuration(delayMinutes),
                servico: appointment.servico || 'Não especificado',
                observacoes: appointment.observacoes || 'Nenhuma observação'
            },
            actions: [
                {
                    id: 'resolve',
                    label: 'Marcar Resolvido',
                    style: 'primary',
                    callback: (data) => {
                        // Marcar como concluído ou cancelado
                        this.removeNotification(id);
                        if (window.showToast) {
                            window.showToast(`Agendamento de ${data.cliente} marcado como resolvido`, 'success');
                        }
                        if (window.resolveAppointment) {
                            window.resolveAppointment(appointment.id);
                        }
                    }
                },
                {
                    id: 'call',
                    label: 'Contatar Urgente',
                    style: 'secondary',
                    callback: (data) => {
                        if (data.telefone) {
                            window.open(`tel:${data.telefone}`);
                        }
                    }
                },
                {
                    id: 'reschedule',
                    label: 'Reagendar',
                    style: 'secondary',
                    callback: (data) => {
                        if (window.openRescheduleModal) {
                            window.openRescheduleModal(appointment.id);
                        }
                    }
                }
            ],
            persistent: true
        });
    }

    /**
     * Limpar todas as notificações
     */
    clearAll() {
        this.notifications.clear();
        this.updatePanel();
        this.updateBadge();
        
        if (window.showToast) {
            window.showToast('Todas as notificações foram removidas', 'success');
        }
    }

    /**
     * Obter estatísticas
     */
    getStats() {
        const types = {};
        this.notifications.forEach(notification => {
            types[notification.type] = (types[notification.type] || 0) + 1;
        });
        
        return {
            total: this.notifications.size,
            types,
            persistent: Array.from(this.notifications.values()).filter(n => n.persistent).length
        };
    }

    /**
     * Mostrar painel de notificações ativas
     */
    showNotificationsPanel() {
        this.openPanel();
    }

    /**
     * Criar HTML dos detalhes
     */
    createDetailsHtml(data) {
        if (!data || Object.keys(data).length === 0) return '';

        const details = Object.entries(data)
            .map(([key, value]) => {
                const formattedValue = this.formatValue(key, value);
                // Filtrar valores nulos ou campos que não devem ser exibidos
                if (formattedValue === null || formattedValue === undefined) {
                    return null;
                }
                const label = this.formatLabel(key);
                return `
                    <div class="notification-item-row">
                        <div class="notification-item-label">${label}:</div>
                        <div class="notification-item-value">${formattedValue}</div>
                    </div>
                `;
            })
            .filter(item => item !== null)
            .join('');

        return details ? `<div class="notification-item-details">${details}</div>` : '';
    }

    /**
     * Formatar rótulo
     */
    formatLabel(key) {
        const labels = {
            cliente: 'Cliente',
            data: 'Data',
            hora: 'Hora',
            telefone: 'Telefone',
            servico: 'Serviço',
            endereco: 'Endereço',
            paradas: 'Paradas',
            observacoes: 'Observações',
            status: 'Status',
            delay: 'Atraso',
            timeUntil: 'Tempo restante',
            timeRemaining: 'Tempo restante',
            delayFormatted: 'Atraso',
            urgencyLevel: 'Nível de urgência'
        };
        return labels[key] || key.charAt(0).toUpperCase() + key.slice(1);
    }

    /**
     * Formatar valor
     */
    formatValue(key, value) {
        if (key === 'data') {
            return this.formatDate(value);
        }
        if (key === 'delay' || key === 'timeUntil') {
            return this.formatDuration(value);
        }
        if (key === 'paradas') {
            if (!value || !Array.isArray(value) || value.length === 0) {
                return 'Nenhuma parada';
            }
            return value.map((parada, index) => `${index + 1}. ${parada}`).join('<br>');
        }
        if (key === 'telefone' && value) {
            return `<a href="tel:${value}" style="color: #007bff; text-decoration: none;">${value}</a>`;
        }
        if (key === 'observacoes' && (!value || value.trim() === '')) {
            return 'Nenhuma observação';
        }
        // Ocultar campos internos/técnicos
        if (['alertCount', 'maxAlerts', 'delayFormatted', 'timeRemaining'].includes(key)) {
            return null;
        }
        return value || 'Não informado';
    }

    /**
     * Formatar duração em minutos para texto legível
     */
    formatDuration(minutes) {
        if (minutes < 60) {
            return `${minutes} minuto${minutes !== 1 ? 's' : ''}`;
        }
        
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;
        
        if (remainingMinutes === 0) {
            return `${hours} hora${hours !== 1 ? 's' : ''}`;
        }
        
        return `${hours}h ${remainingMinutes}min`;
    }

    /**
     * Formatar data para exibição
     */
    formatDate(dateString) {
        try {
            const date = new Date(dateString);
            const today = new Date();
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            
            // Comparar apenas as datas (sem horário)
            const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
            const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
            const tomorrowOnly = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate());
            const yesterdayOnly = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());
            
            if (dateOnly.getTime() === todayOnly.getTime()) {
                return 'Hoje';
            } else if (dateOnly.getTime() === tomorrowOnly.getTime()) {
                return 'Amanhã';
            } else if (dateOnly.getTime() === yesterdayOnly.getTime()) {
                return 'Ontem';
            } else {
                // Formato brasileiro: DD/MM/AAAA
                return date.toLocaleDateString('pt-BR');
            }
        } catch (error) {
            return dateString; // Retorna a string original se houver erro
        }
    }

    /**
     * Formatar telefone para WhatsApp (apenas números)
     */
    formatPhoneForWhatsApp(phone) {
        if (!phone) return '';
        return phone.replace(/\D/g, '');
    }

    /**
     * Obter ícone por tipo - Ícones robustos que sempre aparecem
     */
    getIcon(type) {
        // Ícones simplificados e robustos com fallback garantido
        const icons = {
            reminder: `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="12" r="10" fill="currentColor"/>
                <path d="M12 6v6l4 2" stroke="white" stroke-width="2" stroke-linecap="round" fill="none"/>
            </svg>`,
            warning: `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L1 21h22L12 2z" fill="currentColor"/>
                <path d="M12 9v4M12 17h.01" stroke="white" stroke-width="2" stroke-linecap="round" fill="none"/>
            </svg>`,
            urgent: `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="12" r="10" fill="currentColor"/>
                <path d="M12 8v4M12 16h.01" stroke="white" stroke-width="2" stroke-linecap="round" fill="none"/>
            </svg>`,
            late: `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="12" r="10" fill="currentColor"/>
                <path d="M12 6v6l4 2" stroke="white" stroke-width="2" stroke-linecap="round" fill="none"/>
                <circle cx="12" cy="12" r="2" fill="white" opacity="0.8"/>
            </svg>`,
            success: `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="12" r="10" fill="currentColor"/>
                <path d="M9 12l2 2 4-4" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
            </svg>`,
            info: `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="12" r="10" fill="currentColor"/>
                <path d="M12 8h.01M12 12v4" stroke="white" stroke-width="2" stroke-linecap="round" fill="none"/>
            </svg>`,
            calendar: `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" fill="currentColor"/>
                <line x1="16" y1="2" x2="16" y2="6" stroke="white" stroke-width="2" stroke-linecap="round"/>
                <line x1="8" y1="2" x2="8" y2="6" stroke="white" stroke-width="2" stroke-linecap="round"/>
                <line x1="3" y1="10" x2="21" y2="10" stroke="white" stroke-width="2" stroke-linecap="round"/>
            </svg>`,
            phone: `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" fill="currentColor"/>
            </svg>`,
            user: `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="8" r="5" fill="currentColor"/>
                <path d="M20 21a8 8 0 10-16 0" fill="currentColor"/>
            </svg>`
        };
        
        // Garantir que sempre retorne um ícone válido
        const selectedIcon = icons[type] || icons.info;
        
        // Fallback adicional caso o SVG falhe
        if (!selectedIcon || selectedIcon.trim() === '') {
            return `<div style="width: 16px; height: 16px; background: currentColor; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 10px; font-weight: bold;">!</div>`;
        }
        
        return selectedIcon;
    }
}

// Exportar classe para uso global
window.NotificationSystem = NotificationSystem;

// Inicializar sistema global apenas se ainda não foi inicializado
if (!window.notificationSystem) {
    window.notificationSystem = new NotificationSystem();
    window.notificationSystem.init();
    console.log('[SUCCESS] Sistema de notificações inicializado globalmente');
}

// Exportar para uso em outros módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NotificationSystem;
}