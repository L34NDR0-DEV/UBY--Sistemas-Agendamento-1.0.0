/**
 * Sistema de Lembretes para Agendamentos
 * Responsável por verificar agendamentos próximos e disparar alertas de voz
 */

class ReminderSystem {
    constructor() {
        this.isActive = false;
        this.checkInterval = null;
        this.checkIntervalTime = 30000; // 30 segundos
        this.reminderTimes = [30, 15, 10, 5, 2, 1]; // minutos antes do agendamento
        this.notifiedReminders = new Set(); // Para evitar notificações duplicadas
        
        console.log('[ReminderSystem] Sistema de lembretes inicializado');
    }

    /**
     * Inicia o sistema de verificação de lembretes
     */
    startChecking() {
        if (this.isActive) {
            console.log('[ReminderSystem] Sistema já está ativo');
            return;
        }

        this.isActive = true;
        console.log('[ReminderSystem] Iniciando verificação de lembretes...');
        
        // Verificação imediata
        this.checkReminders();
        
        // Configurar verificação periódica
        this.checkInterval = setInterval(() => {
            this.checkReminders();
        }, this.checkIntervalTime);
        
        console.log(`[ReminderSystem] Verificação periódica configurada a cada ${this.checkIntervalTime/1000} segundos`);
    }

    /**
     * Para o sistema de verificação de lembretes
     */
    stopChecking() {
        if (!this.isActive) {
            return;
        }

        this.isActive = false;
        
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
        
        console.log('[ReminderSystem] Sistema de lembretes parado');
    }

    /**
     * Verifica agendamentos próximos e dispara lembretes
     */
    checkReminders() {
        if (!window.agendamentos || !Array.isArray(window.agendamentos)) {
            console.log('[ReminderSystem] Nenhum agendamento disponível para verificação');
            return;
        }

        const now = new Date();
        const today = now.toISOString().split('T')[0];
        
        console.log(`[ReminderSystem] Verificando ${window.agendamentos.length} agendamentos para lembretes...`);
        
        window.agendamentos.forEach(agendamento => {
            // Só verificar agendamentos de hoje que não estão concluídos ou cancelados
            if (agendamento.data === today && 
                agendamento.status !== 'Concluído' && 
                agendamento.status !== 'Cancelado') {
                
                this.checkAppointmentReminder(agendamento, now);
            }
        });
        
        // Também verificar agendamentos atrasados
        this.checkDelayedAppointments();
    }

    /**
     * Verifica se um agendamento específico precisa de lembrete
     */
    checkAppointmentReminder(agendamento, currentTime) {
        try {
            // Criar data/hora do agendamento
            let appointmentDateTime, adjustedCurrentTime;
            
            if (window.timezoneManager && agendamento.cidade && 
                window.timezoneManager.hasDifferentTimezone(agendamento.cidade)) {
                // Para cidades com fuso diferente
                appointmentDateTime = new Date(`${agendamento.data}T${agendamento.horario}:00`);
                adjustedCurrentTime = window.timezoneManager.adjustDateTime(currentTime, agendamento.cidade, true);
            } else {
                // Para outras cidades (horário de Brasília)
                appointmentDateTime = new Date(`${agendamento.data}T${agendamento.horario}:00`);
                adjustedCurrentTime = currentTime;
            }
            
            // Calcular diferença em minutos
            const timeDiff = appointmentDateTime - adjustedCurrentTime;
            const minutesUntil = Math.floor(timeDiff / (1000 * 60));
            
            // Verificar se precisa de lembrete
            if (minutesUntil > 0 && this.reminderTimes.includes(minutesUntil)) {
                const reminderKey = `${agendamento.id}_${minutesUntil}`;
                
                // Evitar notificações duplicadas
                if (!this.notifiedReminders.has(reminderKey)) {
                    this.notifiedReminders.add(reminderKey);
                    this.sendReminder(agendamento, minutesUntil);
                    
                    console.log(`[ReminderSystem] Lembrete enviado: ${agendamento.nomeCliente} em ${minutesUntil} minutos`);
                }
            }
            
            // Limpar lembretes antigos (mais de 2 horas atrás)
            if (minutesUntil < -120) {
                this.cleanupOldReminders(agendamento.id);
            }
            
        } catch (error) {
            console.error('[ReminderSystem] Erro ao verificar lembrete:', error, agendamento);
        }
    }

    /**
     * Envia lembrete de agendamento próximo
     */
    sendReminder(agendamento, minutesUntil) {
        console.log(`[ReminderSystem] Enviando lembrete: ${agendamento.nomeCliente} em ${minutesUntil} minutos`);
        
        // Verificar se é agendamento de Aquidauana
        const isAquidauana = this.isAquidauanaAppointment(agendamento);
        
        if (isAquidauana && window.voiceManagerAquidauana && window.voiceManagerAquidauana.isEnabled()) {
            // Usar sistema de voz especializado para Aquidauana
            window.voiceManagerAquidauana.speakAgendamentoAquidauanaProximo(
                agendamento.nomeCliente,
                agendamento.horario,
                minutesUntil
            );
            
            console.log(`[ReminderSystem] Alerta de voz AQUIDAUANA enviado para ${agendamento.nomeCliente}`);
        } else if (window.voiceManager && window.voiceManager.isEnabled()) {
            // Usar sistema de voz padrão para outras cidades
            window.voiceManager.speakAgendamentoProximo(
                agendamento.nomeCliente,
                agendamento.horario,
                agendamento.cidade,
                minutesUntil
            );
            
            console.log(`[ReminderSystem] Alerta de voz padrão enviado para ${agendamento.nomeCliente}`);
        } else {
            console.warn('[ReminderSystem] Sistema de voz não disponível ou desabilitado');
        }
        
        // Tocar som de lembrete se disponível
        if (window.soundManager && !window.soundMuted) {
            window.soundManager.playReminder({
                volume: isAquidauana ? 0.9 : 0.7, // Volume mais alto para Aquidauana
                priority: minutesUntil <= 5 ? 'high' : 'normal'
            });
        }
    }

    /**
     * Limpa lembretes antigos de um agendamento
     */
    cleanupOldReminders(appointmentId) {
        const keysToRemove = [];
        
        this.notifiedReminders.forEach(key => {
            if (key.startsWith(`${appointmentId}_`)) {
                keysToRemove.push(key);
            }
        });
        
        keysToRemove.forEach(key => {
            this.notifiedReminders.delete(key);
        });
        
        if (keysToRemove.length > 0) {
            console.log(`[ReminderSystem] Limpeza: removidos ${keysToRemove.length} lembretes antigos`);
        }
    }

    /**
     * Limpa todos os lembretes notificados
     */
    clearAllReminders() {
        this.notifiedReminders.clear();
        console.log('[ReminderSystem] Todos os lembretes foram limpos');
    }

    /**
     * Configura os tempos de lembrete (em minutos)
     */
    setReminderTimes(times) {
        if (Array.isArray(times) && times.every(t => typeof t === 'number' && t > 0)) {
            this.reminderTimes = times.sort((a, b) => b - a); // Ordem decrescente
            console.log('[ReminderSystem] Tempos de lembrete atualizados:', this.reminderTimes);
        } else {
            console.error('[ReminderSystem] Tempos de lembrete inválidos:', times);
        }
    }

    /**
     * Configura o intervalo de verificação
     */
    setCheckInterval(intervalMs) {
        if (typeof intervalMs === 'number' && intervalMs >= 5000) {
            this.checkIntervalTime = intervalMs;
            
            // Reiniciar se estiver ativo
            if (this.isActive) {
                this.stopChecking();
                this.startChecking();
            }
            
            console.log(`[ReminderSystem] Intervalo de verificação atualizado: ${intervalMs/1000} segundos`);
        } else {
            console.error('[ReminderSystem] Intervalo inválido (mínimo 5 segundos):', intervalMs);
        }
    }

    /**
     * Retorna status do sistema
     */
    getStatus() {
        return {
            isActive: this.isActive,
            checkIntervalTime: this.checkIntervalTime,
            reminderTimes: this.reminderTimes,
            notifiedCount: this.notifiedReminders.size
        };
    }

    /**
     * Força verificação imediata (para debug)
     */
    forceCheck() {
        console.log('[ReminderSystem] Verificação forçada iniciada');
        this.checkReminders();
    }
    
    /**
     * Verifica se um agendamento é da cidade de Aquidauana
     */
    isAquidaunaAppointment(agendamento) {
        if (!agendamento || !agendamento.cidade) {
            return false;
        }
        
        const cidade = agendamento.cidade.toLowerCase().trim();
        return cidade === 'aquidauana' || cidade.includes('aquidauana');
    }
    
    /**
     * Verifica agendamentos atrasados e envia alertas específicos
     */
    checkDelayedAppointments() {
        if (!window.agendamentos || !Array.isArray(window.agendamentos)) {
            return;
        }
        
        const now = new Date();
        const today = now.toISOString().split('T')[0];
        
        window.agendamentos.forEach(agendamento => {
            // Só verificar agendamentos de hoje que não estão concluídos ou cancelados
            if (agendamento.data === today && 
                agendamento.status !== 'Concluído' && 
                agendamento.status !== 'Cancelado') {
                
                this.checkAppointmentDelay(agendamento, now);
            }
        });
    }
    
    /**
     * Verifica se um agendamento específico está atrasado
     */
    checkAppointmentDelay(agendamento, currentTime) {
        try {
            // Criar data/hora do agendamento
            let appointmentDateTime, adjustedCurrentTime;
            
            if (window.timezoneManager && agendamento.cidade && 
                window.timezoneManager.hasDifferentTimezone(agendamento.cidade)) {
                appointmentDateTime = new Date(`${agendamento.data}T${agendamento.horario}:00`);
                adjustedCurrentTime = window.timezoneManager.adjustDateTime(currentTime, agendamento.cidade, true);
            } else {
                appointmentDateTime = new Date(`${agendamento.data}T${agendamento.horario}:00`);
                adjustedCurrentTime = currentTime;
            }
            
            // Calcular atraso em minutos
            const timeDiff = adjustedCurrentTime - appointmentDateTime;
            const minutesLate = Math.floor(timeDiff / (1000 * 60));
            
            // Se está atrasado (mais de 5 minutos)
            if (minutesLate > 5) {
                const delayKey = `${agendamento.id}_delay_${Math.floor(minutesLate / 10) * 10}`; // Agrupar por intervalos de 10 min
                
                // Evitar notificações duplicadas
                if (!this.notifiedReminders.has(delayKey)) {
                    this.notifiedReminders.add(delayKey);
                    this.sendDelayAlert(agendamento, minutesLate);
                    
                    console.log(`[ReminderSystem] Alerta de atraso enviado: ${agendamento.nomeCliente} - ${minutesLate} minutos`);
                }
            }
            
        } catch (error) {
            console.error('[ReminderSystem] Erro ao verificar atraso:', error, agendamento);
        }
    }
    
    /**
     * Envia alerta de agendamento atrasado
     */
    sendDelayAlert(agendamento, minutesLate) {
        console.log(`[ReminderSystem] Enviando alerta de atraso: ${agendamento.nomeCliente} - ${minutesLate} minutos`);
        
        // Verificar se é agendamento de Aquidauana
        const isAquidauana = this.isAquidaunaAppointment(agendamento);
        
        if (isAquidauana && window.voiceManagerAquidauana && window.voiceManagerAquidauana.isEnabled()) {
            // Usar sistema de voz especializado para Aquidauana
            window.voiceManagerAquidauana.speakAgendamentoAquidauanaAtrasado(
                agendamento.nomeCliente,
                agendamento.horario,
                minutesLate
            );
            
            console.log(`[ReminderSystem] Alerta de ATRASO AQUIDAUANA enviado para ${agendamento.nomeCliente}`);
        } else if (window.voiceManager && window.voiceManager.isEnabled()) {
            // Usar sistema de voz padrão para outras cidades
            window.voiceManager.speakAgendamentoAtrasado(
                agendamento.nomeCliente,
                agendamento.horario,
                agendamento.cidade,
                minutesLate
            );
            
            console.log(`[ReminderSystem] Alerta de atraso padrão enviado para ${agendamento.nomeCliente}`);
        }
        
        // Tocar som de alerta se disponível
        if (window.soundManager && !window.soundMuted) {
            window.soundManager.playAlert({
                volume: isAquidauana ? 1.0 : 0.8, // Volume máximo para Aquidauana
                priority: 'urgent'
            });
        }
    }
}

// Criar instância global
const reminderSystem = new ReminderSystem();

// Exportar para uso global
window.reminderSystem = reminderSystem;

// Funções de compatibilidade
window.startReminderSystem = () => reminderSystem.startChecking();
window.stopReminderSystem = () => reminderSystem.stopChecking();
window.checkReminders = () => reminderSystem.checkReminders();

console.log('[ReminderSystem] Sistema de lembretes carregado e disponível globalmente');