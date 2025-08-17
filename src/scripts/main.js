// Importar ipcRenderer do Electron e torná-lo global (apenas se disponível)
let ipcRenderer;
if (typeof require !== 'undefined') {
    try {
        const electron = require('electron');
        ipcRenderer = electron.ipcRenderer;
        window.ipcRenderer = ipcRenderer;
    } catch (e) {
        console.log('Electron não disponível, rodando no navegador');
    }
} else {
    console.log('Require não disponível, rodando no navegador');
}

// Função para controlar o preloader
function initializePreloader() {
    const preloader = document.getElementById('appPreloader');
    const logoImage = document.querySelector('.preloader-logo-image');
    
    if (!preloader || !logoImage) {
        console.warn('Elementos do preloader não encontrados');
        return;
    }
    
    let preloaderHidden = false;
    
    const hidePreloader = () => {
        if (preloaderHidden) return;
        preloaderHidden = true;
        
        preloader.classList.add('hidden');
        // main.css não tem transition, então remover rápido
        setTimeout(() => {
            if (preloader && preloader.parentElement) {
                preloader.remove();
            }
        }, 100);
    };
    
    // Aguardar carregamento da logo
    logoImage.onload = () => {
        console.log('Logo carregada com sucesso');
        setTimeout(hidePreloader, 1200);
    };
    
    // Fallback caso a logo não carregue
    logoImage.onerror = () => {
        console.warn('Erro ao carregar logo, removendo preloader');
        setTimeout(hidePreloader, 800);
    };
    
    // Se a logo já estiver carregada
    if (logoImage.complete && logoImage.naturalWidth > 0) {
        logoImage.onload();
    }
    
    // Fallback de segurança - remover após tempo máximo
    setTimeout(() => {
        if (!preloaderHidden) {
            console.log('Fallback de segurança: removendo preloader após timeout');
            hidePreloader();
        }
    }, 3000);
}

// Função auxiliar para chamar showToast de forma segura
function safeShowToast(message, type = 'info') {
    if (typeof showToast === 'function') {
        showToast(message, type);
    } else if (window.showToast && typeof window.showToast === 'function') {
        window.showToast(message, type);
    } else {
        console.log(`Toast: ${message} (${type})`);
    }
}

// Função showToast global
function showToast(message, type = 'info', duration = 5000) {
    // Remover toast anterior se existir
    const existingToast = document.querySelector('.toast');
    if (existingToast) {
        existingToast.remove();
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    // Criar elemento de fechar com event listener adequado
    const closeButton = document.createElement('button');
    closeButton.className = 'toast-close';
    closeButton.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
    `;
    closeButton.addEventListener('click', () => {
        toast.remove();
    });

    toast.innerHTML = `
        <div class="toast-content">
            <div class="toast-icon">${getToastIcon(type)}</div>
            <span class="toast-message">${message}</span>
        </div>
    `;
    
    // Adicionar botão de fechar
    toast.querySelector('.toast-content').appendChild(closeButton);

    document.body.appendChild(toast);

    // Auto remover após duração especificada
    const autoRemoveTimer = setTimeout(() => {
        if (toast.parentElement) {
            toast.classList.add('toast-removing');
            setTimeout(() => {
                if (toast.parentElement) {
                    toast.remove();
                }
            }, 300);
        }
    }, duration);

    // Cancelar auto-remoção se o usuário interagir
    toast.addEventListener('mouseenter', () => {
        clearTimeout(autoRemoveTimer);
    });

    toast.addEventListener('mouseleave', () => {
        setTimeout(() => {
            if (toast.parentElement) {
                toast.classList.add('toast-removing');
                setTimeout(() => {
                    if (toast.parentElement) {
                        toast.remove();
                    }
                }, 300);
            }
        }, 1000);
    });
}

// Função para obter ícone do toast com ícones mais profissionais
function getToastIcon(type) {
    const icons = {
        success: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <circle cx="12" cy="12" r="10" fill="#10b981" stroke="#10b981"/>
            <path d="M9 12l2 2 4-4" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>`,
        error: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <circle cx="12" cy="12" r="10" fill="#ef4444" stroke="#ef4444"/>
            <line x1="15" y1="9" x2="9" y2="15" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <line x1="9" y1="9" x2="15" y2="15" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>`,
        warning: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <circle cx="12" cy="12" r="10" fill="#f59e0b" stroke="#f59e0b"/>
            <line x1="12" y1="8" x2="12" y2="12" stroke="white" stroke-width="2" stroke-linecap="round"/>
            <circle cx="12" cy="16" r="1" fill="white"/>
        </svg>`,
        info: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <circle cx="12" cy="12" r="10" fill="#3b82f6" stroke="#3b82f6"/>
            <line x1="12" y1="16" x2="12" y2="12" stroke="white" stroke-width="2" stroke-linecap="round"/>
            <circle cx="12" cy="8" r="1" fill="white"/>
        </svg>`
    };
    return icons[type] || icons.info;
}

// Tornar showToast disponível globalmente
window.showToast = showToast;

// Variáveis globais
let currentTab = 'hoje';
let agendamentos = [];
let editingAgendamento = null;
let cancelingAgendamento = null;
let sharingAgendamento = null;
let isOnline = navigator.onLine;
let currentTheme = localStorage.getItem('theme') || 'light';

// Lista de usuários para transferência
const users = [
    { id: 1, nome: 'João Silva', email: 'joao@uby.com', avatar: 'JS' },
    { id: 2, nome: 'Maria Santos', email: 'maria@uby.com', avatar: 'MS' },
    { id: 3, nome: 'Pedro Costa', email: 'pedro@uby.com', avatar: 'PC' },
    { id: 4, nome: 'Ana Oliveira', email: 'ana@uby.com', avatar: 'AO' },
    { id: 5, nome: 'Carlos Lima', email: 'carlos@uby.com', avatar: 'CL' }
];

// Cores para post-its
const postitColors = ['postit-amarelo', 'postit-rosa', 'postit-azul', 'postit-verde', 'postit-laranja', 'postit-roxo'];

// Inicialização
document.addEventListener('DOMContentLoaded', async () => {
    // Inicializar estado de som
    window.soundMuted = localStorage.getItem('soundMuted') === 'true';
    
    // Inicializar preloader
    initializePreloader();
    
    console.log('Iniciando aplicação...');
    await initializeApp();
    console.log('Aplicação inicializada');
    setupEventListeners();
    console.log('Event listeners configurados');
    await loadAgendamentos();
    console.log('Agendamentos carregados');
    setupWindowControls();
    formatPhoneInput();
    
    // Verificar aba inicial
    console.log('Aba inicial:', currentTab);
    console.log('Container de agendamentos:', document.getElementById('agendamentosContainer'));
    
    // Aplicar tema salvo
    applyTheme(currentTheme);
    
    // Configurar status de conexão
    updateConnectionStatus();
    setInterval(checkConnection, 30000); // Verificar a cada 30 segundos
    
    // Event listeners para conexão
    window.addEventListener('online', () => {
        isOnline = true;
        updateConnectionStatus();
        safeShowToast('Conexão restaurada', 'success');
    });

    window.addEventListener('offline', () => {
        isOnline = false;
        updateConnectionStatus();
        safeShowToast('Conexão perdida', 'error');
    });
    
    // Aguardar os sistemas de som e voz estarem prontos
    setTimeout(() => {
        if (window.soundManager && window.voiceManager) {
            console.log('Sistemas de som e voz carregados com sucesso');
            
            // Inicializar estado visual do botão de som
            initializeSoundButtonState();
            
            // Inicializar sistema de lembretes se disponível
            if (window.reminderSystem && typeof window.reminderSystem.startChecking === 'function') {
                window.reminderSystem.startChecking();
                console.log('Sistema de lembretes iniciado');
            } else {
                console.log('Sistema de lembretes não disponível');
            }
        }
    }, 1000);
});

// Inicializar aplicação
async function initializeApp() {
    try {
        // Verificar se há usuário logado usando Electron
        const currentUser = await ipcRenderer.invoke('getCurrentUser');
        
        if (!currentUser) {
            // Se não há usuário logado, redirecionar para login
            window.location.href = 'login.html';
            return;
        }
        
        document.getElementById('userNameText').textContent = currentUser.displayName || currentUser.username;
        
        // Armazenar dados do usuário globalmente para uso em outras funções
        window.currentUser = currentUser;
        
        // Definir e bloquear campo atendente
        const atendenteInput = document.getElementById('atendente');
        atendenteInput.value = currentUser.displayName || currentUser.username;
        atendenteInput.setAttribute('readonly', true);
        
        // ===== CARREGAR PREFERÊNCIAS DO USUÁRIO =====
        await loadUserPreferences(currentUser);

    } catch (error) {
        console.error('Erro ao carregar dados do usuário:', error);
        // Se há erro nos dados, redirecionar para login
        window.location.href = 'login.html';
        return;
    }
    
    // Definir data atual no formulário
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('data').value = today;
}

// Função para carregar e aplicar preferências do usuário
async function loadUserPreferences(user) {
    try {
        // Verificar se o sistema de preferências está disponível
        if (window.userPreferencesManager) {
            console.log('[PREFERENCES] Carregando preferências para usuário:', user.username);
            
            // Definir o usuário atual no gerenciador
            window.userPreferencesManager.currentUser = user;
            
            // Carregar preferências do usuário (método correto)
            await window.userPreferencesManager.loadUserPreferences();
            
            console.log('[PREFERENCES] Preferências aplicadas com sucesso');
        } else {
            console.warn('[PREFERENCES] Sistema de preferências não disponível');
            // Aplicar configurações padrão do localStorage (fallback)
            applyFallbackPreferences();
        }
    } catch (error) {
        console.error('[PREFERENCES] Erro ao carregar preferências:', error);
        // Aplicar configurações padrão em caso de erro
        applyFallbackPreferences();
    }
}

// Função de fallback para aplicar configurações do localStorage
function applyFallbackPreferences() {
    try {
        // Aplicar tema salvo
        const savedTheme = localStorage.getItem('theme') || 'light';
        currentTheme = savedTheme;
        applyTheme(currentTheme);
        
        // Aplicar configurações de TTS se disponíveis
        if (window.loadTTSSettings && typeof window.loadTTSSettings === 'function') {
            window.loadTTSSettings();
        }
        
        console.log('[PREFERENCES] Configurações de fallback aplicadas');
    } catch (error) {
        console.error('[PREFERENCES] Erro ao aplicar configurações de fallback:', error);
    }
}

// Função auxiliar para salvar preferências do usuário
function saveUserPreference(key, value) {
    try {
        if (window.userPreferencesManager && window.currentUser) {
            window.userPreferencesManager.updatePreference(key, value);
            console.log(`[PREFERENCES] Preferência salva: ${key} = ${value}`);
        } else {
            console.warn('[PREFERENCES] Sistema de preferências não disponível para salvar:', key);
        }
    } catch (error) {
        console.error('[PREFERENCES] Erro ao salvar preferência:', error);
    }
}



// Configurar event listeners
function setupEventListeners() {
    // Formulário de agendamento
    document.getElementById('agendamentoForm').addEventListener('submit', handleCreateAgendamento);
    
    // Tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            // Usar currentTarget para garantir que sempre pegue o botão, não o SVG ou texto
            const tabBtn = e.currentTarget;
            const tabValue = tabBtn.dataset.tab;
            console.log('Tab clicked:', tabValue);
            currentTab = tabValue;
            updateTabs();
            filterAgendamentos();
        });
    });
    
    // Header buttons
    document.getElementById('soundBtn').addEventListener('click', toggleSoundPanel);
    document.getElementById('exitBtn').addEventListener('click', handleLogout);
    
    // Novos botões do header
    const statusBtn = document.getElementById('statusBtn');
    const themeBtn = document.getElementById('themeBtn');
    const notificationBtn = document.getElementById('notificationBtn');
    
    if (statusBtn) {
        statusBtn.addEventListener('click', syncData);
    }
    
    if (themeBtn) {
        themeBtn.addEventListener('click', toggleTheme);
    }
    

    
    // Event listeners do painel de controle removidos
    
    // Sound controls - removidos pois agora são gerenciados pelos novos sistemas
    
    // Modais
    document.getElementById('closeEditModal').addEventListener('click', closeEditModal);
    document.getElementById('closeCancelModal').addEventListener('click', closeCancelModal);
    document.getElementById('closeLocationModal').addEventListener('click', closeLocationModal);
    document.getElementById('cancelEdit').addEventListener('click', closeEditModal);
    document.getElementById('cancelCancelation').addEventListener('click', closeCancelModal);
    
    // Controles do mapa
    document.getElementById('zoomIn').addEventListener('click', () => {
        if (map) map.zoomIn();
    });
    document.getElementById('zoomOut').addEventListener('click', () => {
        if (map) map.zoomOut();
    });
    document.getElementById('centerMap').addEventListener('click', () => {
        if (map && currentMapCoordinates) {
            map.setView(currentMapCoordinates, 15);
        }
    });
    
    // Formulários dos modais
    document.getElementById('editForm').addEventListener('submit', handleEditAgendamento);
    document.getElementById('cancelForm').addEventListener('submit', handleCancelAgendamento);
    
    // Fechar painéis ao clicar fora
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.sound-panel') && !e.target.closest('#soundBtn')) {
            closeSoundPanel();
        }
    });
}

// Funções dos botões do header
function toggleTheme() {
    currentTheme = currentTheme === 'light' ? 'dark' : 'light';
    applyTheme(currentTheme);
    localStorage.setItem('theme', currentTheme);
    
    // Salvar preferência do usuário
    saveUserPreference('theme', currentTheme);
    
    const themeName = currentTheme === 'dark' ? 'escuro' : 'claro';
    showToast(`Tema ${themeName} ativado`, 'info');
}

function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    
    const themeBtn = document.getElementById('themeBtn');
    if (themeBtn) {
        const icon = themeBtn.querySelector('svg');
        if (theme === 'dark') {
            // Ícone da lua para tema escuro
            icon.innerHTML = `
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
            `;
        } else {
            // Ícone do sol para tema claro
            icon.innerHTML = `
                <circle cx="12" cy="12" r="5"></circle>
                <line x1="12" y1="1" x2="12" y2="3"></line>
                <line x1="12" y1="21" x2="12" y2="23"></line>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                <line x1="1" y1="12" x2="3" y2="12"></line>
                <line x1="21" y1="12" x2="23" y2="12"></line>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
            `;
        }
    }
}

async function checkConnection() {
    try {
        // Verificar conexão usando uma URL local ou método alternativo
        // Em aplicações Electron, podemos verificar o status do WebSocket
        if (window.wsClient && window.wsClient.isConnected) {
            isOnline = true;
        } else {
            // Verificar conectividade de rede usando navigator.onLine
            isOnline = navigator.onLine;
        }
    } catch (error) {
        isOnline = false;
    }
    updateConnectionStatus();
}

function updateConnectionStatus() {
    const connectionBtn = document.getElementById('connectionStatus');
    const statusText = connectionBtn?.querySelector('.btn-text');
    const statusDot = connectionBtn?.querySelector('.status-dot');

    if (!connectionBtn) return;

    if (isOnline) {
        connectionBtn.className = 'header-btn connection-btn';
        if (statusText) statusText.textContent = 'Online';
        if (statusDot) {
            statusDot.className = 'status-dot online';
        }
    } else {
        connectionBtn.className = 'header-btn connection-btn offline';
        if (statusText) statusText.textContent = 'Offline';
        if (statusDot) {
            statusDot.className = 'status-dot offline';
        }
    }
}

async function syncData() {
    if (!isOnline) {
        showToast('Sem conexão com a internet', 'error');
        return;
    }

    const connectionBtn = document.getElementById('connectionStatus');
    const statusText = connectionBtn?.querySelector('.btn-text');
    const statusDot = connectionBtn?.querySelector('.status-dot');
    
    // Mostrar status de sincronização
    if (connectionBtn) {
        connectionBtn.className = 'header-btn connection-btn checking';
        if (statusText) statusText.textContent = 'Verificando...';
        if (statusDot) {
            statusDot.className = 'status-dot checking';
        }
    }

    try {
        // Simular sincronização (substituir por lógica real)
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        showToast('Dados sincronizados com sucesso', 'success');
        updateConnectionStatus();
    } catch (error) {
        showToast('Erro ao sincronizar dados', 'error');
        updateConnectionStatus();
    }
}

function toggleSystemStatus() {
    // Função mantida para compatibilidade, mas agora chama syncData
    syncData();
}

// Funções do painel de controle removidas - funcionalidades agora no header

// Controles da janela
function setupWindowControls() {
    console.log('Configurando controles da janela...');
    
    // Aguardar um pouco para garantir que o DOM esteja completamente carregado
    setTimeout(() => {
        const minimizeBtn = document.getElementById('minimizeBtn');
        const maximizeBtn = document.getElementById('maximizeBtn');
        const closeBtn = document.getElementById('closeBtn');
        
        console.log('Botões encontrados:', {
            minimize: !!minimizeBtn,
            maximize: !!maximizeBtn,
            close: !!closeBtn
        });
        
        // Event delegation no documento para capturar cliques nos botões
        document.addEventListener('click', (e) => {
            const target = e.target.closest('.window-btn');
            if (!target) return;
            
            e.preventDefault();
            e.stopPropagation();
            
            const buttonId = target.id;
            console.log('Clique detectado no botão:', buttonId);
            
            switch (buttonId) {
                case 'minimizeBtn':
                    console.log('Minimizando janela...');
                    ipcRenderer.send('main-window-minimize');
                    break;
                case 'maximizeBtn':
                    console.log('Maximizando/restaurando janela...');
                    ipcRenderer.send('main-window-maximize');
                    break;
                case 'closeBtn':
                    console.log('Fechando janela...');
                    ipcRenderer.send('main-window-close');
                    break;
                default:
                    console.log('Botão não reconhecido:', buttonId);
            }
        });
        
        // Adicionar event listeners diretos como backup
        if (minimizeBtn) {
            minimizeBtn.addEventListener('click', (e) => {
                console.log('Botão minimizar clicado (direto)');
                e.preventDefault();
                e.stopPropagation();
                ipcRenderer.send('main-window-minimize');
            });
            console.log('Event listener direto do minimizar adicionado');
        } else {
            console.error('Botão minimizar não encontrado');
        }
        
        if (maximizeBtn) {
            maximizeBtn.addEventListener('click', (e) => {
                console.log('Botão maximizar clicado (direto)');
                e.preventDefault();
                e.stopPropagation();
                ipcRenderer.send('main-window-maximize');
            });
            console.log('Event listener direto do maximizar adicionado');
        } else {
            console.error('Botão maximizar não encontrado');
        }
        
        if (closeBtn) {
            closeBtn.addEventListener('click', (e) => {
                console.log('Botão fechar clicado (direto)');
                e.preventDefault();
                e.stopPropagation();
                ipcRenderer.send('main-window-close');
            });
            console.log('Event listener direto do fechar adicionado');
        } else {
            console.error('Botão fechar não encontrado');
        }
        
        console.log('Configuração dos controles da janela concluída');
    }, 100);
}

// Formatação do telefone
function formatPhoneInput() {
    const phoneInput = document.getElementById('numeroContato');
    phoneInput.addEventListener('input', (e) => {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length <= 11) {
            value = value.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
            if (value.length < 14) {
                value = value.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
            }
        }
        e.target.value = value;
    });
}

// Criar agendamento
async function handleCreateAgendamento(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    
    
    // Coletar paradas dinamicamente
    const paradas = collectParadas();
    
    const agendamento = {
        data: formData.get('data') || document.getElementById('data').value,
        horario: formData.get('horario') || document.getElementById('horario').value,
        nomeCliente: formData.get('nomeCliente') || document.getElementById('nomeCliente').value,
        numeroContato: formData.get('numeroContato') || document.getElementById('numeroContato').value,
        atendente: formData.get('atendente') || document.getElementById('atendente').value,
        status: formData.get('status') || document.getElementById('status').value,
        cidade: formData.get('cidade') || document.getElementById('cidade').value,
        enderecoOrigem: formData.get('enderecoOrigem') || document.getElementById('enderecoOrigem').value,
        paradas: paradas, // Array de paradas
        enderecoDestino: formData.get('enderecoDestino') || document.getElementById('enderecoDestino').value,
        
        observacoes: formData.get('observacoes') || document.getElementById('observacoes').value,
        prioridade: calculatePriority(formData.get('data') || document.getElementById('data').value, formData.get('horario') || document.getElementById('horario').value)
    };
    
    try {
        const result = await ipcRenderer.invoke('saveAgendamento', agendamento);
        if (result.success) {
            // Salvar valor do atendente antes do reset
            const atendenteValue = document.getElementById('atendente').value;
            
            // Limpar formulário
            e.target.reset();
            document.getElementById('data').value = new Date().toISOString().split('T')[0];
            
            // Restaurar campo atendente
            const atendenteInput = document.getElementById('atendente');
            atendenteInput.value = atendenteValue;
            atendenteInput.setAttribute('readonly', true);
            
            // Recarregar agendamentos
            await loadAgendamentos();
            
            // Notificação de voz apenas uma vez (para o criador)
            if (window.voiceManager && !window.soundMuted) {
                window.voiceManager.speakAgendamentoCriado(
                    agendamento.nomeCliente,
                    agendamento.horario,
                    agendamento.cidade
                );
            }
            
            // Enviar notificação para todos os usuários conectados via WebSocket
            if (window.webSocketClient && window.webSocketClient.isConnected) {
                window.webSocketClient.socket.emit('agendamento:broadcast', {
                    action: 'created',
                    agendamento: result.agendamento,
                    createdBy: {
                        userId: window.currentUser?.id,
                        userName: window.currentUser?.username,
                        displayName: window.currentUser?.displayName || window.currentUser?.username
                    },
                    timestamp: new Date()
                });
                console.log('[WEBSOCKET] Notificação de novo agendamento enviada para todos os usuários');
            }
            
            showToast('Agendamento criado com sucesso!', 'success');
        }
    } catch (error) {
        console.error('Erro ao criar agendamento:', error);
        showToast('Erro ao criar agendamento', 'error');
    }
}

// Calcular prioridade
function calculatePriority(data, horario) {
    const agendamentoDate = new Date(`${data}T${horario}`);
    const now = new Date();
    const diffHours = (agendamentoDate - now) / (1000 * 60 * 60);
    
    if (diffHours <= 2) return 'urgente';
    if (diffHours <= 24) return 'medio';
    return 'normal';
}

// Carregar agendamentos
async function loadAgendamentos() {
    try {
        console.log('Carregando agendamentos...');
        agendamentos = await ipcRenderer.invoke('getAgendamentos');
        console.log('Agendamentos carregados:', agendamentos.length);
        console.log('Primeiros 3 agendamentos:', agendamentos.slice(0, 3).map(a => ({ id: a.id, data: a.data, nome: a.nomeCliente })));
        

        
        // Atualizar agendamentos globalmente para o sistema de lembretes
        window.agendamentos = agendamentos;
        
        // Reinicializar sistema de lembretes se disponível
        if (window.reminderSystem && typeof window.reminderSystem.checkReminders === 'function') {
            console.log('Reinicializando sistema de lembretes com novos agendamentos');
            window.reminderSystem.checkReminders();
        }
        
        console.log('Chamando filterAgendamentos...');
        filterAgendamentos();
        console.log('filterAgendamentos concluído');
    } catch (error) {
        console.error('Erro ao carregar agendamentos:', error);
        agendamentos = [];
        window.agendamentos = [];
        filterAgendamentos();
    }
}

// Filtrar agendamentos
function filterAgendamentos() {
    console.log('=== INÍCIO filterAgendamentos ===');
    console.log('filterAgendamentos called, currentTab:', currentTab);
    const container = document.getElementById('agendamentosContainer');
    console.log('Container encontrado:', !!container);
    if (!container) {
        console.error('ERRO: Container agendamentosContainer não encontrado!');
        return;
    }
    
    const today = new Date().toISOString().split('T')[0];
    
    let filtered = [];
    
    // Usar todos os agendamentos como fonte (sistema de busca removido)
    const sourceAgendamentos = agendamentos;
    
    console.log('Filtrando para aba:', currentTab, 'Data hoje:', today);
    console.log('Total de agendamentos na fonte:', sourceAgendamentos.length);
    
    switch (currentTab) {
        case 'hoje':
            // Mostrar apenas agendamentos do dia atual que não estão concluídos ou cancelados
            filtered = sourceAgendamentos.filter(a => a.data === today && a.status !== 'Concluído' && a.status !== 'Cancelado');
            console.log('Agendamentos para hoje:', filtered.length);
            break;
        case 'futuros':
            filtered = sourceAgendamentos.filter(a => a.data > today && a.status !== 'Cancelado' && a.status !== 'Concluído');
            break;
        case 'concluidos':
            // Apenas agendamentos com status exatamente 'Concluído'
            filtered = sourceAgendamentos.filter(a => a.status === 'Concluído');
            break;
        case 'cancelados':
            // Apenas agendamentos com status exatamente 'Cancelado'
            filtered = sourceAgendamentos.filter(a => a.status === 'Cancelado');
            break;
    }
    
    console.log(`Filtered ${filtered.length} agendamentos for tab '${currentTab}'`);
    
    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#ccc" stroke-width="1">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
                <h3>Nenhum agendamento encontrado</h3>
                <p>Os agendamentos aparecerão aqui quando criados.</p>
            </div>
        `;
        return;
    }
    
    // Ordenar por data e horário, mas agrupando transferidos primeiro
    filtered.sort((a, b) => {
        // Primeiro critério: agendamentos transferidos vêm primeiro
            const aShared = a.compartilhadoPor ? 1 : 0;
            const bShared = b.compartilhadoPor ? 1 : 0;
            
            if (aShared !== bShared) {
                return bShared - aShared; // Transferidos primeiro
            }
        
        // Segundo critério: ordenar por data e horário
        const dateA = new Date(`${a.data}T${a.horario}`);
        const dateB = new Date(`${b.data}T${b.horario}`);
        return dateA - dateB;
    });
    
    console.log('Renderizando agendamentos:', filtered.length);
    const cardsHTML = filtered.map(agendamento => createAgendamentoCard(agendamento)).join('');
    console.log('HTML gerado (primeiros 500 chars):', cardsHTML.substring(0, 500));
    console.log('HTML gerado (tamanho total):', cardsHTML.length);
    
    container.innerHTML = cardsHTML;
    console.log('HTML inserido no container');
    console.log('Container tem elementos após inserção:', container.children.length);
    console.log('Container innerHTML (primeiros 200 chars):', container.innerHTML.substring(0, 200));
    
    // Atualizar sistema de busca após carregar agendamentos
    if (window.searchSystem && typeof window.searchSystem.refresh === 'function') {
        setTimeout(() => {
            window.searchSystem.refresh();
        }, 100);
    }
    
    console.log('=== FIM filterAgendamentos ===');
}

// Criar card do agendamento
function createAgendamentoCard(agendamento) {
    console.log('=== INÍCIO createAgendamentoCard ===');
    console.log('Criando card para agendamento:', agendamento.id, agendamento.nomeCliente);
    console.log('Agendamento completo:', agendamento);
    
    const statusClass = agendamento.status === 'Concluído' ? 'concluido' : 
                       agendamento.status === 'Cancelado' ? 'cancelado' : agendamento.prioridade;
    
    // Determinar se é transferido ou não
    const isShared = agendamento.compartilhadoPor ? true : false;
    const shareClass = isShared ? 'shared' : 'not-shared';
    const postitStyle = 'postit-style';
    
    console.log('Classes CSS aplicadas:', statusClass, postitStyle, shareClass);
    
    const formatDate = new Date(agendamento.data + 'T00:00:00').toLocaleDateString('pt-BR');
    
    // Informações de transferência - mostrar no final para aba concluídos
    const sharedInfo = agendamento.compartilhadoPor && currentTab !== 'concluidos' ? 
        `<div class="postit-shared-info">Transferido por: ${agendamento.compartilhadoPor}</div>` : '';
    
    // Informações de transferência no final para aba concluídos
    const sharedInfoBottom = agendamento.compartilhadoPor && currentTab === 'concluidos' ? 
        `<div class="postit-shared-info-bottom">Transferido por: ${agendamento.compartilhadoPor}</div>` : '';
    
    // Justificativa de cancelamento
    const justificativa = agendamento.motivoCancelamento ? 
        `<div class="postit-row postit-observacao">
            <span class="icon"><i class="fa-solid fa-exclamation-triangle"></i></span>
            <span><b>Motivo do Cancelamento:</b> <span class="observacao-text" title="${agendamento.motivoCancelamento}">${agendamento.motivoCancelamento}</span></span>
        </div>` : '';
    
    // Observações como observação especial
    const observacoes = agendamento.observacoes ? 
        `<div class="postit-row postit-observacao">
            <span class="icon"><i class="fa-solid fa-sticky-note"></i></span>
            <span><b>Obs.:</b> <span class="observacao-text" title="${agendamento.observacoes}">${agendamento.observacoes}</span></span>
        </div>` : '';
    
    const cardHTML = `
        <div class="agendamento-card ${statusClass} ${postitStyle} ${shareClass}" data-id="${agendamento.id}" data-shared="${isShared}">
            ${sharedInfo}
            
            <!-- Ícone de lixeira no canto superior direito -->
            <button class="postit-delete-icon" onclick="deleteAgendamento('${agendamento.id}')">
                <i class="fa-solid fa-trash-can"></i>
            </button>
            
            <div class="cliente-destaque">
                <span class="icon"><i class="fa-solid fa-user"></i></span>
                <span class="cliente-nome">${agendamento.nomeCliente}</span>
            </div>
            
            <div class="postit-content">
                <div class="postit-row">
                    <span class="icon"><i class="fa-solid fa-calendar-day"></i></span>
                    <span class="postit-label">Data:</span> <span class="postit-value">${formatDate}</span>
                </div>
                <div class="postit-row">
                    <span class="icon"><i class="fa-solid fa-clock"></i></span>
                    <span class="postit-label">Hora:</span> <span class="postit-value">${agendamento.horario}</span>
                </div>
                <div class="postit-row">
                    <span class="icon"><i class="fa-solid fa-phone"></i></span>
                    <span class="postit-label">Telefone:</span>
                    <span class="postit-value copyable-contact" onclick="copyToClipboard('${agendamento.numeroContato}')">${agendamento.numeroContato}</span>
                    <button class="copy-btn" onclick="copyToClipboard('${agendamento.numeroContato}')"><i class="fa-solid fa-copy"></i></button>
                </div>
                <div class="postit-row">
                    <span class="icon"><i class="fa-solid fa-location-dot"></i></span>
                    <span class="postit-label">Cidade:</span> <span class="postit-value">${agendamento.cidade}</span>
                </div>
                <div class="postit-row">
                    <span class="icon"><i class="fa-solid fa-taxi"></i></span>
                    <span class="postit-label">Status:</span> <span class="postit-status">${agendamento.status}</span>
                </div>
                <div class="postit-row">
                    <span class="icon"><i class="fa-solid fa-headset"></i></span>
                    <span class="postit-label">Atendente:</span> <span class="postit-value">${agendamento.atendente}</span>
                </div>
                ${agendamento.enderecoOrigem ? `
                    <div class="postit-row">
                        <span class="icon"><i class="fas fa-map-marker-alt"></i></span>
                        <span class="postit-label">Origem:</span> <span class="postit-value endereco" title="${agendamento.enderecoOrigem}">${agendamento.enderecoOrigem}</span>
                    </div>
                ` : ''}
                ${agendamento.paradas && agendamento.paradas.length > 0 ? 
                    agendamento.paradas.map((parada, index) => `
                        <div class="postit-row">
                            <span class="icon"><i class="fas fa-route"></i></span>
                            <span class="postit-label">Parada ${index + 1}:</span> <span class="postit-value endereco" title="${parada}">${parada}</span>
                        </div>
                    `).join('') : 
                    // Fallback para compatibilidade com dados antigos
                    (agendamento.parada1 ? `
                        <div class="postit-row">
                            <span class="icon"><i class="fas fa-route"></i></span>
                            <span class="postit-label">Parada 1:</span> <span class="postit-value endereco" title="${agendamento.parada1}">${agendamento.parada1}</span>
                        </div>
                    ` : '') +
                    (agendamento.parada2 ? `
                        <div class="postit-row">
                            <span class="icon"><i class="fas fa-route"></i></span>
                            <span class="postit-label">Parada 2:</span> <span class="postit-value endereco" title="${agendamento.parada2}">${agendamento.parada2}</span>
                        </div>
                    ` : '')
                }
                ${agendamento.enderecoDestino ? `
                    <div class="postit-row">
                        <span class="icon"><i class="fas fa-flag-checkered"></i></span>
                        <span class="postit-label">Destino:</span> <span class="postit-value endereco" title="${agendamento.enderecoDestino}">${agendamento.enderecoDestino}</span>
                    </div>
                ` : ''}
                ${observacoes}
                ${justificativa}
            </div>
            
            <div class="postit-footer">
                ${agendamento.status === 'Concluído' ? `
                    <div class="postit-creator-info">
                        <span class="creator-label">Criado por:</span>
                        <span class="creator-name">${agendamento.criadoPor || agendamento.atendente}</span>
                    </div>
                ` : agendamento.status === 'Cancelado' ? `
                    <div class="postit-creator-info">
                        <span class="creator-label">Cancelado por:</span>
                        <span class="creator-name">${agendamento.canceladoPor || agendamento.atendente}</span>
                    </div>
                ` : `
                    <button class="postit-btn concluir-btn" onclick="concluirAgendamento('${agendamento.id}')">
                        <i class="fa-solid fa-check-circle"></i> Concluir
                    </button>
                    <button class="postit-btn cancelar-btn" onclick="openCancelModal('${agendamento.id}')">
                        <i class="fa-solid fa-times-circle"></i> Cancelar
                    </button>
                    <button class="postit-btn editar-btn" onclick="openEditModal('${agendamento.id}')">
                        <i class="fa-solid fa-edit"></i> Editar
                    </button>
                    <button class="postit-btn transferir-btn" onclick="openShareModal('${agendamento.id}')">
                        <i class="fa-solid fa-share"></i> Transferir
                    </button>
                    <button class="postit-btn whatsapp-btn" onclick="openWhatsappModal('${agendamento.id}')">
                        <i class="fa-brands fa-whatsapp"></i> WhatsApp
                    </button>
                    ${(agendamento.enderecoOrigem && agendamento.enderecoDestino) ? `
                        <button class="postit-btn localizacao-btn" onclick="openLocationModal('${agendamento.id}')">
                            <i class="fa-solid fa-map-marker-alt"></i> Localização
                        </button>
                    ` : ''}
                `}
            </div>
            ${sharedInfoBottom}
        </div>
    `;
    
    console.log('Card HTML gerado para', agendamento.nomeCliente);
    console.log('HTML length:', cardHTML.length);
    console.log('HTML preview (primeiros 200 chars):', cardHTML.substring(0, 200));
    console.log('=== FIM createAgendamentoCard ===');
    return cardHTML;
}

// Atualizar tabs
function updateTabs() {
    console.log('updateTabs called, currentTab:', currentTab);
    document.querySelectorAll('.tab-btn').forEach(btn => {
        const isActive = btn.dataset.tab === currentTab;
        console.log(`Tab ${btn.dataset.tab}: active = ${isActive}`);
        btn.classList.toggle('active', isActive);
    });
}

// Concluir agendamento
async function concluirAgendamento(id) {
    try {
        const agendamento = agendamentos.find(a => a.id === id);
        const currentUser = window.currentUser ? window.currentUser.displayName : document.getElementById('userName').textContent;
        
        await ipcRenderer.invoke('updateAgendamento', { 
            id, 
            status: 'Concluído',
            concluidoPor: currentUser,
            concluidoEm: new Date().toISOString()
        });
        await loadAgendamentos();
        
        // Notificação de voz
        if (window.voiceManager) {
            window.voiceManager.speakAgendamentoConcluido(agendamento.nomeCliente);
        }
        
        showToast('Agendamento concluído!', 'success');
    } catch (error) {
        console.error('Erro ao concluir agendamento:', error);
        showToast('Erro ao concluir agendamento', 'error');
    }
}

// Função para excluir agendamento permanentemente
async function deleteAgendamento(id) {
    try {
        const result = await Swal.fire({
            title: '<i class="fa-solid fa-trash-can"></i> Excluir Agendamento',
            text: 'Tem certeza que deseja excluir este agendamento permanentemente? Esta ação não pode ser desfeita.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc3545',
            cancelButtonColor: '#6c757d',
            confirmButtonText: '<i class="fa-solid fa-trash-can"></i> Sim, excluir',
            cancelButtonText: '<i class="fa-solid fa-xmark"></i> Cancelar',
            background: '#ffffff',
            customClass: {
                popup: 'swal-popup-modern',
                title: 'swal-title-modern',
                content: 'swal-content-modern',
                confirmButton: 'swal-confirm-modern',
                cancelButton: 'swal-cancel-modern'
            }
        });

        if (result.isConfirmed) {
            // Excluir do banco de dados
            await ipcRenderer.invoke('deletePostItPermanently', id);
            
            // Remover da interface
            const cardElement = document.querySelector(`[data-id="${id}"]`);
            if (cardElement) {
                cardElement.style.transform = 'scale(0.8)';
                cardElement.style.opacity = '0';
                setTimeout(() => {
                    cardElement.remove();
                    updateAgendamentosCount();
                }, 300);
            }

            // Mostrar confirmação
            await Swal.fire({
                title: '<i class="fa-solid fa-check-circle"></i> Excluído!',
                text: 'O agendamento foi excluído permanentemente.',
                icon: 'success',
                timer: 2000,
                showConfirmButton: false,
                background: '#ffffff',
                customClass: {
                    popup: 'swal-popup-modern',
                    title: 'swal-title-modern'
                }
            });

            // Atualizar a lista
            await loadAgendamentos();
        }
    } catch (error) {
        console.error('Erro ao excluir agendamento:', error);
        await Swal.fire({
            title: '<i class="fa-solid fa-circle-exclamation"></i> Erro',
            text: 'Erro ao excluir o agendamento. Tente novamente.',
            icon: 'error',
            background: '#ffffff',
            customClass: {
                popup: 'swal-popup-modern',
                title: 'swal-title-modern'
            }
        });
    }
}

// Abrir modal de edição
function openEditModal(id) {
    const agendamento = agendamentos.find(a => a.id === id);
    if (!agendamento) return;
    
    editingAgendamento = agendamento;
    
    // Preencher formulário
    document.getElementById('editData').value = agendamento.data;
    document.getElementById('editHorario').value = agendamento.horario;
    document.getElementById('editNomeCliente').value = agendamento.nomeCliente;
    document.getElementById('editNumeroContato').value = agendamento.numeroContato;
    document.getElementById('editAtendente').value = agendamento.atendente;
    document.getElementById('editStatus').value = agendamento.status;
    document.getElementById('editCidade').value = agendamento.cidade;
    
    document.getElementById('editObservacoes').value = agendamento.observacoes || '';
    document.getElementById('editEnderecoOrigem').value = agendamento.enderecoOrigem || '';
    document.getElementById('editEnderecoDestino').value = agendamento.enderecoDestino || '';
    
    // Preencher paradas dinamicamente
    populateEditParadas(agendamento);
    
    document.getElementById('editModal').classList.add('show');
}

// Fechar modal de edição
function closeEditModal() {
    document.getElementById('editModal').classList.remove('show');
    editingAgendamento = null;
}

// Editar agendamento
async function handleEditAgendamento(e) {
    e.preventDefault();
    console.log('handleEditAgendamento called');
    
    if (!editingAgendamento) {
        console.error('Nenhum agendamento sendo editado');
        showToast('Erro: Nenhum agendamento selecionado para edição', 'error');
        return;
    }
    
    console.log('Editing agendamento:', editingAgendamento);
    
    try {

        
        // Coletar paradas dinamicamente do modal de edição
        const paradas = [];
        const editParadaInputs = document.querySelectorAll('#edit-paradas-container .parada-input');
        editParadaInputs.forEach(input => {
            const value = input.value.trim();
            if (value) {
                paradas.push(value);
            }
        });
        
        const updatedData = {
            id: editingAgendamento.id,
            data: document.getElementById('editData').value,
            horario: document.getElementById('editHorario').value,
            nomeCliente: document.getElementById('editNomeCliente').value,
            numeroContato: document.getElementById('editNumeroContato').value,
            // O campo atendente não é incluído para preservar o valor original
            status: document.getElementById('editStatus').value,
            cidade: document.getElementById('editCidade').value,
            enderecoOrigem: document.getElementById('editEnderecoOrigem').value || '',
            paradas: paradas, // Array de paradas
            enderecoDestino: document.getElementById('editEnderecoDestino').value || '',

            observacoes: document.getElementById('editObservacoes').value || '',
            prioridade: calculatePriority(document.getElementById('editData').value, document.getElementById('editHorario').value),
            // Preservar dados originais importantes
            criadoPor: editingAgendamento.criadoPor,
            criadoEm: editingAgendamento.criadoEm,
            compartilhadoPor: editingAgendamento.compartilhadoPor,
            compartilhadoEm: editingAgendamento.compartilhadoEm,
            concluidoPor: editingAgendamento.concluidoPor,
            concluidoEm: editingAgendamento.concluidoEm,
            canceladoPor: editingAgendamento.canceladoPor,
            canceladoEm: editingAgendamento.canceladoEm,
            motivoCancelamento: editingAgendamento.motivoCancelamento
        };
        
        console.log('Dados para atualização:', updatedData);
        
        const result = await ipcRenderer.invoke('updateAgendamento', updatedData);
        console.log('Update result:', result);
        
        await loadAgendamentos();
        closeEditModal();
        
        if (window.voiceManager) {
            window.voiceManager.speakAgendamentoAtualizado(updatedData.nomeCliente);
        }
        showToast('Agendamento atualizado com sucesso!', 'success');
    } catch (error) {
        console.error('Erro ao editar agendamento:', error);
        showToast(`Erro ao editar agendamento: ${error.message}`, 'error');
    }
}

// Abrir modal de cancelamento
function openCancelModal(id) {
    cancelingAgendamento = agendamentos.find(a => a.id === id);
    if (!cancelingAgendamento) return;
    
    // Limpar seleções anteriores
    clearCancelReasonSelection();
    
    document.getElementById('cancelModal').classList.add('show');
}

// Fechar modal de cancelamento
function closeCancelModal() {
    document.getElementById('cancelModal').classList.remove('show');
    clearCancelReasonSelection();
    cancelingAgendamento = null;
}

// Limpar seleção de motivos de cancelamento
function clearCancelReasonSelection() {
    const options = document.querySelectorAll('.cancel-reason-option');
    options.forEach(option => option.classList.remove('selected'));
    
    const errorMessage = document.getElementById('cancelErrorMessage');
    if (errorMessage) {
        errorMessage.classList.remove('show');
    }
}

// Selecionar motivo de cancelamento
function selectCancelReason(element, reason) {
    // Remover seleção anterior
    const options = document.querySelectorAll('.cancel-reason-option');
    options.forEach(option => option.classList.remove('selected'));
    
    // Selecionar nova opção
    element.classList.add('selected');
    
    // Armazenar o motivo selecionado
    element.setAttribute('data-reason', reason);
    
    // Esconder mensagem de erro se estiver visível
    const errorMessage = document.getElementById('cancelErrorMessage');
    if (errorMessage) {
        errorMessage.classList.remove('show');
    }
}

// Cancelar agendamento
async function handleCancelAgendamento(e) {
    e.preventDefault();
    
    if (!cancelingAgendamento) {
        console.error('Nenhum agendamento sendo cancelado');
        return;
    }
    
    // Verificar se um motivo foi selecionado
    const selectedOption = document.querySelector('.cancel-reason-option.selected');
    if (!selectedOption) {
        const errorMessage = document.getElementById('cancelErrorMessage');
        if (errorMessage) {
            errorMessage.classList.add('show');
        }
        return;
    }
    
    const reason = selectedOption.getAttribute('data-reason') || selectedOption.querySelector('.cancel-reason-label').textContent;
    const currentUser = window.currentUser ? window.currentUser.displayName : document.getElementById('userName').textContent;
    
    // Salvar referência antes de limpar
    const agendamentoParaCancelar = cancelingAgendamento;
    
    try {
        await ipcRenderer.invoke('updateAgendamento', {
            id: agendamentoParaCancelar.id,
            status: 'Cancelado',
            motivoCancelamento: reason,
            canceladoPor: currentUser,
            canceladoEm: new Date().toISOString()
        });
        
        await loadAgendamentos();
        closeCancelModal();
        
        // Notificação de voz
        if (window.voiceManager) {
            window.voiceManager.speakAgendamentoCancelado(agendamentoParaCancelar.nomeCliente);
        }
        
        console.log(`Agendamento de ${agendamentoParaCancelar.nomeCliente} cancelado com sucesso!`);
    } catch (error) {
        console.error('Erro ao cancelar agendamento:', error);
    }
}

// Função para o botão Voltar
function cancelCancelation() {
    closeCancelModal();
}

// Função para o botão Confirmar Cancelamento
function confirmCancelation() {
    const event = { preventDefault: () => {} };
    handleCancelAgendamento(event);
}



// Painéis do header
function toggleSoundPanel() {
    const panel = document.getElementById('soundPanel');
    const soundBtn = document.getElementById('soundBtn');
    
    // Se o painel está fechado, abrir
    if (!panel.classList.contains('show')) {
        panel.classList.add('show');
    } else {
        // Se está aberto, alternar mute
        toggleSoundMute();
    }
}

function toggleSoundMute() {
    const soundBtn = document.getElementById('soundBtn');
    
    // Alternar estado de mute
    window.soundMuted = !window.soundMuted;
    
    // Atualizar visual do botão
    if (window.soundMuted) {
        soundBtn.classList.add('muted');
        soundBtn.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
            </svg>
            <span class="btn-text">Som</span>
        `;
        
        // Desabilitar som e voz usando os novos sistemas
        if (window.soundManager) {
            window.soundManager.setEnabled(false);
        }
        if (window.voiceManager) {
            window.voiceManager.setEnabled(false);
            window.voiceManager.stopImmediately();
        }
        
        console.log('Som desligado - notificações de som e voz paradas');
    } else {
        soundBtn.classList.remove('muted');
        soundBtn.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
            </svg>
            <span class="btn-text">Som e Voz</span>
        `;
        
        // Reabilitar som e voz usando os novos sistemas
        if (window.soundManager) {
            window.soundManager.setEnabled(true);
        }
        if (window.voiceManager) {
            window.voiceManager.setEnabled(true);
        }
        
        console.log('Som ligado - notificações de som e voz reabilitadas');
    }
    
    // Salvar estado
    localStorage.setItem('soundMuted', window.soundMuted);
}

function closeSoundPanel() {
    document.getElementById('soundPanel').classList.remove('show');
}

// Inicializar estado visual do botão de som
function initializeSoundButtonState() {
    const soundBtn = document.getElementById('soundBtn');
    if (!soundBtn) return;
    
    if (window.soundMuted) {
        soundBtn.classList.add('muted');
        soundBtn.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
            </svg>
            <span class="btn-text">Som</span>
        `;
    } else {
        soundBtn.classList.remove('muted');
        soundBtn.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
            </svg>
            <span class="btn-text">Som e Voz</span>
        `;
    }
}

// Controles de som - agora gerenciados pelos novos sistemas sound-manager.js e voice-manager.js

// Logout
function handleLogout() {
    showCustomConfirm('Sair do Sistema', 'Tem certeza que deseja sair?', () => {
        ipcRenderer.invoke('logout');
    });
}

// Função de confirmação personalizada
function showCustomConfirm(title, message, onConfirm, onCancel = null) {
    return new Promise((resolve) => {
        const modal = document.getElementById('confirmModal');
        const titleElement = document.getElementById('confirmTitle');
        const messageElement = document.getElementById('confirmMessage');
        const okBtn = document.getElementById('confirmOkBtn');
        const cancelBtn = document.getElementById('confirmCancelBtn');
        
        if (!modal || !titleElement || !messageElement || !okBtn || !cancelBtn) {
            console.error('Elementos do modal de confirmação não encontrados');
            resolve(false);
            return;
        }
        
        // Configurar conteúdo
        titleElement.textContent = title;
        messageElement.textContent = message;
        
        // Mostrar modal
        modal.classList.add('show');
        
        // Função para fechar modal
        const closeModal = (result) => {
            modal.classList.remove('show');
            resolve(result);
            
            if (result && onConfirm) {
                onConfirm();
            } else if (!result && onCancel) {
                onCancel();
            }
        };
        
        // Event listeners
        const handleOk = () => {
            closeModal(true);
        };
        
        const handleCancel = () => {
            closeModal(false);
        };
        
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                handleCancel();
            }
        };
        
        const handleOutsideClick = (e) => {
            if (e.target === modal) {
                handleCancel();
            }
        };
        
        // Focar no botão cancelar por padrão
        cancelBtn.focus();
        
        // Limpar event listeners quando modal fechar
        const cleanup = () => {
            document.removeEventListener('keydown', handleEscape);
            modal.removeEventListener('click', handleOutsideClick);
        };
        
        // Modificar a função closeModal para incluir cleanup
        const originalCloseModal = closeModal;
        const closeModalWithCleanup = (result) => {
            cleanup();
            originalCloseModal(result);
        };
        
        // Redefinir os handlers para usar a versão com cleanup
        const handleOkWithCleanup = () => {
            closeModalWithCleanup(true);
        };
        
        const handleCancelWithCleanup = () => {
            closeModalWithCleanup(false);
        };
        
        const handleEscapeWithCleanup = (e) => {
            if (e.key === 'Escape') {
                handleCancelWithCleanup();
            }
        };
        
        const handleOutsideClickWithCleanup = (e) => {
            if (e.target === modal) {
                handleCancelWithCleanup();
            }
        };
        
        // Remover event listeners antigos se existirem
        okBtn.removeEventListener('click', handleOk);
        cancelBtn.removeEventListener('click', handleCancel);
        
        // Adicionar novos event listeners
        okBtn.addEventListener('click', handleOkWithCleanup, { once: true });
        cancelBtn.addEventListener('click', handleCancelWithCleanup, { once: true });
        document.addEventListener('keydown', handleEscapeWithCleanup);
        modal.addEventListener('click', handleOutsideClickWithCleanup);
    });
}

// Substituir confirm() padrão por nossa versão personalizada
window.confirm = function(message) {
    return showCustomConfirm('Confirmação', message);
};

// Tornar a função global para uso em outros arquivos
window.showCustomConfirm = showCustomConfirm;

// Verificar agendamentos esquecidos periodicamente
setInterval(() => {
    checkForgottenAgendamentos();
}, 60000); // Verificar a cada minuto

// Função de teste para criar agendamento atrasado (apenas para debug)
function createTestLateAppointment() {
    const now = new Date();
    const testTime = new Date(now.getTime() - 10 * 60 * 1000); // 10 minutos atrás
    const today = now.toISOString().split('T')[0];
    const timeString = testTime.toTimeString().slice(0, 5);
    
    const testAgendamento = {
        id: `test_${Date.now()}`,
        data: today,
        horario: timeString,
        nomeCliente: 'Cliente Teste Atraso',
        telefone: '(11) 99999-9999',
        servico: 'Teste de Notificação',
        status: 'Agendado',
        observacoes: 'Agendamento de teste para verificar notificações de atraso',
        prioridade: 'alta',
        createdAt: new Date().toISOString()
    };
    
    agendamentos.push(testAgendamento);
    filterAgendamentos();
    console.log('[TEST] Agendamento de teste criado:', testAgendamento);
    
    // Forçar verificação imediata
    setTimeout(() => {
        checkForgottenAgendamentos();
        if (window.notificationSystem) {
            window.notificationSystem.checkAppointments();
        }
    }, 1000);
}

// Tornar função disponível globalmente para teste
window.createTestLateAppointment = createTestLateAppointment;

function checkForgottenAgendamentos() {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const currentTime = now.toTimeString().slice(0, 5);
    
    console.log('[DEBUG] Verificando agendamentos atrasados:', {
        today,
        currentTime,
        totalAgendamentos: agendamentos.length
    });
    
    agendamentos.forEach(agendamento => {
        if (agendamento.data === today && 
            agendamento.status !== 'Concluído' && 
            agendamento.status !== 'Cancelado' &&
            agendamento.horario < currentTime) {
            
            const appointmentDateTime = new Date(`${agendamento.data}T${agendamento.horario}:00`);
            const timeDiff = now - appointmentDateTime;
            const minutesLate = Math.floor(timeDiff / (1000 * 60));
            
            console.log('[DEBUG] Agendamento atrasado encontrado:', {
                cliente: agendamento.nomeCliente,
                horario: agendamento.horario,
                minutosAtraso: minutesLate,
                status: agendamento.status
            });
            
            // Avisar a cada 5 minutos para atrasos até 30 minutos, depois a cada 15 minutos
            const shouldNotify = (minutesLate <= 30 && minutesLate % 5 === 0) || 
                               (minutesLate > 30 && minutesLate % 15 === 0);
            
            if (minutesLate > 0 && shouldNotify) {
                console.log('[DEBUG] Enviando notificação de voz para atraso:', {
                    cliente: agendamento.nomeCliente,
                    minutosAtraso: minutesLate,
                    voiceManagerDisponivel: !!window.voiceManager,
                    voiceEnabled: window.voiceManager ? window.voiceManager.isEnabled() : false
                });
                
                if (window.voiceManager) {
                    if (window.voiceManager.isEnabled()) {
                        window.voiceManager.speakAgendamentoAtrasado(agendamento.nomeCliente, minutesLate);
                        console.log('[DEBUG] Notificação de voz enviada com sucesso');
                    } else {
                        console.warn('[DEBUG] Notificações de voz estão desabilitadas');
                    }
                } else {
                    console.warn('[DEBUG] VoiceManager não está disponível');
                }
            }
        }
    });
}

// Mostrar notificação


// Modal de localização
let map = null;
let currentMapCoordinates = null;

function openLocationModal(agendamentoId) {
    console.log('=== INÍCIO openLocationModal ===');
    console.log('ID do agendamento recebido:', agendamentoId);

    // Buscar o agendamento pelo ID
    const agendamento = agendamentos.find(a => a.id === agendamentoId);
    if (!agendamento) {
        showToast('Agendamento não encontrado', 'error');
        return;
    }

    // Verificar se os endereços estão presentes
    if (!agendamento.enderecoOrigem || !agendamento.enderecoDestino) {
        showToast('Endereços de origem e destino são obrigatórios', 'error');
        return;
    }

    const modal = document.getElementById('locationModal');
    const citySpan = document.getElementById('currentCity');
    if (!modal || !citySpan) {
        showToast('Erro ao abrir o modal de localização', 'error');
        return;
    }

    // Armazenar informações do agendamento globalmente para uso posterior
    window.currentModalAgendamento = agendamento;
    citySpan.textContent = agendamento.cidade || 'Carregando...';
    modal.classList.add('show');

    setTimeout(() => {
        initializeMapWithAddresses(agendamento.enderecoOrigem, agendamento.enderecoDestino, agendamento.paradas || []);
    }, 100);

    console.log('=== FIM openLocationModal ===');
}

function closeLocationModal() {
    const modal = document.getElementById('locationModal');
    modal.classList.remove('show');
    
    // Destruir o mapa para evitar problemas
    if (map) {
        map.remove();
        map = null;
        currentMapCoordinates = null;
    }
}

// Nova função para inicializar mapa com endereços
async function initializeMapWithAddresses(enderecoOrigem, enderecoDestino, paradas = []) {
    console.log('=== INÍCIO initializeMapWithAddresses ===');
    console.log('Endereço origem:', enderecoOrigem);
    console.log('Endereço destino:', enderecoDestino);
    console.log('Paradas:', paradas);
    
    // Verificar se o Leaflet está disponível
    if (typeof L === 'undefined') {
        console.error('Leaflet não está carregado');
        showToast('Erro: Biblioteca de mapa não carregada', 'error');
        return;
    }
    
    // Destruir mapa existente se houver
    if (map) {
        console.log('Destruindo mapa existente...');
        map.remove();
        map = null;
    }
    
    // Verificar se o elemento do mapa existe
    const mapElement = document.getElementById('map');
    if (!mapElement) {
        console.error('Elemento do mapa não encontrado');
        showToast('Erro: Elemento do mapa não encontrado', 'error');
        return;
    }
    
    try {
        // Geocodificar endereços
        console.log('Geocodificando endereços...');
        const [coordOrigem, coordDestino] = await Promise.all([
            geocodeAddress(enderecoOrigem),
            geocodeAddress(enderecoDestino)
        ]);
        
        if (!coordOrigem || !coordDestino) {
            showToast('Erro ao localizar os endereços', 'error');
            return;
        }
        
        console.log('Coordenadas origem:', coordOrigem);
        console.log('Coordenadas destino:', coordDestino);
        
        // Inicializar mapa
        console.log('Inicializando mapa Leaflet...');
        map = L.map('map', {
            zoomControl: false,
            attributionControl: false
        });
        
        // Adicionar camada do OpenStreetMap
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(map);
        
        // Criar ícones personalizados
        const origemIcon = L.divIcon({
            className: 'custom-marker-origem',
            html: `
                <div style="
                    background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
                    width: 40px;
                    height: 40px;
                    border-radius: 50% 50% 50% 0;
                    transform: rotate(-45deg);
                    border: 4px solid white;
                    box-shadow: 0 4px 12px rgba(40, 167, 69, 0.4);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                ">
                    <div style="
                        color: white;
                        font-size: 16px;
                        font-weight: bold;
                        transform: rotate(45deg);
                        text-shadow: 0 1px 2px rgba(0,0,0,0.3);
                    ">O</div>
                </div>
            `,
            iconSize: [40, 40],
            iconAnchor: [20, 40]
        });
        
        const destinoIcon = L.divIcon({
            className: 'custom-marker-destino',
            html: `
                <div style="
                    background: linear-gradient(135deg, #dc3545 0%, #fd7e14 100%);
                    width: 40px;
                    height: 40px;
                    border-radius: 50% 50% 50% 0;
                    transform: rotate(-45deg);
                    border: 4px solid white;
                    box-shadow: 0 4px 12px rgba(220, 53, 69, 0.4);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                ">
                    <div style="
                        color: white;
                        font-size: 16px;
                        font-weight: bold;
                        transform: rotate(45deg);
                        text-shadow: 0 1px 2px rgba(0,0,0,0.3);
                    ">D</div>
                </div>
            `,
            iconSize: [40, 40],
            iconAnchor: [20, 40]
        });
        
        // Adicionar marcadores
        const markerOrigem = L.marker(coordOrigem, { icon: origemIcon })
            .addTo(map)
            .bindPopup(`<strong>Origem:</strong><br>${enderecoOrigem}`);
            
        const markerDestino = L.marker(coordDestino, { icon: destinoIcon })
            .addTo(map)
            .bindPopup(`<strong>Destino:</strong><br>${enderecoDestino}`);
        
        // Adicionar marcadores para paradas se existirem
        const coordParadas = [];
        if (paradas && paradas.length > 0) {
            for (let i = 0; i < paradas.length; i++) {
                const coordParada = await geocodeAddress(paradas[i]);
                if (coordParada) {
                    coordParadas.push(coordParada);
                    
                    const paradaIcon = L.divIcon({
                        className: 'custom-marker-parada',
                        html: `
                            <div style="
                                background: linear-gradient(135deg, #ffc107 0%, #fd7e14 100%);
                                width: 35px;
                                height: 35px;
                                border-radius: 50% 50% 50% 0;
                                transform: rotate(-45deg);
                                border: 3px solid white;
                                box-shadow: 0 3px 10px rgba(255, 193, 7, 0.4);
                                display: flex;
                                align-items: center;
                                justify-content: center;
                            ">
                                <div style="
                                    color: white;
                                    font-size: 14px;
                                    font-weight: bold;
                                    transform: rotate(45deg);
                                    text-shadow: 0 1px 2px rgba(0,0,0,0.3);
                                ">${i + 1}</div>
                            </div>
                        `,
                        iconSize: [35, 35],
                        iconAnchor: [17, 35]
                    });
                    
                    L.marker(coordParada, { icon: paradaIcon })
                        .addTo(map)
                        .bindPopup(`<strong>Parada ${i + 1}:</strong><br>${paradas[i]}`);
                }
            }
        }
        
        // Criar linha conectando os pontos
        const pontos = [coordOrigem, ...coordParadas, coordDestino];
        const polyline = L.polyline(pontos, {
            color: '#007bff',
            weight: 4,
            opacity: 0.8,
            dashArray: '10, 5'
        }).addTo(map);
        
        // Ajustar visualização para mostrar todos os pontos
        const group = new L.featureGroup([markerOrigem, markerDestino, polyline]);
        map.fitBounds(group.getBounds().pad(0.1));
        
        // Forçar redimensionamento do mapa
        setTimeout(() => {
            if (map) {
                map.invalidateSize();
                console.log('Mapa redimensionado');
            }
        }, 200);
        
        console.log('=== FIM initializeMapWithAddresses (SUCESSO) ===');
        
    } catch (error) {
        console.error('Erro ao inicializar mapa com endereços:', error);
        showToast('Erro ao carregar o mapa: ' + error.message, 'error');
    }
}

// Função para geocodificar endereços
async function geocodeAddress(address) {
    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`);
        const data = await response.json();
        
        if (data && data.length > 0) {
            return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
        }
        return null;
    } catch (error) {
        console.error('Erro ao geocodificar endereço:', address, error);
        return null;
    }
}

function initializeMap(coordinates) {
    console.log('=== INÍCIO initializeMap ===');
    console.log('Coordenadas recebidas:', coordinates);
    
    // Verificar se o Leaflet está disponível
    if (typeof L === 'undefined') {
        console.error('Leaflet não está carregado');
        showToast('Erro: Biblioteca de mapa não carregada', 'error');
        return;
    }
    
    // Destruir mapa existente se houver
    if (map) {
        console.log('Destruindo mapa existente...');
        map.remove();
        map = null;
    }
    
    // Parsear coordenadas (formato: "lat,lng" ou "lat, lng")
    const [lat, lng] = coordinates.split(',').map(coord => parseFloat(coord.trim()));
    console.log('Coordenadas parseadas:', { lat, lng });
    
    if (isNaN(lat) || isNaN(lng)) {
        console.error('Coordenadas inválidas após parsing');
        showToast('Coordenadas inválidas', 'error');
        return;
    }
    
    currentMapCoordinates = [lat, lng];
    console.log('Coordenadas atuais definidas:', currentMapCoordinates);
    
    // Verificar se o elemento do mapa existe
    const mapElement = document.getElementById('map');
    if (!mapElement) {
        console.error('Elemento do mapa não encontrado');
        showToast('Erro: Elemento do mapa não encontrado', 'error');
        return;
    }
    
    try {
        // Inicializar mapa
        console.log('Inicializando mapa Leaflet...');
        map = L.map('map', {
            zoomControl: false, // Remover controles padrão
            attributionControl: false // Remover atribuição padrão
        }).setView([lat, lng], 16); // Zoom mais próximo para melhor visualização
        
        console.log('Mapa inicializado com sucesso');
        
        // Adicionar camada do OpenStreetMap
        console.log('Adicionando camada do OpenStreetMap...');
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(map);
        
        console.log('Camada do OpenStreetMap adicionada');
        
        // Criar ícone personalizado para o marcador
        const customIcon = L.divIcon({
            className: 'custom-marker',
            html: `
                <div style="
                    background: linear-gradient(135deg, #FF6B00 0%, #FF8C00 100%);
                    width: 40px;
                    height: 40px;
                    border-radius: 50% 50% 50% 0;
                    transform: rotate(-45deg);
                    border: 4px solid white;
                    box-shadow: 0 4px 12px rgba(255, 107, 0, 0.4);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    position: relative;
                ">
                    <div style="
                        color: white;
                        font-size: 16px;
                        font-weight: bold;
                        transform: rotate(45deg);
                        text-shadow: 0 1px 2px rgba(0,0,0,0.3);
                    ">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2">
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                            <circle cx="12" cy="10" r="3"></circle>
                        </svg>
                    </div>
                </div>
            `,
            iconSize: [40, 40],
            iconAnchor: [20, 40]
        });
        
        console.log('Ícone personalizado criado');
        
        // Adicionar marcador personalizado
        const marker = L.marker([lat, lng], { icon: customIcon })
            .addTo(map)
            .openPopup();
        
        console.log('Marcador adicionado e popup aberto');
        
        // Forçar redimensionamento do mapa
        setTimeout(() => {
            if (map) {
                map.invalidateSize();
                console.log('Mapa redimensionado');
            }
        }, 200);
        
        console.log('=== FIM initializeMap (SUCESSO) ===');
        
    } catch (error) {
        console.error('Erro ao inicializar mapa:', error);
        showToast('Erro ao carregar o mapa: ' + error.message, 'error');
    }
}

// Função para buscar o nome da cidade usando reverse geocoding
async function fetchCityName(lat, lng) {
    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10&addressdetails=1`);
        const data = await response.json();
        
        if (data.address) {
            // Priorizar cidade, depois município, depois localidade
            const cityName = data.address.city || 
                           data.address.town || 
                           data.address.municipality || 
                           data.address.locality || 
                           data.address.village ||
                           data.address.county ||
                           'Localização desconhecida';
            
            return cityName;
        }
        
        return 'Localização desconhecida';
    } catch (error) {
        console.error('Erro na busca de cidade:', error);
        return 'Localização desconhecida';
    }
}

function openInGoogleMaps() {
    const coordinates = window.currentModalCoordinates;
    if (!coordinates) {
        showToast('Coordenadas não disponíveis', 'error');
        return;
    }
    
    const [lat, lng] = coordinates.split(',').map(coord => parseFloat(coord.trim()));
    
    if (!isNaN(lat) && !isNaN(lng)) {
        const googleMapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;
        require('electron').shell.openExternal(googleMapsUrl);
    } else {
        showToast('Coordenadas inválidas', 'error');
    }
}
function copyToClipboard(text) {
    // Verificar se o texto existe
    if (!text || text.trim() === '') {
        showToast('Nenhum contato para copiar', 'warning');
        return;
    }

    // Tentar usar a API moderna do clipboard
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text.trim()).then(() => {
            showToast(`Contato ${text.trim()} copiado para a área de transferência!`, 'success');
        }).catch(err => {
            console.error('Erro ao copiar com clipboard API:', err);
            // Fallback para método antigo
            fallbackCopyToClipboard(text);
        });
    } else {
        // Fallback para navegadores mais antigos
        fallbackCopyToClipboard(text);
    }
}

// Função fallback para copiar texto
function fallbackCopyToClipboard(text) {
    try {
        const textArea = document.createElement('textarea');
        textArea.value = text.trim();
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        
        if (successful) {
            showToast(`Contato ${text.trim()} copiado para a área de transferência!`, 'success');
        } else {
            showToast('Erro ao copiar contato', 'error');
        }
    } catch (err) {
        console.error('Erro no fallback de cópia:', err);
        showToast('Erro ao copiar contato', 'error');
    }
}

// Funções globais para os botões dos cards
window.concluirAgendamento = concluirAgendamento;
window.openEditModal = openEditModal;
window.openCancelModal = openCancelModal;
window.copyToClipboard = copyToClipboard;
window.openLocationModal = openLocationModal;

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
    // Listener para fechar modal com ESC e atalho de limpeza automática
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            const notificationsPanel = document.getElementById('notificationsPanel');
            if (notificationsPanel && notificationsPanel.style.display === 'block') {
                if (window.notificationSystem) {
                    window.notificationSystem.closePanel();
                }
            }
        }
        
        // Atalho Ctrl+Shift+Delete para limpeza automática
        if (e.ctrlKey && e.shiftKey && e.key === 'Delete') {
            e.preventDefault();
            quickAutoClear();
        }
    });
    
    // Event listeners para notificações
    const notificationsBtn = document.getElementById('notificationsBtn');
    if (notificationsBtn) {
        notificationsBtn.addEventListener('click', () => {

        });
    }
    
    const closeNotificationsBtn = document.getElementById('closeNotificationsBtn');
    if (closeNotificationsBtn) {
        closeNotificationsBtn.addEventListener('click', () => {
            
        });
    }
    
    const markAllReadBtn = document.getElementById('markAllReadBtn');

    
    // Carregar notificações ao inicializar

    

});

// Sistema de busca removido - interface simplificada

// ===== SISTEMA DE LIMPEZA DE DADOS =====

// Função para limpeza automática rápida (sem modal)
async function quickAutoClear() {
    try {
        const cleaner = window.dataCleaner;
        const result = await cleaner.clearAllDataNoConfirm();
        
        if (result && result.success) {
            // Recarregar dados
            await loadAgendamentos();
            
            // Atualizar estatísticas se disponível
            if (typeof updateDataStats === 'function') {
                updateDataStats();
            }
            
            console.log(`[SUCCESS] Limpeza automática: ${result.deletedCount} agendamentos removidos`);
        } else {
            throw new Error(result?.error || 'Erro desconhecido na limpeza automática');
        }
    } catch (error) {
        console.error('Erro na limpeza automática:', error);
        showToast(`Erro na limpeza automática: ${error.message}`, 'error');
    }
}

// Mostrar modal de confirmação para limpeza de dados (DESABILITADO - Lixeira agora funciona diretamente)
/*
function showClearDataModal() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content clear-data-modal">
            <div class="modal-header">
                <h3>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M3 6H5H21" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6M19 6V20C19 20.5304 18.7893 21.0391 18.4142 21.4142C18.0391 21.7893 17.5304 22 17 22H7C6.46957 22 5.96086 21.7893 5.58579 21.4142C5.21071 21.0391 5 20.5304 5 20V6H19Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M10 11V17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M14 11V17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    Limpar Dados de Agendamento
                </h3>
                <button type="button" class="close-modal" onclick="closeClearDataModal()">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </button>
            </div>
            <div class="modal-body">
                <div class="warning-message">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 9V13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M12 17H12.01" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M10.29 3.86L1.82 18C1.64751 18.3024 1.55492 18.6453 1.55492 18.995C1.55492 19.3447 1.64751 19.6876 1.82 19.99C1.99249 20.2924 2.23862 20.5386 2.53902 20.7111C2.83942 20.8836 3.18234 20.9761 3.53 20.98H20.47C20.8177 20.9761 21.1606 20.8836 21.461 20.7111C21.7614 20.5386 22.0075 20.2924 22.18 19.99C22.3525 19.6876 22.4451 19.3447 22.4451 18.995C22.4451 18.6453 22.3525 18.3024 22.18 18L13.71 3.86C13.5375 3.55764 13.2914 3.31148 12.991 3.13898C12.6906 2.96648 12.3477 2.87389 11.998 2.87389C11.6483 2.87389 11.3054 2.96648 11.005 3.13898C10.7046 3.31148 10.4585 3.55764 10.286 3.86H10.29Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    <strong>Atenção:</strong> Esta ação não pode ser desfeita!
                </div>
                <p>Escolha o tipo de limpeza que deseja realizar:</p>
                
                <div class="clear-options">
                    <div class="clear-option">
                        <input type="radio" id="clearOld" name="clearType" value="old">
                        <label for="clearOld">
                            <div class="option-icon">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                                    <polyline points="12,6 12,12 16,14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                </svg>
                            </div>
                            <div class="option-content">
                                <strong>Limpar agendamentos antigos</strong>
                                <span>Remove agendamentos com mais de 30 dias</span>
                            </div>
                        </label>
                    </div>
                    
                    <div class="clear-option">
                        <input type="radio" id="clearCompleted" name="clearType" value="completed">
                        <label for="clearCompleted">
                            <div class="option-icon">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M22 11.08V12C21.9988 14.1564 21.3005 16.2547 20.0093 17.9818C18.7182 19.7088 16.9033 20.9725 14.8354 21.5839C12.7674 22.1953 10.5573 22.1219 8.53447 21.3746C6.51168 20.6273 4.78465 19.2461 3.61096 17.4371C2.43727 15.628 1.87979 13.4905 2.02168 11.3363C2.16356 9.18203 2.99721 7.13214 4.39828 5.49883C5.79935 3.86553 7.69279 2.72636 9.79619 2.24223C11.8996 1.75809 14.1003 1.95185 16.07 2.79999" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                    <polyline points="22,4 12,14.01 9,11.01" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                </svg>
                            </div>
                            <div class="option-content">
                                <strong>Limpar agendamentos concluídos</strong>
                                <span>Remove todos os agendamentos concluídos</span>
                            </div>
                        </label>
                    </div>
                    
                    <div class="clear-option">
                        <input type="radio" id="clearCanceled" name="clearType" value="canceled">
                        <label for="clearCanceled">
                            <div class="option-icon">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                                    <line x1="15" y1="9" x2="9" y2="15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                                    <line x1="9" y1="9" x2="15" y2="15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                                </svg>
                            </div>
                            <div class="option-content">
                                <strong>Limpar agendamentos cancelados</strong>
                                <span>Remove todos os agendamentos cancelados</span>
                            </div>
                        </label>
                    </div>
                    
                    <div class="clear-option">
                        <input type="radio" id="clearDuplicates" name="clearType" value="duplicates">
                        <label for="clearDuplicates">
                            <div class="option-icon">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                    <path d="M5 15H4C3.46957 15 2.96086 14.7893 2.58579 14.4142C2.21071 14.0391 2 13.5304 2 13V4C2 3.46957 2.21071 2.96086 2.58579 2.58579C2.96086 2.21071 3.46957 2 4 2H13C13.5304 2 14.0391 2.21071 14.4142 2.58579C14.7893 2.96086 15 3.46957 15 4V5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                </svg>
                            </div>
                            <div class="option-content">
                                <strong>Remover duplicatas</strong>
                                <span>Remove agendamentos duplicados</span>
                            </div>
                        </label>
                    </div>
                    
                    <div class="clear-option danger">
                        <input type="radio" id="clearAll" name="clearType" value="all">
                        <label for="clearAll">
                            <div class="option-icon">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M12 9V13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                    <path d="M12 17H12.01" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                    <path d="M10.29 3.86L1.82 18C1.64751 18.3024 1.55492 18.6453 1.55492 18.995C1.55492 19.3447 1.64751 19.6876 1.82 19.99C1.99249 20.2924 2.23862 20.5386 2.53902 20.7111C2.83942 20.8836 3.18234 20.9761 3.53 20.98H20.47C20.8177 20.9761 21.1606 20.8836 21.461 20.7111C21.7614 20.5386 22.0075 20.2924 22.18 19.99C22.3525 19.6876 22.4451 19.3447 22.4451 18.995C22.4451 18.6453 22.3525 18.3024 22.18 18L13.71 3.86C13.5375 3.55764 13.2914 3.31148 12.991 3.13898C12.6906 2.96648 12.3477 2.87389 11.998 2.87389C11.6483 2.87389 11.3054 2.96648 11.005 3.13898C10.7046 3.31148 10.4585 3.55764 10.286 3.86H10.29Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                </svg>
                            </div>
                            <div class="option-content">
                                <strong>Limpar todos os dados</strong>
                                <span>Remove TODOS os agendamentos</span>
                            </div>
                        </label>
                    </div>
                    
                    <div class="clear-option auto-clear">
                        <input type="radio" id="clearAllAuto" name="clearType" value="auto">
                        <label for="clearAllAuto">
                            <div class="option-icon">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M3 6H5H21" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                    <path d="M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6M19 6V20C19 20.5304 18.7893 21.0391 18.4142 21.4142C18.0391 21.7893 17.5304 22 17 22H7C6.46957 22 5.96086 21.7893 5.58579 21.4142C5.21071 21.0391 5 20.5304 5 20V6H19Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                    <path d="M10 11V17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                    <path d="M14 11V17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                    <circle cx="18" cy="6" r="3" fill="#28a745"/>
                                </svg>
                            </div>
                            <div class="option-content">
                                <strong>Lixeira Automática</strong>
                                <span>Remove TODOS os agendamentos SEM confirmação</span>
                            </div>
                        </label>
                    </div>
                </div>
                
                <div class="data-stats" id="dataStats">
                    <h4>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M9 11H15M9 15H15M17 21H7C5.89543 21 5 20.1046 5 19V5C5 3.89543 5.89543 3 7 3H12.5858C12.851 3 13.1054 3.10536 13.2929 3.29289L19.7071 9.70711C19.8946 9.89464 20 10.149 20 10.4142V19C20 20.1046 19.1046 21 18 21H17Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                        Estatísticas dos Dados:
                    </h4>
                    <div class="stats-grid">
                        <div class="stat-item">
                            <span class="stat-label">Total:</span>
                            <span class="stat-value" id="totalCount">0</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Hoje:</span>
                            <span class="stat-value" id="todayCount">0</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Futuros:</span>
                            <span class="stat-value" id="futureCount">0</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Concluídos:</span>
                            <span class="stat-value" id="completedCount">0</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Cancelados:</span>
                            <span class="stat-value" id="canceledCount">0</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Antigos (>30d):</span>
                            <span class="stat-value" id="oldCount">0</span>
                        </div>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" onclick="closeClearDataModal()">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    Cancelar
                </button>
                <button type="button" class="btn btn-danger" onclick="confirmClearData()">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M3 6H5H21" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6M19 6V20C19 20.5304 18.7893 21.0391 18.4142 21.4142C18.0391 21.7893 17.5304 22 17 22H7C6.46957 22 5.96086 21.7893 5.58579 21.4142C5.21071 21.0391 5 20.5304 5 20V6H19Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M10 11V17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M14 11V17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    Limpar Dados
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    updateDataStats();

    // Adicionar estilos específicos para o modal
    const style = document.createElement('style');
    style.textContent = `
        .clear-data-modal {
            max-width: 600px;
            width: 90%;
        }
        
        .warning-message {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 15px;
            background: #fff3cd;
            border: 1px solid #ffeaa7;
            border-radius: 8px;
            margin-bottom: 20px;
            color: #856404;
        }
        
        .warning-message svg {
            color: #f39c12;
            flex-shrink: 0;
        }
        
        .clear-options {
            margin: 20px 0;
        }
        
        .clear-option {
            margin-bottom: 15px;
            border: 2px solid var(--border-color);
            border-radius: 12px;
            transition: all 0.3s ease;
            overflow: hidden;
        }
        
        .clear-option:hover {
            border-color: #FF6B00;
            background: var(--bg-secondary);
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(255, 107, 0, 0.15);
        }
        
        .clear-option.danger:hover {
            border-color: #e74c3c;
            box-shadow: 0 4px 12px rgba(231, 76, 60, 0.15);
        }
        
        .clear-option input[type="radio"] {
            position: absolute;
            opacity: 0;
            pointer-events: none;
        }
        
        .clear-option input[type="radio"]:checked + label {
            background: linear-gradient(135deg, #FF6B00, #ff8533);
            color: white;
            border-color: #FF6B00;
        }
        
        .clear-option.danger input[type="radio"]:checked + label {
            background: linear-gradient(135deg, #e74c3c, #c0392b);
            border-color: #e74c3c;
        }
        
        .clear-option input[type="radio"]:checked + label .option-icon svg {
            color: white;
        }
        
        .clear-option input[type="radio"]:checked + label .option-content strong,
        .clear-option input[type="radio"]:checked + label .option-content span {
            color: white;
        }
        
        .clear-option label {
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 15px;
            padding: 20px;
            margin: 0;
            transition: all 0.3s ease;
        }
        
        .option-icon {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 48px;
            height: 48px;
            background: var(--bg-secondary);
            border-radius: 12px;
            flex-shrink: 0;
            transition: all 0.3s ease;
        }
        
        .option-icon svg {
            color: #FF6B00;
            transition: all 0.3s ease;
        }
        
        .clear-option.danger .option-icon svg {
            color: #e74c3c;
        }
        
        .option-content {
            flex: 1;
        }
        
        .option-content strong {
            display: block;
            margin-bottom: 5px;
            color: var(--text-primary);
            font-size: 16px;
            font-weight: 600;
        }
        
        .option-content span {
            color: var(--text-secondary);
            font-size: 14px;
            line-height: 1.4;
        }
        
        .data-stats {
            background: var(--bg-secondary);
            padding: 25px;
            border-radius: 12px;
            margin-top: 25px;
            border: 1px solid var(--border-color);
        }
        
        .data-stats h4 {
            margin-bottom: 20px;
            color: var(--text-primary);
            display: flex;
            align-items: center;
            gap: 10px;
            font-size: 18px;
            font-weight: 600;
        }
        
        .data-stats h4 svg {
            color: #FF6B00;
        }
        
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 15px;
        }
        
        .stat-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px 16px;
            background: var(--bg-primary);
            border-radius: 8px;
            border: 1px solid var(--border-color);
            transition: all 0.3s ease;
        }
        
        .stat-item:hover {
            transform: translateY(-1px);
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }
        
        .stat-label {
            color: var(--text-secondary);
            font-weight: 500;
        }
        
        .stat-value {
            font-weight: 700;
            color: var(--text-primary);
            font-size: 16px;
        }
        
        .modal-header h3 {
            display: flex;
            align-items: center;
            gap: 12px;
            font-size: 20px;
            font-weight: 600;
        }
        
        .modal-header h3 svg {
            color: #FF6B00;
        }
        
        .close-modal {
            background: none;
            border: none;
            padding: 8px;
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.3s ease;
            color: var(--text-secondary);
        }
        
        .close-modal:hover {
            background: var(--bg-secondary);
            color: var(--text-primary);
        }
        
        .modal-footer .btn {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 12px 24px;
            font-weight: 600;
            border-radius: 8px;
            transition: all 0.3s ease;
        }
        
        .modal-footer .btn:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }
        
        .modal-footer .btn svg {
            flex-shrink: 0;
        }
        
        @media (max-width: 768px) {
            .clear-data-modal {
                width: 95%;
                max-width: none;
            }
            
            .option-icon {
                width: 40px;
                height: 40px;
            }
            
            .clear-option label {
                padding: 15px;
                gap: 12px;
            }
            
            .stats-grid {
                grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
                gap: 10px;
            }
            
            .stat-item {
                padding: 10px 12px;
            }
            
            .modal-footer {
                flex-direction: column;
                gap: 10px;
            }
            
            .modal-footer .btn {
                width: 100%;
                justify-content: center;
            }
        }
    `;
    document.head.appendChild(style);
}
*/

// Fechar modal de limpeza de dados (DESABILITADO - Lixeira agora funciona diretamente)
/*
function closeClearDataModal() {
    const modal = document.querySelector('.modal-overlay');
    if (modal) {
        modal.remove();
    }
}
*/

// Atualizar estatísticas dos dados (DESABILITADO - Não é mais necessário)
/*
function updateDataStats() {
    if (!agendamentos) return;

    const today = new Date().toISOString().split('T')[0];
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];

    const stats = {
        total: agendamentos.length,
        today: agendamentos.filter(a => a.data === today).length,
        future: agendamentos.filter(a => a.data > today).length,
        completed: agendamentos.filter(a => a.status === 'Concluído').length,
        canceled: agendamentos.filter(a => a.status === 'Cancelado').length,
        old: agendamentos.filter(a => a.data < thirtyDaysAgoStr).length
    };

    document.getElementById('totalCount').textContent = stats.total;
    document.getElementById('todayCount').textContent = stats.today;
    document.getElementById('futureCount').textContent = stats.future;
    document.getElementById('completedCount').textContent = stats.completed;
    document.getElementById('canceledCount').textContent = stats.canceled;
    document.getElementById('oldCount').textContent = stats.old;
}
*/

// Confirmar limpeza de dados (DESABILITADO - Lixeira agora funciona diretamente)
/*
async function confirmClearData() {
    const selectedType = document.querySelector('input[name="clearType"]:checked');
    
    if (!selectedType) {
        showToast('Por favor, selecione um tipo de limpeza', 'error');
        return;
    }

    const clearType = selectedType.value;
    const button = document.querySelector('.btn-danger');
    
    // Desabilitar botão durante o processamento
    button.disabled = true;
    button.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2"/>
        </svg>
        Processando...
    `;
    
    try {
        let result;
        let message;
        let confirmMessage = '';

        // Definir mensagens de confirmação específicas
        switch (clearType) {
            case 'old':
                confirmMessage = 'Tem certeza que deseja remover todos os agendamentos com mais de 30 dias?';
                break;
            case 'completed':
                confirmMessage = 'Tem certeza que deseja remover todos os agendamentos concluídos?';
                break;
            case 'canceled':
                confirmMessage = 'Tem certeza que deseja remover todos os agendamentos cancelados?';
                break;
            case 'duplicates':
                confirmMessage = 'Tem certeza que deseja remover agendamentos duplicados?';
                break;
            case 'all':
                confirmMessage = 'ATENÇÃO: Isso irá remover TODOS os agendamentos permanentemente. Esta ação não pode ser desfeita. Tem certeza absoluta?';
                break;
            case 'auto':
                // Limpeza automática - sem confirmação
                confirmMessage = null;
                break;
        }

        // Confirmar ação (exceto para limpeza automática)
        if (confirmMessage) {
            const confirmed = await showCustomConfirm('Limpeza de Dados', confirmMessage);
            if (!confirmed) {
                // Restaurar botão
                button.disabled = false;
                button.innerHTML = `
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M3 6H5H21" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6M19 6V20C19 20.5304 18.7893 21.0391 18.4142 21.4142C18.0391 21.7893 17.5304 22 17 22H7C6.46957 22 5.96086 21.7893 5.58579 21.4142C5.21071 21.0391 5 20.5304 5 20V6H19Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M10 11V17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M14 11V17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    Limpar Dados
                `;
                return;
            }
        }

        // Usar a instância global do data cleaner
        const cleaner = window.dataCleaner;

        switch (clearType) {
            case 'old':
                result = await cleaner.clearOldAppointments();
                message = `${result.deletedCount} agendamentos antigos removidos com sucesso`;
                break;
            case 'completed':
                result = await cleaner.clearCompletedAppointments();
                message = `${result.deletedCount} agendamentos concluídos removidos com sucesso`;
                break;
            case 'canceled':
                result = await cleaner.clearCanceledAppointments();
                message = `${result.deletedCount} agendamentos cancelados removidos com sucesso`;
                break;
            case 'duplicates':
                result = await cleaner.removeDuplicateAppointments();
                message = `${result.deletedCount} agendamentos duplicados removidos com sucesso`;
                break;
            case 'all':
                result = await cleaner.clearAllData();
                message = 'Todos os dados foram removidos com sucesso';
                break;
            case 'auto':
                result = await cleaner.clearAllDataNoConfirm();
                message = `Lixeira automática: ${result.deletedCount} agendamentos removidos`;
                break;
            default:
                throw new Error('Tipo de limpeza inválido');
        }

        if (result && result.success) {
            showToast(message, 'success');
            
            // Recarregar dados
            await loadAgendamentos();
            
            // Atualizar estatísticas
            updateDataStats();
            
            // Fechar modal após um pequeno delay
            setTimeout(() => {
                closeClearDataModal();
            }, 1500);
        } else {
            throw new Error(result?.error || 'Erro desconhecido ao limpar dados');
        }

    } catch (error) {
        console.error('Erro ao limpar dados:', error);
        showToast(`Erro ao limpar dados: ${error.message}`, 'error');
        
        // Restaurar botão
        button.disabled = false;
        button.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 6H5H21" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6M19 6V20C19 20.5304 18.7893 21.0391 18.4142 21.4142C18.0391 21.7893 17.5304 22 17 22H7C6.46957 22 5.96086 21.7893 5.58579 21.4142C5.21071 21.0391 5 20.5304 5 20V6H19Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M10 11V17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M14 11V17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            Limpar Dados
        `;
    }
}
*/

// ===== INTEGRAÇÃO WEBSOCKET =====

// Inicializar WebSocket
async function initializeWebSocket() {
    try {
        if (!window.wsClient) {
            console.warn('Cliente WebSocket não encontrado');
            return;
        }

        console.log('[INFO] Tentando conectar ao WebSocket...');
        
        // Primeiro, verificar se o servidor está rodando
        const isServerRunning = await checkWebSocketServer();
        
        if (!isServerRunning) {
            console.log('[INFO] Servidor WebSocket não está rodando, tentando iniciar automaticamente...');
            
            // Tentar iniciar o servidor automaticamente
            const serverStarted = await startWebSocketServer();
            
            if (!serverStarted) {
                console.warn('[WARNING] Não foi possível iniciar o servidor WebSocket automaticamente');
                safeShowToast('Modo offline - servidor WebSocket não disponível', 'warning');
                return;
            }
        }
        
        // Conectar ao servidor com retry
        const connected = await connectWithRetry();
        
        if (connected && window.currentUser) {
            // Autenticar usuário
            window.wsClient.authenticate(
                window.currentUser.id,
                window.currentUser.username,
                window.currentUser.displayName || window.currentUser.username
            );

            // Configurar manipuladores de eventos
            setupWebSocketEventHandlers();
            
            console.log('[SUCCESS] WebSocket inicializado com sucesso');
            safeShowToast('Conectado ao servidor em tempo real', 'success');
        } else {
            console.warn('[WARNING] Não foi possível conectar ao WebSocket');
            safeShowToast('Modo offline - algumas funcionalidades limitadas', 'warning');
        }
    } catch (error) {
        console.error('[ERROR] Erro ao inicializar WebSocket:', error);
        safeShowToast('Erro de conexão - funcionando em modo offline', 'warning');
    }
}

// Verificar se o servidor WebSocket está rodando
async function checkWebSocketServer() {
    return new Promise((resolve) => {
        // Usar fetch para verificar se o servidor está respondendo
        fetch('http://localhost:3000/status', {
            method: 'GET',
            mode: 'no-cors', // Para evitar problemas de CORS
            cache: 'no-cache'
        })
        .then(response => {
            console.log('[INFO] Servidor WebSocket está respondendo');
            resolve(true);
        })
        .catch(error => {
            console.log('[INFO] Servidor WebSocket não está respondendo:', error.message);
            resolve(false);
        });
        
        // Timeout de 3 segundos
        setTimeout(() => {
            resolve(false);
        }, 3000);
    });
}

// Iniciar servidor WebSocket automaticamente
async function startWebSocketServer() {
    try {
        console.log('[INFO] Iniciando servidor WebSocket automaticamente...');
        
        // Usar IPC para comunicar com o processo principal do Electron
        const result = await window.ipcRenderer.invoke('startWebSocketServer');
        
        if (result && result.success) {
            console.log('[SUCCESS] Servidor WebSocket iniciado automaticamente');
            return true;
        } else {
            console.error('[ERROR] Falha ao iniciar servidor WebSocket:', result?.error || 'Erro desconhecido');
            return false;
        }
    } catch (error) {
        console.error('[ERROR] Erro ao iniciar servidor WebSocket:', error);
        return false;
    }
}

// Conectar com retry
async function connectWithRetry(maxAttempts = 3) {
    // Primeiro, tentar a porta padrão (3000) com mais tentativas
    console.log('[INFO] Tentando conectar na porta padrão 3000...');
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            console.log(`[INFO] Tentativa ${attempt}/${maxAttempts} na porta 3000`);
            
            const connected = await window.wsClient.connect('http://localhost:3000');
            if (connected) {
                console.log('[SUCCESS] Conectado na porta padrão 3000');
                safeShowToast('WebSocket conectado com sucesso', 'success');
                return true;
            }
            
            // Aguardar antes da próxima tentativa
            if (attempt < maxAttempts) {
                console.log(`[INFO] Aguardando 3 segundos antes da próxima tentativa...`);
                await new Promise(resolve => setTimeout(resolve, 3000));
            }
            
        } catch (error) {
            console.error(`[ERROR] Tentativa ${attempt} na porta 3000 falhou:`, error);
            
            if (attempt < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, 3000));
            }
        }
    }
    
    // Se a porta padrão falhou, não tentar portas alternativas - usar apenas 3000
    console.warn('[WARNING] Não foi possível conectar na porta 3000');
    safeShowToast('Modo offline - WebSocket não disponível', 'warning');
    return false;
}

// Configurar manipuladores de eventos WebSocket
function setupWebSocketEventHandlers() {
    if (!window.wsClient) return;

    // Atualização de agendamento
    window.wsClient.on('agendamento:update', (data) => {
        handleWebSocketAgendamentoUpdate(data);
    });

    // Agendamento transferido
    window.wsClient.on('agendamento:shared', (data) => {
        handleWebSocketAgendamentoShared(data);
    });

}

// Manipular atualização de agendamento via WebSocket
function handleWebSocketAgendamentoUpdate(data) {
    const { action, agendamento } = data;
    
    switch (action) {
        case 'created':
            // Adicionar novo agendamento se não existir
            if (!agendamentos.find(a => a.id === agendamento.id)) {
                agendamentos.push(agendamento);
                filterAgendamentos();
                showToast(`Novo agendamento: ${agendamento.cliente}`, 'info');
            }
            break;
            
        case 'updated':
            // Atualizar agendamento existente
            const index = agendamentos.findIndex(a => a.id === agendamento.id);
            if (index !== -1) {
                agendamentos[index] = agendamento;
                filterAgendamentos();
                showToast(`Agendamento atualizado: ${agendamento.cliente}`, 'info');
            }
            break;
            
        case 'deleted':
            // Remover agendamento
            const deleteIndex = agendamentos.findIndex(a => a.id === agendamento.id);
            if (deleteIndex !== -1) {
                agendamentos.splice(deleteIndex, 1);
                filterAgendamentos();
                showToast(`Agendamento removido: ${agendamento.cliente}`, 'info');
            }
            break;
    }
}

// Manipular agendamento transferido via WebSocket
function handleWebSocketAgendamentoShared(data) {
    const { agendamento, fromUser, message } = data;
    
    // Adicionar agendamento transferido
    if (!agendamentos.find(a => a.id === agendamento.id)) {
        agendamentos.push(agendamento);
        filterAgendamentos();
    }
    
    // Mostrar notificação
    showToast(`Agendamento transferido por ${fromUser.displayName}`, 'info');
}

// Função global para atualizar agendamento via WebSocket
window.updateAgendamentoFromWebSocket = handleWebSocketAgendamentoUpdate;

// ===== GERENCIAMENTO DE PARADAS DINÂMICAS =====

let paradaCounter = 1; // Começar com 1 porque já temos uma parada inicial
let editParadaCounter = 1; // Começar com 1 porque já temos uma parada inicial

// Função para adicionar nova parada no formulário de criação
function addParada() {
    const container = document.getElementById('paradas-container');
    
    // Mostrar o container se estiver oculto
    if (container.style.display === 'none') {
        container.style.display = 'block';
        // Focar no primeiro campo de parada
        const firstInput = container.querySelector('.parada-input');
        if (firstInput) {
            setTimeout(() => firstInput.focus(), 100);
        }
        return;
    }
    
    // Verificar se já existem 2 paradas
    const existingParadas = container.querySelectorAll('.parada-item');
    if (existingParadas.length >= 2) {
        Swal.fire({
            title: '<i class="fa-solid fa-exclamation-triangle"></i> Limite Atingido',
            text: 'Máximo de 2 paradas permitidas por agendamento.',
            icon: 'warning',
            background: '#ffffff',
            customClass: {
                popup: 'swal-popup-modern',
                title: 'swal-title-modern'
            }
        });
        return;
    }
    
    paradaCounter++;
    
    const paradaItem = document.createElement('div');
    paradaItem.className = 'parada-item';
    paradaItem.setAttribute('data-parada', paradaCounter);
    
    paradaItem.innerHTML = `
        <div class="form-group">
            <input type="text" id="parada${paradaCounter}" name="parada${paradaCounter}" placeholder="Ex: Shopping Center, Praça Central">
            <button type="button" class="btn-remove-parada" onclick="removeParada(${paradaCounter})">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    
    container.appendChild(paradaItem);
    
    // Desabilitar botão de adicionar se chegou ao limite
    if (container.querySelectorAll('.parada-item').length >= 2) {
        const addButton = document.querySelector('.btn-add-parada-clean');
        if (addButton) {
            addButton.disabled = true;
            addButton.style.opacity = '0.5';
            addButton.style.cursor = 'not-allowed';
        }
    }
}

// Função para remover parada do formulário de criação
function removeParada(param) {
    let paradaItem;
    
    // Se o parâmetro é um elemento (botão clicado)
    if (typeof param === 'object' && param.nodeType) {
        paradaItem = param.closest('.parada-item');
    } 
    // Se o parâmetro é um número (ID da parada)
    else if (typeof param === 'number' || typeof param === 'string') {
        paradaItem = document.querySelector(`[data-parada="${param}"]`);
    }
    
    if (paradaItem) {
        // Adicionar animação de saída
        paradaItem.style.transition = 'all 0.3s ease';
        paradaItem.style.transform = 'scale(0.8)';
        paradaItem.style.opacity = '0';
        
        setTimeout(() => {
            paradaItem.remove();
            
            // Reabilitar botão de adicionar se estiver abaixo do limite
            const container = document.getElementById('paradas-container');
            const remainingParadas = container.querySelectorAll('.parada-item');
            
            // Se não há mais paradas, ocultar o container
            if (remainingParadas.length === 0) {
                container.style.display = 'none';
            }
            
            if (remainingParadas.length < 2) {
                const addButton = document.querySelector('.btn-add-parada-clean');
                if (addButton) {
                    addButton.disabled = false;
                    addButton.style.opacity = '1';
                    addButton.style.cursor = 'pointer';
                }
            }
        }, 300);
    }
}

// Função para adicionar nova parada no modal de edição
function addEditParada() {
    const container = document.getElementById('edit-paradas-container');
    
    // Mostrar o container se estiver oculto
    if (container.style.display === 'none') {
        container.style.display = 'block';
        // Focar no primeiro campo de parada
        const firstInput = container.querySelector('.parada-input');
        if (firstInput) {
            setTimeout(() => firstInput.focus(), 100);
        }
        return;
    }
    
    // Verificar se já existem 2 paradas
    const existingParadas = container.querySelectorAll('.parada-item');
    if (existingParadas.length >= 2) {
        Swal.fire({
            title: '<i class="fa-solid fa-exclamation-triangle"></i> Limite Atingido',
            text: 'Máximo de 2 paradas permitidas por agendamento.',
            icon: 'warning',
            background: '#ffffff',
            customClass: {
                popup: 'swal-popup-modern',
                title: 'swal-title-modern'
            }
        });
        return;
    }
    
    editParadaCounter++;
    
    const paradaItem = document.createElement('div');
    paradaItem.className = 'parada-item';
    paradaItem.setAttribute('data-parada', editParadaCounter);
    
    paradaItem.innerHTML = `
        <div class="form-group">
            <input type="text" id="editParada${editParadaCounter}" name="editParada${editParadaCounter}" placeholder="Ex: Shopping Center, Praça Central">
            <button type="button" class="btn-remove-parada" onclick="removeEditParada(${editParadaCounter})">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    
    container.appendChild(paradaItem);
    
    // Desabilitar botão de adicionar se chegou ao limite
    if (container.querySelectorAll('.parada-item').length >= 2) {
        const addButton = document.querySelector('#editModal .btn-add-parada-clean');
        if (addButton) {
            addButton.disabled = true;
            addButton.style.opacity = '0.5';
            addButton.style.cursor = 'not-allowed';
        }
    }
}

// Função para remover parada do modal de edição
function removeEditParada(param) {
    let paradaItem;
    
    // Se o parâmetro é um elemento (botão clicado)
    if (typeof param === 'object' && param.nodeType) {
        paradaItem = param.closest('.parada-item');
    } 
    // Se o parâmetro é um número (ID da parada)
    else if (typeof param === 'number' || typeof param === 'string') {
        paradaItem = document.querySelector('#edit-paradas-container [data-parada="' + param + '"]');
    }
    
    if (paradaItem) {
        // Adicionar animação de saída
        paradaItem.style.transition = 'all 0.3s ease';
        paradaItem.style.transform = 'scale(0.8)';
        paradaItem.style.opacity = '0';
        
        setTimeout(() => {
            paradaItem.remove();
            
            // Reabilitar botão de adicionar se estiver abaixo do limite
            const container = document.getElementById('edit-paradas-container');
            const remainingParadas = container.querySelectorAll('.parada-item');
            
            // Se não há mais paradas, ocultar o container
            if (remainingParadas.length === 0) {
                container.style.display = 'none';
            }
            
            if (remainingParadas.length < 2) {
                const addButton = document.querySelector('#editModal .btn-add-parada-clean');
                if (addButton) {
                    addButton.disabled = false;
                    addButton.style.opacity = '1';
                    addButton.style.cursor = 'pointer';
                }
            }
        }, 300);
    }
}

// Função para coletar todas as paradas do formulário
function collectParadas(prefix = '') {
    const paradas = [];
    const container = document.getElementById(prefix ? 'edit-paradas-container' : 'paradas-container');
    const inputs = container.querySelectorAll('input[type="text"]');
    
    inputs.forEach(input => {
        if (input.value.trim()) {
            paradas.push(input.value.trim());
        }
    });
    
    return paradas;
}

// Função para popular paradas no modal de edição
function populateEditParadas(agendamento) {
    const container = document.getElementById('edit-paradas-container');
    
    // Extrair paradas do objeto agendamento
    const paradas = agendamento.paradas || [];
    
    // Limpar container
    container.innerHTML = '';
    editParadaCounter = 0;
    
    // Se não há paradas, ocultar o container e adicionar uma parada vazia
    if (!paradas || paradas.length === 0) {
        container.style.display = 'none';
        editParadaCounter = 1;
        const paradaItem = document.createElement('div');
        paradaItem.className = 'parada-item';
        paradaItem.setAttribute('data-parada', '1');
        
        paradaItem.innerHTML = `
            <div class="form-group">
                <input type="text" class="parada-input" placeholder="Ex: Shopping Center, 789 - Centro - São Paulo">
                <button type="button" class="btn-remove-parada" onclick="removeEditParada(this)">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        
        container.appendChild(paradaItem);
        return;
    }
    
    // Se há paradas, mostrar o container e adicionar paradas existentes
    container.style.display = 'block';
    paradas.forEach((parada, index) => {
        editParadaCounter = index + 1;
        const paradaItem = document.createElement('div');
        paradaItem.className = 'parada-item';
        paradaItem.setAttribute('data-parada', editParadaCounter);
        
        paradaItem.innerHTML = `
            <div class="form-group">
                <input type="text" class="parada-input" value="${parada}" placeholder="Ex: Shopping Center, 789 - Centro - São Paulo">
                <button type="button" class="btn-remove-parada" onclick="removeEditParada(this)">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        
        container.appendChild(paradaItem);
    });
    
    // Controlar estado do botão baseado no número de paradas carregadas
    const addButton = document.querySelector('#editModal .btn-add-parada-clean');
    if (addButton) {
        if (paradas.length >= 2) {
            addButton.disabled = true;
            addButton.style.opacity = '0.5';
            addButton.style.cursor = 'not-allowed';
        } else {
            addButton.disabled = false;
            addButton.style.opacity = '1';
            addButton.style.cursor = 'pointer';
        }
    }
}

// Função para inicializar eventos das paradas
function initializeParadasEvents() {
    // Botão adicionar parada no formulário de criação
    const addBtn = document.getElementById('addParadaBtn');
    if (addBtn) {
        addBtn.addEventListener('click', addParada);
    }
    
    // Botão adicionar parada no modal de edição
    const editAddBtn = document.getElementById('editAddParadaBtn');
    if (editAddBtn) {
        editAddBtn.addEventListener('click', addEditParada);
    }
}

// ===== FUNCIONALIDADE DE RECOLHER/EXPANDIR FORMULÁRIO =====

// Estado do formulário (expandido por padrão)
let isFormCollapsed = false;

// Função para alternar entre recolher/expandir formulário
function toggleFormCollapse() {
    const createSection = document.querySelector('.create-section');
    const collapseBtn = document.getElementById('collapseBtn');
    
    if (!createSection || !collapseBtn) {
        console.error('Elementos necessários não encontrados');
        return;
    }
    
    isFormCollapsed = !isFormCollapsed;
    
    if (isFormCollapsed) {
        // Recolher formulário
        createSection.style.display = 'none';
        collapseBtn.textContent = 'Expandir';
        collapseBtn.innerHTML = '<i class="fas fa-chevron-down"></i> Expandir';
    } else {
        // Expandir formulário
        createSection.style.display = 'block';
        collapseBtn.textContent = 'Recolher';
        collapseBtn.innerHTML = '<i class="fas fa-chevron-up"></i> Recolher';
    }
}

// ===== INICIALIZAÇÃO =====

// Inicialização simplificada sem sistema de busca
document.addEventListener('DOMContentLoaded', function() {
    
    // Inicializar sistema de notificações se ainda não foi inicializado
    if (!window.notificationSystem && window.NotificationSystem) {
        window.notificationSystem = new window.NotificationSystem();
        window.notificationSystem.init();
        console.log('[SUCCESS] Sistema de notificações inicializado e configurado');
        

    } else if (window.notificationSystem) {
        console.log('[INFO] Sistema de notificações já inicializado');
        // Garantir que está inicializado
        if (typeof window.notificationSystem.init === 'function') {
            window.notificationSystem.init();
        }
    } else {
        console.warn('[WARNING] NotificationSystem não encontrado');
    }
    
    // Inicializar eventos das paradas dinâmicas
    initializeParadasEvents();
    
    // Inicializar botão de recolher/expandir
    const collapseBtn = document.getElementById('collapseBtn');
    if (collapseBtn) {
        collapseBtn.addEventListener('click', toggleFormCollapse);
        console.log('[SUCCESS] Botão de recolher/expandir inicializado');
    }
    
    // Inicializar WebSocket após um pequeno delay
    setTimeout(() => {
        initializeWebSocket();
    }, 2000);
});