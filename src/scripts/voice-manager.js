// Sistema de Gerenciamento de Voz (TTS - Text-to-Speech)
// Responsável por notificações por voz e síntese de fala

class VoiceManager {
    constructor() {
        this.synthesis = window.speechSynthesis;
        this.voice = null;
        this.enabled = localStorage.getItem('voiceEnabled') !== 'false';
        this.volume = 0.8; // Volume fixo
        this.rate = 0.9; // Velocidade fixa
        this.pitch = 1.0; // Tom fixo
        
        // Sistema de fila para evitar sobreposição de vozes
        this.speechQueue = [];
        this.isSpeaking = false;
        this.queueProcessing = false;
        
        this.initializeVoices();
        this.setupEventListeners();
    }
    
    initializeVoices() {
        // Aguardar carregamento das vozes
        if (this.synthesis.getVoices().length === 0) {
            this.synthesis.addEventListener('voiceschanged', () => {
                this.selectBestVoice();
            });
        } else {
            this.selectBestVoice();
        }
    }
    
    selectBestVoice() {
        const voices = this.synthesis.getVoices();
        
        // Priorizar vozes em português brasileiro
        const ptBRVoices = voices.filter(voice => 
            voice.lang.includes('pt-BR') || voice.lang.includes('pt_BR')
        );
        
        // Se não encontrar pt-BR, usar português geral
        const ptVoices = voices.filter(voice => 
            voice.lang.includes('pt') && !voice.lang.includes('pt-BR')
        );
        
        // Priorizar vozes do Google femininas
        const googleFemaleVoices = ptBRVoices.filter(voice => 
            voice.name.toLowerCase().includes('google') && 
            (voice.name.toLowerCase().includes('female') || 
             voice.name.toLowerCase().includes('feminina') ||
             voice.name.toLowerCase().includes('woman') ||
             !voice.name.toLowerCase().includes('male'))
        );
        
        // Fallback para vozes em inglês
        const enVoices = voices.filter(voice => 
            voice.lang.includes('en')
        );
        
        // Selecionar automaticamente a voz Google feminina
        if (googleFemaleVoices.length > 0) {
            this.voice = googleFemaleVoices[0];
        } else if (ptBRVoices.length > 0) {
            this.voice = ptBRVoices[0];
        } else if (ptVoices.length > 0) {
            this.voice = ptVoices[0];
        } else if (enVoices.length > 0) {
            this.voice = enVoices[0];
        } else {
            this.voice = voices[0] || null;
        }
        
        console.log('[VoiceManager] Voz selecionada automaticamente:', this.voice?.name, this.voice?.lang);
    }
    
    setupEventListeners() {
        document.addEventListener('DOMContentLoaded', () => {
            const voiceToggle = document.getElementById('voiceEnabled');
            
            if (voiceToggle) {
                voiceToggle.checked = this.enabled;
                voiceToggle.addEventListener('change', (e) => {
                    this.enabled = e.target.checked;
                    localStorage.setItem('voiceEnabled', this.enabled);
                    console.log('[VoiceManager] Voz', this.enabled ? 'habilitada' : 'desabilitada');
                });
            }
            
            // Nota: Controles de seleção de voz, volume, velocidade e tom foram removidos
            // A voz agora é automaticamente definida como Google feminina com configurações fixas
        });
    }
    
    // Função populateVoiceSelect removida - seleção de voz agora é automática
    
    /**
     * Adicionar fala à fila com prioridade
     */
    addToQueue(text, options = {}) {
        console.log('[VoiceManager] addToQueue chamado:', {
            text,
            enabled: this.enabled,
            synthesis: !!this.synthesis,
            forceSpeak: options.forceSpeak,
            priority: options.priority
        });
        
        // Permitir teste mesmo com TTS desabilitado
        if ((!this.enabled && !options.forceSpeak) || !this.synthesis) {
            console.log('[VoiceManager] TTS desabilitado ou não suportado');
            if (!this.synthesis) {
                console.warn('[VoiceManager] Speech Synthesis não está disponível neste navegador');
            }
            return;
        }
        
        const queueItem = {
            id: `speech_${Date.now()}_${Math.random()}`,
            text,
            options,
            priority: options.priority || 0, // 0 = normal, 1 = alta, 2 = urgente
            timestamp: new Date()
        };
        
        // Inserir na fila baseado na prioridade
        if (queueItem.priority > 0) {
            // Encontrar posição para inserir item prioritário
            let insertIndex = 0;
            for (let i = 0; i < this.speechQueue.length; i++) {
                if (this.speechQueue[i].priority < queueItem.priority) {
                    insertIndex = i;
                    break;
                }
                insertIndex = i + 1;
            }
            this.speechQueue.splice(insertIndex, 0, queueItem);
        } else {
            this.speechQueue.push(queueItem);
        }
        
        console.log(`[VoiceManager] Adicionado à fila: "${text}" (Prioridade: ${queueItem.priority}, Fila: ${this.speechQueue.length} itens)`);
        
        // Iniciar processamento da fila se não estiver rodando
        if (!this.queueProcessing) {
            this.processQueue();
        }
    }
    
    /**
     * Processar fila de fala sequencialmente
     */
    async processQueue() {
        if (this.queueProcessing || this.speechQueue.length === 0) {
            return;
        }
        
        this.queueProcessing = true;
        console.log(`[VoiceManager] Iniciando processamento da fila (${this.speechQueue.length} itens)`);
        
        while (this.speechQueue.length > 0) {
            const queueItem = this.speechQueue.shift();
            
            try {
                await this.speakItem(queueItem);
                
                // Aguardar um pequeno intervalo entre falas para melhor clareza
                if (this.speechQueue.length > 0) {
                    const delayTime = queueItem.priority > 0 ? 300 : 500;
                    await this.delay(delayTime);
                }
                
            } catch (error) {
                console.error(`[VoiceManager] Erro ao processar item da fila:`, error);
            }
        }
        
        this.queueProcessing = false;
        console.log('[VoiceManager] Fila processada completamente');
    }
    
    /**
     * Falar um item específico da fila
     */
    speakItem(queueItem) {
        return new Promise((resolve, reject) => {
            console.log(`[VoiceManager] Falando: "${queueItem.text}" (Prioridade: ${queueItem.priority})`);
            
            // Cancelar qualquer fala em andamento
            this.synthesis.cancel();
            
            const utterance = new SpeechSynthesisUtterance(queueItem.text);
            
            // Configurações da fala
            utterance.voice = this.voice;
            utterance.volume = queueItem.options.volume || this.volume;
            utterance.rate = queueItem.options.rate || this.rate;
            utterance.pitch = queueItem.options.pitch || this.pitch;
            utterance.lang = this.voice?.lang || 'pt-BR';
            
            // Eventos
            utterance.onstart = () => {
                this.isSpeaking = true;
                console.log(`[VoiceManager] Iniciado: "${queueItem.text}"`);
            };
            
            utterance.onend = () => {
                this.isSpeaking = false;
                console.log(`[VoiceManager] Finalizado: "${queueItem.text}"`);
                resolve();
            };
            
            utterance.onerror = (event) => {
                this.isSpeaking = false;
                console.error(`[VoiceManager] Erro ao falar:`, event.error);
                reject(event.error);
            };
            
            // Falar
            this.synthesis.speak(utterance);
        });
    }
    
    /**
     * Delay utilitário
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    /**
     * Método público para falar (agora usa fila)
     */
    speak(text, options = {}) {
        // Permitir teste de voz mesmo com som desligado
        if (window.soundMuted && !options.forceSpeak) return;
        
        // Para notificações de atraso, verificar duplicatas mais específicas
        if (text.includes('atrasado')) {
            // Verificar se há uma notificação idêntica na fila (mesmo texto exato)
            const duplicateExists = this.speechQueue.some(item => item.text === text);
            if (duplicateExists) {
                console.log('[VoiceManager] Notificação de atraso idêntica ignorada:', text);
                return;
            }
            
            // Limpar notificações de atraso antigas da fila (mais de 30 segundos)
            const now = new Date();
            this.speechQueue = this.speechQueue.filter(item => {
                if (item.text.includes('atrasado')) {
                    const age = now - item.timestamp;
                    return age < 30000; // Manter apenas itens de menos de 30 segundos
                }
                return true;
            });
        }
        
        this.addToQueue(text, options);
    }
    
    /**
     * Falar com diferentes prioridades
     */
    speakNormal(text, options = {}) {
        this.addToQueue(text, { ...options, priority: 0 });
    }
    
    speakHigh(text, options = {}) {
        this.addToQueue(text, { ...options, priority: 1 });
    }
    
    speakUrgent(text, options = {}) {
        this.addToQueue(text, { ...options, priority: 2 });
    }
    
    /**
     * Parar fala
     */
    stop() {
        this.synthesis.cancel();
        this.speechQueue = [];
        this.isSpeaking = false;
        this.queueProcessing = false;
        console.log('[VoiceManager] Fala parada e fila limpa');
    }
    
    stopImmediately() {
        this.stop();
        console.log('Notificações de voz paradas devido ao som desligado');
    }
    
    pause() {
        if (this.synthesis) {
            this.synthesis.pause();
            console.log('[VoiceManager] Fala pausada');
        }
    }
    
    resume() {
        if (this.synthesis) {
            this.synthesis.resume();
            console.log('[VoiceManager] Fala retomada');
        }
    }
    
    /**
     * Controle de estado e volume
     */
    setEnabled(enabled) {
        this.enabled = enabled;
        localStorage.setItem('voiceEnabled', enabled);
        console.log('[VoiceManager] TTS', enabled ? 'habilitado' : 'desabilitado');
    }
    
    setVolume(volume) {
        this.volume = Math.max(0, Math.min(1, volume));
        localStorage.setItem('voiceVolume', this.volume * 100);
        console.log('[VoiceManager] Volume alterado para:', this.volume);
    }
    
    isEnabled() {
        return this.enabled;
    }
    
    getVolume() {
        return this.volume;
    }
    
    /**
     * Métodos específicos para diferentes tipos de notificação
     */
    speakAgendamentoCriado(nomeCliente, horario, cidade) {
        const horarioLocal = this.formatTimeForSpeech(horario, cidade);
        let text = `Novo agendamento criado para ${nomeCliente} às ${horarioLocal}`;
        
        // Adicionar informação da cidade e fuso horário se for Aquidauana
        if (window.timezoneManager && window.timezoneManager.hasDifferentTimezone(cidade)) {
            text += ` em ${cidade}, horário local`;
        } else {
            text += ` em ${cidade}`;
        }
        
        this.speak(text, { priority: 0 });
    }
    
    speakAgendamentoConcluido(nomeCliente) {
        const text = `Agendamento de ${nomeCliente} foi concluído com sucesso`;
        this.speak(text, { priority: 0 });
    }
    
    speakAgendamentoProximo(nomeCliente, horario, cidade, minutosRestantes) {
        const horarioLocal = this.formatTimeForSpeech(horario, cidade);
        let text;
        
        const cidadeInfo = window.timezoneManager && window.timezoneManager.hasDifferentTimezone(cidade) 
            ? `${cidade}, horário local` 
            : cidade;
        
        if (minutosRestantes <= 0) {
            text = `Agendamento de ${nomeCliente} às ${horarioLocal} em ${cidadeInfo} está começando agora`;
        } else if (minutosRestantes <= 5) {
            text = `Agendamento de ${nomeCliente} às ${horarioLocal} em ${cidadeInfo} em ${minutosRestantes} minutos`;
        } else {
            text = `Próximo agendamento: ${nomeCliente} às ${horarioLocal} em ${cidadeInfo} em ${minutosRestantes} minutos`;
        }
        this.speak(text, { priority: 1 });
    }
    
    speakAgendamentoAtrasado(nomeCliente, horario, cidade, minutosAtraso) {
        console.log('[VoiceManager] speakAgendamentoAtrasado chamado:', {
            nomeCliente,
            horario,
            cidade,
            minutosAtraso,
            enabled: this.enabled,
            synthesis: !!this.synthesis
        });
        
        const horarioLocal = this.formatTimeForSpeech(horario, cidade);
        const cidadeInfo = window.timezoneManager && window.timezoneManager.hasDifferentTimezone(cidade) 
            ? `${cidade}, horário local` 
            : cidade;
        
        const tempoFormatado = this.formatMinutesForSpeech(minutosAtraso);
        const text = `Atenção! Agendamento de ${nomeCliente} às ${horarioLocal} em ${cidadeInfo} está atrasado em ${tempoFormatado}`;
        
        console.log('[VoiceManager] Texto a ser falado:', text);
        
        // Mostrar notificação nativa do Windows
        this.showNativeNotification({
            cliente: nomeCliente,
            horario: horario,
            cidade: cidade,
            minutosAtraso: minutosAtraso
        });
        
        this.speakUrgent(text, { 
            volume: Math.min(this.volume + 0.2, 1)
        });
    }
    
    speakAgendamentoAtualizado(nomeCliente, horario, cidade) {
        const horarioLocal = this.formatTimeForSpeech(horario, cidade);
        const cidadeInfo = window.timezoneManager && window.timezoneManager.hasDifferentTimezone(cidade) 
            ? `${cidade}, horário local` 
            : cidade;
        
        const text = `Agendamento de ${nomeCliente} foi atualizado para ${horarioLocal} em ${cidadeInfo}`;
        this.speak(text, { priority: 0 });
    }
    
    // Método para mostrar notificação nativa do Windows
    async showNativeNotification(agendamento) {
        if (!window.ipcRenderer) {
            console.warn('[VoiceManager] ipcRenderer não disponível para notificações nativas');
            return;
        }
        
        try {
            const title = 'Agendamento Atrasado!';
            const body = `${agendamento.cliente} - ${agendamento.cidade}\nHorário: ${agendamento.horario}\nAtraso: ${agendamento.minutosAtraso} minutos`;
            
            const result = await window.ipcRenderer.invoke('showNativeNotification', {
                title: title,
                body: body,
                options: {
                    urgency: 'critical',
                    sound: true,
                    timeoutType: 'never'
                }
            });
            
            if (result.success) {
                console.log('[VoiceManager] Notificação nativa exibida com sucesso');
            } else {
                console.warn('[VoiceManager] Falha ao exibir notificação nativa');
            }
        } catch (error) {
            console.error('[VoiceManager] Erro ao exibir notificação nativa:', error);
        }
    }
    
    speakAgendamentoCancelado(nomeCliente) {
        const text = `Agendamento de ${nomeCliente} foi cancelado`;
        this.speak(text, { priority: 1 });
    }
    

    
    /**
     * Formatação de tempo para fala
     */
    formatMinutesForSpeech(minutes) {
        if (minutes === 1) {
            return '1 minuto';
        } else if (minutes < 60) {
            return `${minutes} minutos`;
        } else {
            const hours = Math.floor(minutes / 60);
            const remainingMinutes = minutes % 60;
            
            let result = hours === 1 ? '1 hora' : `${hours} horas`;
            
            if (remainingMinutes > 0) {
                result += remainingMinutes === 1 ? ' e 1 minuto' : ` e ${remainingMinutes} minutos`;
            }
            
            return result;
        }
    }
    
    formatTimeForSpeech(time) {
        const [hours, minutes] = time.split(':');
        const hoursInt = parseInt(hours);
        const minutesInt = parseInt(minutes);
        
        let timeText = '';
        
        if (hoursInt === 0) {
            timeText = 'meia-noite';
        } else if (hoursInt === 12) {
            timeText = 'meio-dia';
        } else if (hoursInt < 12) {
            timeText = `${hoursInt} da manhã`;
        } else {
            timeText = `${hoursInt - 12} da tarde`;
        }
        
        if (minutesInt > 0) {
            timeText += ` e ${minutesInt} minutos`;
        }
        
        return timeText;
    }
    
    formatDateForSpeech(date) {
        const dateObj = new Date(date + 'T00:00:00');
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        const dateString = dateObj.toDateString();
        const todayString = today.toDateString();
        const tomorrowString = tomorrow.toDateString();
        
        if (dateString === todayString) {
            return 'hoje';
        } else if (dateString === tomorrowString) {
            return 'amanhã';
        } else {
            return dateObj.toLocaleDateString('pt-BR');
        }
    }
    
    /**
     * Formatar horário para fala considerando fuso horário da cidade
     */
    formatTimeForSpeech(horario, cidade) {
        if (!window.timezoneManager || !cidade) {
            return horario;
        }
        
        // Se a cidade tem fuso horário diferente, usar o horário local
        if (window.timezoneManager.hasDifferentTimezone(cidade)) {
            const horarioLocal = window.timezoneManager.formatTimeWithTimezone(horario, cidade);
            // Remover a indicação de fuso horário para a fala (ex: "14:30 (Aquidauana)" -> "14:30")
            return horarioLocal.split(' ')[0];
        }
        
        return horario;
    }
}

// Instância global do VoiceManager
const voiceManager = new VoiceManager();

// Exportar para uso em outros scripts
window.voiceManager = voiceManager;
window.ttsManager = voiceManager; // Compatibilidade com código existente

// Funções globais para compatibilidade
window.speakText = (text, options) => voiceManager.speak(text, options);

// Notificações específicas do sistema
window.TTSNotifications = {
    agendamentoCriado: (nomeCliente, horario, cidade) => voiceManager.speakAgendamentoCriado(nomeCliente, horario, cidade),
    agendamentoConcluido: (nomeCliente) => voiceManager.speakAgendamentoConcluido(nomeCliente),
    agendamentoProximo: (nomeCliente, minutosRestantes) => voiceManager.speakAgendamentoProximo(nomeCliente, minutosRestantes),
    agendamentoAtrasado: (nomeCliente, minutosAtraso) => voiceManager.speakAgendamentoAtrasado(nomeCliente, minutosAtraso),
    agendamentoAtualizado: (nomeCliente) => voiceManager.speakAgendamentoAtualizado(nomeCliente),
    agendamentoCancelado: (nomeCliente) => voiceManager.speakAgendamentoCancelado(nomeCliente)
};

console.log('[VoiceManager] Sistema de voz inicializado');