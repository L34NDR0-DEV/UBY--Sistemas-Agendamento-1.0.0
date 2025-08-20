// Sistema de Voz Especializado para Aquidauana
// Utiliza voz feminina do Google com mensagens personalizadas

class VoiceManagerAquidauana {
    constructor() {
        this.synthesis = window.speechSynthesis;
        this.voice = null;
        this.enabled = localStorage.getItem('voiceAquidauanaEnabled') !== 'false';
        this.volume = 0.9; // Volume mais alto para Aquidauana
        this.rate = 0.8; // Velocidade mais lenta para clareza
        this.pitch = 1.1; // Tom ligeiramente mais agudo para voz feminina
        
        // Sistema de fila específico para Aquidauana
        this.speechQueue = [];
        this.isSpeaking = false;
        this.queueProcessing = false;
        
        // Cache de notificações para evitar duplicatas
        this.notificationCache = new Map();
        
        this.initializeAquidauanaVoice();
        this.setupEventListeners();
    }
    
    initializeAquidauanaVoice() {
        // Aguardar carregamento das vozes
        if (this.synthesis.getVoices().length === 0) {
            this.synthesis.addEventListener('voiceschanged', () => {
                this.selectGoogleFemaleVoice();
            });
        } else {
            this.selectGoogleFemaleVoice();
        }
    }
    
    selectGoogleFemaleVoice() {
        const voices = this.synthesis.getVoices();
        
        // Priorizar especificamente vozes femininas do Google em português
        const googleFemaleVoices = voices.filter(voice => {
            const name = voice.name.toLowerCase();
            const lang = voice.lang.toLowerCase();
            
            return (
                (lang.includes('pt-br') || lang.includes('pt_br') || lang.includes('pt')) &&
                name.includes('google') &&
                (
                    name.includes('female') ||
                    name.includes('feminina') ||
                    name.includes('woman') ||
                    name.includes('mulher') ||
                    (!name.includes('male') && !name.includes('masculino'))
                )
            );
        });
        
        // Fallback para vozes femininas em português (não Google)
        const ptFemaleVoices = voices.filter(voice => {
            const name = voice.name.toLowerCase();
            const lang = voice.lang.toLowerCase();
            
            return (
                (lang.includes('pt-br') || lang.includes('pt_br') || lang.includes('pt')) &&
                (
                    name.includes('female') ||
                    name.includes('feminina') ||
                    name.includes('woman') ||
                    name.includes('mulher') ||
                    (!name.includes('male') && !name.includes('masculino'))
                )
            );
        });
        
        // Fallback para qualquer voz do Google em português
        const googlePtVoices = voices.filter(voice => {
            const name = voice.name.toLowerCase();
            const lang = voice.lang.toLowerCase();
            
            return (
                (lang.includes('pt-br') || lang.includes('pt_br') || lang.includes('pt')) &&
                name.includes('google')
            );
        });
        
        // Seleção prioritária
        if (googleFemaleVoices.length > 0) {
            this.voice = googleFemaleVoices[0];
            console.log('[VoiceManagerAquidauana] Voz Google feminina selecionada:', this.voice.name);
        } else if (ptFemaleVoices.length > 0) {
            this.voice = ptFemaleVoices[0];
            console.log('[VoiceManagerAquidauana] Voz feminina em português selecionada:', this.voice.name);
        } else if (googlePtVoices.length > 0) {
            this.voice = googlePtVoices[0];
            console.log('[VoiceManagerAquidauana] Voz Google em português selecionada:', this.voice.name);
        } else {
            // Último recurso: primeira voz disponível
            this.voice = voices[0] || null;
            console.warn('[VoiceManagerAquidauana] Usando voz padrão:', this.voice?.name);
        }
    }
    
    setupEventListeners() {
        document.addEventListener('DOMContentLoaded', () => {
            // Configurações específicas para Aquidauana podem ser adicionadas aqui
            console.log('[VoiceManagerAquidauana] Sistema de voz para Aquidauana inicializado');
        });
    }
    
    /**
     * Adicionar fala à fila com prioridade específica para Aquidauana
     */
    addToQueue(text, options = {}) {
        if (!this.enabled || !this.synthesis) {
            console.log('[VoiceManagerAquidauana] TTS desabilitado ou não suportado');
            return;
        }
        
        // Verificar cache para evitar duplicatas
        const cacheKey = `${text}_${options.type || 'default'}`;
        const now = Date.now();
        
        if (this.notificationCache.has(cacheKey)) {
            const lastTime = this.notificationCache.get(cacheKey);
            if (now - lastTime < 30000) { // 30 segundos
                console.log('[VoiceManagerAquidauana] Notificação duplicada ignorada:', text);
                return;
            }
        }
        
        this.notificationCache.set(cacheKey, now);
        
        const queueItem = {
            id: `aquidauana_${Date.now()}_${Math.random()}`,
            text,
            options,
            priority: options.priority || 1, // Prioridade alta por padrão para Aquidauana
            timestamp: new Date()
        };
        
        // Inserir na fila baseado na prioridade
        if (queueItem.priority > 0) {
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
        
        console.log(`[VoiceManagerAquidauana] Adicionado à fila: "${text}" (Prioridade: ${queueItem.priority})`);
        
        if (!this.queueProcessing) {
            this.processQueue();
        }
    }
    
    /**
     * Processar fila de fala
     */
    async processQueue() {
        if (this.queueProcessing || this.speechQueue.length === 0) {
            return;
        }
        
        this.queueProcessing = true;
        
        while (this.speechQueue.length > 0) {
            const queueItem = this.speechQueue.shift();
            
            try {
                await this.speakItem(queueItem);
                
                if (this.speechQueue.length > 0) {
                    await this.delay(400); // Pausa entre falas
                }
                
            } catch (error) {
                console.error(`[VoiceManagerAquidauana] Erro ao processar item:`, error);
            }
        }
        
        this.queueProcessing = false;
    }
    
    /**
     * Falar um item específico
     */
    speakItem(queueItem) {
        return new Promise((resolve, reject) => {
            this.synthesis.cancel();
            
            const utterance = new SpeechSynthesisUtterance(queueItem.text);
            
            // Configurações específicas para Aquidauana
            utterance.voice = this.voice;
            utterance.volume = this.volume;
            utterance.rate = this.rate;
            utterance.pitch = this.pitch;
            utterance.lang = 'pt-BR';
            
            utterance.onstart = () => {
                this.isSpeaking = true;
                console.log(`[VoiceManagerAquidauana] Falando: "${queueItem.text}"`);
            };
            
            utterance.onend = () => {
                this.isSpeaking = false;
                resolve();
            };
            
            utterance.onerror = (event) => {
                this.isSpeaking = false;
                console.error(`[VoiceManagerAquidauana] Erro:`, event.error);
                reject(event.error);
            };
            
            this.synthesis.speak(utterance);
        });
    }
    
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    /**
     * Métodos específicos para notificações de Aquidauana
     */
    speakAgendamentoAquidauanaProximo(nomeCliente, horario, minutosRestantes) {
        let text;
        
        if (minutosRestantes <= 0) {
            text = `Atenção Aquidauana! O agendamento de ${nomeCliente} às ${horario} está começando agora`;
        } else if (minutosRestantes <= 5) {
            text = `Aquidauana, atenção! Agendamento de ${nomeCliente} às ${horario} em ${minutosRestantes} minutos`;
        } else {
            text = `Aquidauana, próximo agendamento: ${nomeCliente} às ${horario} em ${minutosRestantes} minutos`;
        }
        
        this.addToQueue(text, { 
            priority: 2, 
            type: 'proximo',
            volume: this.volume + 0.1 
        });
    }
    
    speakAgendamentoAquidauanaAtrasado(nomeCliente, horario, minutosAtraso) {
        const tempoFormatado = this.formatMinutesForSpeech(minutosAtraso);
        const text = `Alerta Aquidauana! Agendamento de ${nomeCliente} às ${horario} está atrasado em ${tempoFormatado}. Favor verificar imediatamente!`;
        
        this.addToQueue(text, { 
            priority: 3, // Prioridade máxima
            type: 'atrasado',
            volume: Math.min(this.volume + 0.2, 1.0)
        });
        
        // Mostrar notificação nativa específica para Aquidauana
        this.showAquidauanaNativeNotification({
            cliente: nomeCliente,
            horario: horario,
            minutosAtraso: minutosAtraso
        });
    }
    
    speakAgendamentoAquidauanaCriado(nomeCliente, horario) {
        const text = `Aquidauana, novo agendamento confirmado: ${nomeCliente} às ${horario}`;
        
        this.addToQueue(text, { 
            priority: 1, 
            type: 'criado' 
        });
    }
    
    speakAgendamentoAquidauanaConcluido(nomeCliente) {
        const text = `Aquidauana, agendamento de ${nomeCliente} foi concluído com sucesso`;
        
        this.addToQueue(text, { 
            priority: 1, 
            type: 'concluido' 
        });
    }
    
    speakAgendamentoAquidauanaCancelado(nomeCliente) {
        const text = `Aquidauana, agendamento de ${nomeCliente} foi cancelado`;
        
        this.addToQueue(text, { 
            priority: 2, 
            type: 'cancelado' 
        });
    }
    
    /**
     * Notificação nativa específica para Aquidauana
     */
    async showAquidauanaNativeNotification(agendamento) {
        if (!window.ipcRenderer) {
            console.warn('[VoiceManagerAquidauana] ipcRenderer não disponível');
            return;
        }
        
        try {
            const title = '🚨 AQUIDAUANA - Agendamento Atrasado!';
            const body = `Cliente: ${agendamento.cliente}\nHorário: ${agendamento.horario}\nAtraso: ${agendamento.minutosAtraso} minutos\n\n⚠️ VERIFICAÇÃO URGENTE NECESSÁRIA`;
            
            const result = await window.ipcRenderer.invoke('showNativeNotification', {
                title: title,
                body: body,
                options: {
                    urgency: 'critical',
                    sound: true,
                    timeoutType: 'never',
                    icon: 'warning'
                }
            });
            
            if (result.success) {
                console.log('[VoiceManagerAquidauana] Notificação nativa de Aquidauana exibida');
            }
        } catch (error) {
            console.error('[VoiceManagerAquidauana] Erro ao exibir notificação:', error);
        }
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
    
    /**
     * Controles do sistema
     */
    setEnabled(enabled) {
        this.enabled = enabled;
        localStorage.setItem('voiceAquidauanaEnabled', enabled);
        console.log('[VoiceManagerAquidauana] Sistema', enabled ? 'habilitado' : 'desabilitado');
    }
    
    isEnabled() {
        return this.enabled;
    }
    
    stop() {
        this.synthesis.cancel();
        this.speechQueue = [];
        this.isSpeaking = false;
        this.queueProcessing = false;
        console.log('[VoiceManagerAquidauana] Sistema parado');
    }
    
    /**
     * Limpeza de cache antigo
     */
    cleanOldCache() {
        const now = Date.now();
        const maxAge = 300000; // 5 minutos
        
        for (const [key, timestamp] of this.notificationCache.entries()) {
            if (now - timestamp > maxAge) {
                this.notificationCache.delete(key);
            }
        }
    }
}

// Instância global específica para Aquidauana
const voiceManagerAquidauana = new VoiceManagerAquidauana();

// Exportar para uso global
window.voiceManagerAquidauana = voiceManagerAquidauana;

// Limpeza automática de cache a cada 5 minutos
setInterval(() => {
    voiceManagerAquidauana.cleanOldCache();
}, 300000);

console.log('[VoiceManagerAquidauana] Sistema de voz especializado para Aquidauana inicializado');