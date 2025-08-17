/**
 * Cliente WebSocket para comunicação em tempo real
 * Gerencia conexão com servidor, eventos e sincronização
 */

class WebSocketClient {
    constructor() {
        this.socket = null;
        this.isConnected = false;
        this.isAuthenticated = false;
        this.userId = null;
        this.userName = null;
        this.displayName = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.pingInterval = null;
        this.eventHandlers = new Map();
        this.onAuthenticated = null;
    }

    /**
     * Conectar ao servidor WebSocket
     */
    async connect(serverUrl = 'http://localhost:3000') {
        try {
            // Verificar se Socket.IO está disponível
            if (typeof io === 'undefined') {
                console.error('[ERROR] Socket.IO client não encontrado. Verifique se o script socket.io.js está carregado.');
                return false;
            }

            console.log(`[INFO] Tentando conectar ao WebSocket em ${serverUrl}`);

            // Configurar conexão
            this.socket = io(serverUrl, {
                transports: ['websocket', 'polling'],
                timeout: 10000,
                forceNew: true,
                reconnection: false, // Desabilitar reconexão automática para controlar manualmente
                reconnectionAttempts: 0,
                reconnectionDelay: 1000,
                reconnectionDelayMax: 5000,
                upgrade: true,
                rememberUpgrade: false
            });

            // Configurar eventos básicos
            this.setupBasicEvents();

            // Aguardar conexão
            return new Promise((resolve) => {
                const timeout = setTimeout(() => {
                    console.error('[ERROR] Timeout na conexão WebSocket');
                    if (this.socket) {
                        this.socket.disconnect();
                    }
                    resolve(false);
                }, 10000); // Reduzir timeout para 10 segundos

                this.socket.on('connect', () => {
                    clearTimeout(timeout);
                    this.isConnected = true;
                    this.reconnectAttempts = 0;
                    console.log('[SUCCESS] Conectado ao WebSocket Server');
                    
                    // Iniciar ping/pong
                    this.startPingPong();
                    
                    resolve(true);
                });

                this.socket.on('connect_error', (error) => {
                    clearTimeout(timeout);
                    // Log menos verboso para erros de conexão durante tentativas
                    if (error.message && error.message.includes('ERR_CONNECTION_REFUSED')) {
                        console.log(`[INFO] Servidor não disponível em ${serverUrl}`);
                    } else {
                        console.error('[ERROR] Erro de conexão WebSocket:', error.message || error);
                    }
                    
                    if (this.socket) {
                        this.socket.disconnect();
                    }
                    resolve(false);
                });

                this.socket.on('disconnect', (reason) => {
                    clearTimeout(timeout);
                    console.log('[DISCONNECT] Desconectado do WebSocket:', reason);
                    this.isConnected = false;
                    resolve(false);
                });
            });
        } catch (error) {
            console.error('[ERROR] Erro ao conectar WebSocket:', error);
            return false;
        }
    }

    /**
     * Configurar eventos básicos
     */
    setupBasicEvents() {
        // Evento de desconexão
        this.socket.on('disconnect', (reason) => {
            console.log('[DISCONNECT] Desconectado do WebSocket:', reason);
            this.isConnected = false;
            
            // Tentar reconectar automaticamente se não foi desconexão intencional
            if (reason !== 'io client disconnect') {
                this.scheduleReconnect();
            }
        });

        this.socket.on('reconnect', () => {
            console.log('[RECONNECT] Reconectado ao WebSocket');
            this.isConnected = true;
            this.reconnectAttempts = 0;
            
            // Re-autenticar após reconexão
            if (this.currentUser) {
                this.authenticate(this.currentUser.id, this.currentUser.username, this.currentUser.displayName);
            }
        });

        this.socket.on('reconnect_error', (error) => {
            console.error('[ERROR] Erro de reconexão:', error);
        });

        // Evento de pong
        this.socket.on('pong', () => {
            // Conexão ativa confirmada
        });

        // Eventos de agendamento
        this.socket.on('agendamento:update', (data) => {
            this.handleAgendamentoUpdate(data);
        });

        this.socket.on('agendamento:shared', (data) => {
            this.handleAgendamentoShared(data);
        });

        this.socket.on('agendamento:broadcast', (data) => {
            this.handleAgendamentoBroadcast(data);
        });

        // Eventos de notificação
        this.socket.on('notification:received', (data) => {
            this.handleNotificationReceived(data);
        });

        this.socket.on('notification:read', (data) => {
            this.handleNotificationRead(data);
        });

        // Eventos de usuário
        this.socket.on('user:connected', (data) => {
            this.handleUserConnected(data);
        });

        this.socket.on('user:disconnected', (data) => {
            this.handleUserDisconnected(data);
        });

        // Eventos de sincronização
        this.socket.on('sync:response', (data) => {
            this.handleSyncResponse(data);
        });

        this.socket.on('sync:broadcast', (data) => {
            this.handleSyncBroadcast(data);
        });

        // Eventos de status
        this.socket.on('status:updated', (data) => {
            this.handleStatusUpdated(data);
        });

        this.socket.on('status:completed', (data) => {
            this.handleStatusCompleted(data);
        });

        this.socket.on('status:cancelled', (data) => {
            this.handleStatusCancelled(data);
        });

        // Eventos de busca
        this.socket.on('search:results', (data) => {
            this.handleSearchResults(data);
        });

        // Evento de autenticação
        this.socket.on('authenticated', (data) => {
            this.handleAuthenticated(data);
        });

        this.socket.on('authentication:error', (data) => {
            console.error('[ERROR] Erro de autenticação:', data.message);
        });
    }

    /**
     * Autenticar usuário
     */
    authenticate(userId, userName, displayName) {
        if (!this.isConnected) {
            console.warn('Não conectado ao WebSocket');
            return false;
        }

        this.userId = userId;
        this.userName = userName;
        this.displayName = displayName;

        this.socket.emit('authenticate', {
            userId,
            userName,
            displayName
        });

        return true;
    }

    /**
     * Enviar atualização de agendamento
     */
    sendAgendamentoUpdate(action, agendamento) {
        if (!this.isConnected) return false;

        this.socket.emit(`agendamento:${action}`, {
            agendamento,
            userId: this.userId,
            timestamp: new Date()
        });

        return true;
    }

    /**
     * Transferir agendamento
     */
    shareAgendamento(toUserId, agendamento, message = '') {
        if (!this.isConnected) return false;

        this.socket.emit('agendamento:shared', {
            toUserId,
            agendamento,
            fromUser: {
                userId: this.userId,
                userName: this.userName,
                displayName: this.displayName
            },
            message
        });

        return true;
    }

    /**
     * Enviar notificação
     */
    sendNotification(toUserId, notification) {
        if (!this.isConnected) return false;

        this.socket.emit('notification:send', {
            toUserId,
            notification
        });

        return true;
    }

    /**
     * Marcar notificação como lida
     */
    markNotificationAsRead(notificationId) {
        if (!this.isConnected) return false;

        this.socket.emit('notification:read', {
            notificationId,
            userId: this.userId
        });

        return true;
    }

    /**
     * Solicitar sincronização
     */
    requestSync() {
        if (!this.isConnected) return false;

        this.socket.emit('sync:request');
        return true;
    }

    /**
     * Enviar consulta de busca
     */
    sendSearchQuery(query, filters = {}) {
        if (!this.isConnected) return false;

        this.socket.emit('search:query', {
            query,
            filters
        });

        return true;
    }

    /**
     * Registrar manipulador de evento
     */
    on(event, handler) {
        if (!this.eventHandlers.has(event)) {
            this.eventHandlers.set(event, []);
        }
        this.eventHandlers.get(event).push(handler);
    }

    /**
     * Remover manipulador de evento
     */
    off(event, handler) {
        if (this.eventHandlers.has(event)) {
            const handlers = this.eventHandlers.get(event);
            const index = handlers.indexOf(handler);
            if (index > -1) {
                handlers.splice(index, 1);
            }
        }
    }

    /**
     * Emitir evento para manipuladores registrados
     */
    emit(event, data) {
        if (!this.isConnected) {
            console.warn('[WARNING] Não conectado ao WebSocket');
            return false;
        }

        if (this.eventHandlers.has(event)) {
            this.eventHandlers.get(event).forEach(handler => {
                try {
                    handler(data);
                } catch (error) {
                    console.error(`[ERROR] Erro no manipulador de evento ${event}:`, error);
                }
            });
        }
    }

    /**
     * Manipular atualização de agendamento
     */
    handleAgendamentoUpdate(data) {
        console.log(`[APPOINTMENT] Agendamento ${data.action}:`, data.agendamento?.id);
        
        // Emitir evento personalizado para o sistema principal
        if (window.updateAgendamentoFromWebSocket) {
            window.updateAgendamentoFromWebSocket(data);
        }
    }

    /**
     * Manipular agendamento transferido
     */
    handleAgendamentoShared(data) {
        console.log(`[SHARE] Agendamento transferido de ${data.fromUser.displayName}`);
        
        // Adicionar agendamento transferido ao sistema
        if (window.addSharedAgendamento) {
            window.addSharedAgendamento(data.agendamento, data.fromUser);
        }
        
        // Mostrar notificação
        if (window.showToast) {
            window.showToast(
                `Agendamento transferido por ${data.fromUser.displayName}`,
                'info'
            );
        }
    }

    /**
     * Manipular broadcast de agendamento (notificação para todos os usuários)
     */
    handleAgendamentoBroadcast(data) {
        console.log(`[BROADCAST] Novo agendamento criado por ${data.createdBy.displayName}`);
        
        // Não processar se for o próprio usuário que criou
        if (data.createdBy.userId === this.userId) {
            return;
        }
        
        // Tocar notificação sonora única para todos os usuários conectados
        if (!window.soundMuted) {
            // Tocar som de notificação
            if (window.soundManager) {
                window.soundManager.playAlert();
            }
        }
        
        // Mostrar notificação visual
        if (window.showToast) {
            window.showToast(
                `Novo agendamento criado por ${data.createdBy.displayName}`,
                'info'
            );
        }
        
        // Recarregar agendamentos para mostrar o novo
        if (window.loadAgendamentos) {
            setTimeout(() => {
                window.loadAgendamentos();
            }, 1000);
        }
    }

    /**
     * Manipular notificação recebida
     */
    handleNotification(data) {
        console.log('[NOTIFICATION] Notificação recebida:', data);
        
        // Processar notificação
        if (window.processNotification) {
            window.processNotification(data);
        }
    }

    /**
     * Manipular usuário conectado
     */
    handleUserConnected(data) {
        console.log(`[USER] Usuário conectado: ${data.displayName}`);
        
        // Atualizar lista de usuários online
        if (window.updateOnlineUsers) {
            window.updateOnlineUsers(data, 'connected');
        }
    }

    /**
     * Manipular usuário desconectado
     */
    handleUserDisconnected(data) {
        console.log(`[USER] Usuário desconectado: ${data.displayName}`);
        
        // Atualizar lista de usuários online
        if (window.updateOnlineUsers) {
            window.updateOnlineUsers(data, 'disconnected');
        }
    }

    /**
     * Manipular sincronização de dados
     */
    handleDataSync(data) {
        console.log('[SYNC] Dados sincronizados');
        
        // Sincronizar dados locais
        if (window.syncLocalData) {
            window.syncLocalData(data);
        }
    }

    /**
     * Manipular broadcast de sincronização
     */
    handleSyncBroadcast(data) {
        console.log(`[SYNC] Broadcast recebido com ${data.updates?.length || 0} atualizações`);
        
        // Processar atualizações em tempo real
        if (data.updates && data.updates.length > 0) {
            data.updates.forEach(update => {
                this.processUpdate(update);
            });
        }
        
        // Emitir evento para o sistema principal
        this.emit('sync:broadcast', data);
    }

    /**
     * Processar atualização individual
     */
    processUpdate(update) {
        switch (update.type) {
            case 'agendamento':
                this.handleAgendamentoUpdate(update);
                break;
            case 'notification':
                this.handleNotificationUpdate(update);
                break;
            case 'status':
                this.handleStatusUpdate(update);
                break;
            default:
                console.log(`[UPDATE] Tipo de atualização desconhecido: ${update.type}`);
        }
    }

    /**
     * Manipular atualização de status
     */
    handleStatusUpdated(data) {
        console.log(`[STATUS] Status atualizado: ${data.newStatus} para agendamento ${data.agendamentoId}`);
        
        // Emitir evento para o sistema principal
        this.emit('status:updated', data);
        
        // Atualizar interface se disponível
        if (window.updateAgendamentoStatus) {
            window.updateAgendamentoStatus(data.agendamentoId, data.newStatus);
        }
    }

    /**
     * Manipular conclusão de agendamento
     */
    handleStatusCompleted(data) {
        console.log(`[STATUS] Agendamento ${data.agendamentoId} marcado como concluído por ${data.completedByUser}`);
        
        // Emitir evento para o sistema principal
        this.emit('status:completed', data);
        
        // Atualizar interface se disponível
        if (window.completeAgendamento) {
            window.completeAgendamento(data.agendamentoId, data.completionNotes);
        }
    }

    /**
     * Manipular cancelamento de agendamento
     */
    handleStatusCancelled(data) {
        console.log(`[STATUS] Agendamento ${data.agendamentoId} cancelado por ${data.cancelledByUser}`);
        
        // Emitir evento para o sistema principal
        this.emit('status:cancelled', data);
        
        // Atualizar interface se disponível
        if (window.cancelAgendamento) {
            window.cancelAgendamento(data.agendamentoId, data.cancelReason);
        }
    }

    /**
     * Enviar atualização de status
     */
    sendStatusUpdate(agendamentoId, newStatus, reason = '') {
        if (!this.isConnected) return false;

        this.socket.emit('status:update', {
            agendamentoId,
            newStatus,
            reason
        });

        return true;
    }

    /**
     * Marcar agendamento como concluído
     */
    sendStatusComplete(agendamentoId, completionNotes = '') {
        if (!this.isConnected) return false;

        this.socket.emit('status:complete', {
            agendamentoId,
            completionNotes
        });

        return true;
    }

    /**
     * Cancelar agendamento
     */
    sendStatusCancel(agendamentoId, cancelReason = '') {
        if (!this.isConnected) return false;

        this.socket.emit('status:cancel', {
            agendamentoId,
            cancelReason
        });

        return true;
    }

    /**
     * Forçar sincronização
     */
    forceSync() {
        if (!this.isConnected) return false;

        this.socket.emit('sync:force');
        return true;
    }

    /**
     * Manipular resultados de busca
     */
    handleSearchResults(data) {
        console.log(`[SEARCH] Resultados da busca: ${data.results.length} encontrados`);
        
        // Atualizar resultados de busca
        if (window.updateSearchResults) {
            window.updateSearchResults(data);
        }
    }

    /**
     * Manipular autenticação bem-sucedida
     */
    handleAuthSuccess(data) {
        console.log('[AUTH] Autenticado no WebSocket');
        this.isAuthenticated = true;
        
        if (this.onAuthenticated) {
            this.onAuthenticated(data);
        }
    }

    /**
     * Manipular evento de autenticação
     */
    handleAuthenticated(data) {
        console.log('[AUTH] Usuário autenticado:', data);
        this.isAuthenticated = true;
        this.userId = data.userId;
        
        // Emitir evento de autenticação
        this.emit('authenticated', data);
        
        if (this.onAuthenticated) {
            this.onAuthenticated(data);
        }
    }

    /**
     * Iniciar ping/pong para manter conexão ativa
     */
    startPingPong() {
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
        }

        this.pingInterval = setInterval(() => {
            if (this.isConnected && this.socket) {
                this.socket.emit('ping');
            }
        }, 30000); // Ping a cada 30 segundos
    }

    /**
     * Parar ping/pong
     */
    stopPingPong() {
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = null;
        }
    }

    /**
     * Agendar reconexão
     */
    scheduleReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('[ERROR] Máximo de tentativas de reconexão atingido');
            return;
        }

        this.reconnectAttempts++;
        const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
        
        console.log(`[RECONNECT] Tentativa de reconexão ${this.reconnectAttempts}/${this.maxReconnectAttempts} em ${delay}ms`);
        
        setTimeout(() => {
            if (!this.isConnected) {
                this.connect();
            }
        }, delay);
    }

    /**
     * Desconectar do WebSocket
     */
    disconnect() {
        if (this.socket) {
            console.log('[DISCONNECT] Desconectado do WebSocket');
            this.stopPingPong();
            this.socket.disconnect();
            this.isConnected = false;
            this.isAuthenticated = false;
        }
    }

    /**
     * Verificar status da conexão
     */
    getConnectionStatus() {
        return {
            isConnected: this.isConnected,
            userId: this.userId,
            userName: this.userName,
            displayName: this.displayName,
            reconnectAttempts: this.reconnectAttempts
        };
    }
}

// Instância global do cliente WebSocket
window.wsClient = new WebSocketClient();