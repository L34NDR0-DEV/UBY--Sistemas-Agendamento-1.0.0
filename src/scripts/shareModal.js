// Modal de Transferência - Arquivo dedicado

class ShareModal {
    constructor() {
        this.currentAgendamentoId = null;
        this.isOpen = false;
        this.init();
    }

    init() {
        // Aguardar o DOM estar carregado
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setupShareModalEventListeners());
        } else {
            this.setupShareModalEventListeners();
        }
    }

    setupShareModalEventListeners() {
        // Botão de fechar
        const closeBtn = document.getElementById('closeShareModal');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.close());
        }

        // Botão cancelar
        const cancelBtn = document.querySelector('#shareModal .btn-secondary');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => this.close());
        }

        // Botão confirmar
        const confirmBtn = document.getElementById('confirmShareBtn');
        if (confirmBtn) {
            confirmBtn.addEventListener('click', () => this.confirmShare());
        }

        // Select de usuário
        const userSelect = document.getElementById('userSelect');
        if (userSelect) {
            userSelect.addEventListener('change', () => this.onUserSelectChange());
        }

        // Textarea de mensagem
        const messageTextarea = document.getElementById('shareMessage');
        if (messageTextarea) {
            messageTextarea.addEventListener('input', () => this.updateCharCount());
        }

        // Fechar ao clicar fora do modal
        const modal = document.getElementById('shareModal');
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.close();
                }
            });
        }
    }

    async open(agendamentoId) {
        console.log('ShareModal: Opening for agendamento ID:', agendamentoId);
        
        if (this.isOpen) {
            console.log('ShareModal: Modal already open');
            return;
        }

        try {
            this.currentAgendamentoId = agendamentoId;
            this.isOpen = true;

            // Buscar o agendamento diretamente do backend
            const agendamento = await ipcRenderer.invoke('getAgendamentoById', agendamentoId);
            if (!agendamento) {
                throw new Error('Agendamento não encontrado');
            }

            // Preencher preview
            this.fillPreview(agendamento);

            // Carregar usuários
            await this.loadUsers();

            // Limpar campos
            this.clearFields();

            // Mostrar modal
            const modal = document.getElementById('shareModal');
            if (modal) {
                modal.classList.add('show');
                console.log('ShareModal: Modal displayed');
            } else {
                throw new Error('Modal element not found');
            }

        } catch (error) {
            console.error('ShareModal: Error opening modal:', error);
            alert(`Erro ao abrir modal de transferência: ${error.message}`);
            this.isOpen = false;
        }
    }

    close() {
        console.log('ShareModal: Closing modal');
        
        const modal = document.getElementById('shareModal');
        if (modal) {
            modal.classList.remove('show');
        }

        this.currentAgendamentoId = null;
        this.isOpen = false;
        this.clearFields();
    }

    fillPreview(agendamento) {
        const elements = {
            'previewCliente': agendamento.nomeCliente,
            'previewData': agendamento.data,
            'previewHorario': agendamento.horario,
            'previewCidade': agendamento.cidade
        };

        for (const [id, value] of Object.entries(elements)) {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value || 'N/A';
            }
        }
        
        // Mostrar informações do criador original se existir e for diferente do atendente atual
        const originalCreatorElement = document.getElementById('previewOriginalCreator');
        const originalCreatedByElement = document.getElementById('previewOriginalCreatedBy');
        
        if (agendamento.originalCreatedBy && agendamento.originalCreatedBy !== agendamento.atendente) {
            if (originalCreatedByElement) {
                originalCreatedByElement.textContent = agendamento.originalCreatedBy;
            }
            if (originalCreatorElement) {
                originalCreatorElement.style.display = 'flex';
            }
        } else {
            if (originalCreatorElement) {
                originalCreatorElement.style.display = 'none';
            }
        }
    }

    async loadUsers() {
        try {
            const users = await ipcRenderer.invoke('getUsers');
            const currentUser = window.currentUser;
            const usersGrid = document.getElementById('usersGrid');

            if (!usersGrid) {
                throw new Error('Users grid element not found');
            }

            // Limpar grid
            usersGrid.innerHTML = '';

            // Filtrar usuários (exceto o atual)
            const availableUsers = users.filter(user => user.username !== currentUser?.username);

            if (availableUsers.length === 0) {
                usersGrid.innerHTML = `
                    <div class="no-users-message">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                            <circle cx="12" cy="7" r="4"></circle>
                        </svg>
                        <p>Nenhum atendente disponível para transferência</p>
                    </div>
                `;
                return;
            }

            // Criar cards de usuários
            availableUsers.forEach(user => {
                const userCard = document.createElement('div');
                userCard.className = 'user-card';
                userCard.dataset.userId = user.id;
                
                // Gerar iniciais do nome para o avatar
                const initials = this.generateUserInitials(user.displayName);
                
                userCard.innerHTML = `
                    <div class="user-avatar">${initials}</div>
                    <div class="user-info">
                        <h4>${user.displayName}</h4>
                    </div>
                    <div class="user-card-check">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                            <path d="M20 6L9 17l-5-5"></path>
                        </svg>
                    </div>
                `;

                // Adicionar evento de clique
                userCard.addEventListener('click', () => this.selectUser(user.id, userCard));
                
                usersGrid.appendChild(userCard);
            });

            console.log('ShareModal: Users loaded successfully');

        } catch (error) {
            console.error('ShareModal: Error loading users:', error);
            alert('Erro ao carregar lista de usuários');
        }
    }

    generateUserInitials(displayName) {
        if (!displayName) return '?';
        
        const names = displayName.trim().split(' ');
        if (names.length === 1) {
            return names[0].charAt(0).toUpperCase();
        }
        
        return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
    }

    selectUser(userId, cardElement) {
        // Remover seleção anterior
        document.querySelectorAll('.user-card').forEach(card => {
            card.classList.remove('selected');
        });

        // Selecionar novo usuário
        cardElement.classList.add('selected');
        
        // Atualizar campo oculto
        const selectedUserIdInput = document.getElementById('selectedUserId');
        if (selectedUserIdInput) {
            selectedUserIdInput.value = userId;
        }

        // Atualizar estado do botão de confirmação
        this.onUserSelectChange();
    }

    clearFields() {
        const selectedUserIdInput = document.getElementById('selectedUserId');
        const messageTextarea = document.getElementById('shareMessage');
        const charCount = document.getElementById('charCount');
        const confirmBtn = document.getElementById('confirmShareBtn');

        // Limpar seleção de usuário
        if (selectedUserIdInput) selectedUserIdInput.value = '';
        document.querySelectorAll('.user-card').forEach(card => {
            card.classList.remove('selected');
        });

        if (messageTextarea) messageTextarea.value = '';
        if (charCount) charCount.textContent = '0';
        if (confirmBtn) {
            confirmBtn.disabled = true;
            confirmBtn.innerHTML = `
                <i class="fa-solid fa-share"></i>
                Transferir
            `;
        }
    }

    onUserSelectChange() {
        const selectedUserIdInput = document.getElementById('selectedUserId');
        const confirmBtn = document.getElementById('confirmShareBtn');

        if (selectedUserIdInput && confirmBtn) {
            confirmBtn.disabled = !selectedUserIdInput.value;
        }
    }

    updateCharCount() {
        const messageTextarea = document.getElementById('shareMessage');
        const charCount = document.getElementById('charCount');

        if (messageTextarea && charCount) {
            charCount.textContent = messageTextarea.value.length;
        }
    }

    async confirmShare() {
        const selectedUserIdInput = document.getElementById('selectedUserId');
        const messageTextarea = document.getElementById('shareMessage');
        const confirmBtn = document.getElementById('confirmShareBtn');

        if (!selectedUserIdInput?.value) {
            alert('Por favor, selecione um atendente para transferir');
            return;
        }

        if (!this.currentAgendamentoId) {
            alert('Erro: Agendamento não identificado');
            return;
        }

        try {
            // Desabilitar botão
            if (confirmBtn) {
                confirmBtn.disabled = true;
                confirmBtn.innerHTML = `
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"/>
                        <path d="M12 6v6l4 2"/>
                    </svg>
                    Transferindo...
                `;
            }

            // Buscar dados necessários
            const users = await ipcRenderer.invoke('getUsers');
            const targetUser = users.find(u => u.id === parseInt(selectedUserIdInput.value));
            const agendamento = await ipcRenderer.invoke('getAgendamentoById', this.currentAgendamentoId);
            const currentUser = window.currentUser;

            if (!targetUser) {
                throw new Error('Atendente destinatário não encontrado');
            }

            if (!agendamento) {
                throw new Error('Agendamento não encontrado');
            }

            // Executar transferência
            const result = await ipcRenderer.invoke('shareAgendamento', {
                agendamentoId: this.currentAgendamentoId,
                fromUserId: currentUser.id,
                fromUserName: currentUser.displayName,
                toUserId: parseInt(selectedUserIdInput.value),
                toUserName: targetUser.displayName,
                message: messageTextarea?.value?.trim() || ''
            });

            if (result.success) {
                // Remover da lista atual
                const index = window.agendamentos?.findIndex(a => a.id === this.currentAgendamentoId);
                if (index !== -1 && window.agendamentos) {
                    window.agendamentos.splice(index, 1);
                }

                // Atualizar interface
                if (window.filterAgendamentos) {
                    window.filterAgendamentos();
                }

                this.close();

                // Notificação de sucesso
                if (window.showToast) {
                    window.showToast(`Agendamento transferido com sucesso para ${targetUser.displayName}!`, 'success');
        } else {
            alert(`Agendamento transferido com sucesso para ${targetUser.displayName}!`);
                }

                console.log('ShareModal: Share completed successfully');

            } else {
                throw new Error(result.error || 'Falha ao transferir agendamento');
            }

        } catch (error) {
            console.error('ShareModal: Error sharing:', error);
            
            if (window.showToast) {
                window.showToast(`Erro ao transferir: ${error.message}`, 'error');
        } else {
            alert(`Erro ao transferir agendamento: ${error.message}`);
            }

        } finally {
            // Reabilitar botão
            if (confirmBtn) {
                confirmBtn.disabled = false;
                confirmBtn.innerHTML = `
                    <i class="fa-solid fa-share"></i>
                    Transferir
                `;
            }
        }
    }
}

// Instância global do modal
let shareModalInstance = null;

// Função global para abrir o modal (compatibilidade)
window.openShareModal = function(agendamentoId) {
    if (!shareModalInstance) {
        shareModalInstance = new ShareModal();
    }
    shareModalInstance.open(agendamentoId);
};

// Função global para fechar o modal (compatibilidade)
window.closeShareModal = function() {
    if (shareModalInstance) {
        shareModalInstance.close();
    }
};

// Função global para confirmar transferência (compatibilidade)
window.confirmShare = function() {
    if (shareModalInstance) {
        shareModalInstance.confirmShare();
    }
};

// Inicializar quando o DOM estiver pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        shareModalInstance = new ShareModal();
        setupShareModalEventListeners();
    });
} else {
    shareModalInstance = new ShareModal();
    setupShareModalEventListeners();
}

// Configurar event listeners específicos do modal de transferência
function setupShareModalEventListeners() {
    // Botão de fechar modal
    const closeBtn = document.getElementById('closeShareModal');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            if (shareModalInstance) {
                shareModalInstance.close();
            }
        });
    }

    // Event listeners para seleção de usuários são adicionados dinamicamente no loadUsers()

    // Contador de caracteres
    const messageTextarea = document.getElementById('shareMessage');
    if (messageTextarea) {
        messageTextarea.addEventListener('input', () => {
            if (shareModalInstance) {
                shareModalInstance.updateCharCount();
            }
        });
    }

    // Fechar modal clicando fora
    const modal = document.getElementById('shareModal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal && shareModalInstance) {
                shareModalInstance.close();
            }
        });
    }
}

console.log('ShareModal: Script loaded successfully');