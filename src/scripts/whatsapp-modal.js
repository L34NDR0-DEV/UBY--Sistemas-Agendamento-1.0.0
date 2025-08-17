/**
 * WhatsApp Modal Manager
 * Gerencia o modal para compartilhamento de agendamentos no WhatsApp
 */

class WhatsAppModal {
    constructor() {
        this.currentAgendamento = null;
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Fechar modal
        const closeBtn = document.getElementById('closeWhatsappModal');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.close());
        }

        // Fechar modal clicando fora
        const modal = document.getElementById('whatsappModal');
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.close();
                }
            });
        }

        // Atualizar preview quando campo de observação mudar
        const observacaoElement = document.getElementById('observacaoWhatsapp');
        if (observacaoElement) {
            observacaoElement.addEventListener('input', () => this.updatePreview());
            observacaoElement.addEventListener('change', () => this.updatePreview());
        }
    }

    open(agendamentoId) {
        console.log('WhatsAppModal: Opening for agendamento ID:', agendamentoId);
        
        // Encontrar o agendamento
        this.currentAgendamento = window.agendamentos?.find(a => a.id === agendamentoId);
        
        if (!this.currentAgendamento) {
            console.error('WhatsAppModal: Agendamento não encontrado:', agendamentoId);
            showToast('Agendamento não encontrado', 'error');
            return;
        }

        // Preencher dados do agendamento
        this.populateAgendamentoData();
        
        // Limpar campos do formulário
        this.clearForm();
        
        // Mostrar modal
        const modal = document.getElementById('whatsappModal');
        if (modal) {
            modal.style.display = 'flex';
            modal.classList.add('show');
            
            // Gerar preview imediatamente
            this.updatePreview();
            
            // Focar no campo de observação
            setTimeout(() => {
                const observacaoInput = document.getElementById('observacaoWhatsapp');
                if (observacaoInput) {
                    observacaoInput.focus();
                }
            }, 100);
        }
    }

    close() {
        console.log('WhatsAppModal: Closing modal');
        
        const modal = document.getElementById('whatsappModal');
        if (modal) {
            modal.classList.remove('show');
            setTimeout(() => {
                modal.style.display = 'none';
            }, 300);
        }
        
        this.currentAgendamento = null;
        this.clearForm();
    }

    populateAgendamentoData() {
        if (!this.currentAgendamento) return;

        const formatDate = new Date(this.currentAgendamento.data + 'T00:00:00').toLocaleDateString('pt-BR');
        
        // Preencher dados do preview
        document.getElementById('whatsappPreviewCliente').textContent = this.currentAgendamento.nomeCliente || '';
        document.getElementById('whatsappPreviewData').textContent = formatDate;
        document.getElementById('whatsappPreviewHorario').textContent = this.currentAgendamento.horario || '';
        document.getElementById('whatsappPreviewCidade').textContent = this.currentAgendamento.cidade || '';
        document.getElementById('whatsappPreviewTelefone').textContent = this.currentAgendamento.numeroContato || '';
        document.getElementById('whatsappPreviewAtendente').textContent = this.currentAgendamento.atendente || '';
        
        // Preencher endereços se existirem
        const origemContainer = document.getElementById('whatsappPreviewOrigemContainer');
        const destinoContainer = document.getElementById('whatsappPreviewDestinoContainer');
        const origemSpan = document.getElementById('whatsappPreviewOrigem');
        const destinoSpan = document.getElementById('whatsappPreviewDestino');
        
        if (this.currentAgendamento.enderecoOrigem) {
            origemSpan.textContent = this.currentAgendamento.enderecoOrigem;
            origemContainer.style.display = 'flex';
        } else {
            origemContainer.style.display = 'none';
        }
        
        if (this.currentAgendamento.enderecoDestino) {
            destinoSpan.textContent = this.currentAgendamento.enderecoDestino;
            destinoContainer.style.display = 'flex';
        } else {
            destinoContainer.style.display = 'none';
        }
        
        // Preencher paradas se existirem
        const paradasContainer = document.getElementById('whatsappPreviewParadasContainer');
        const paradas = this.currentAgendamento.paradas || [];
        
        if (paradas && paradas.length > 0) {
            // Limpar container de paradas
            paradasContainer.innerHTML = '';
            
            // Adicionar cada parada
            paradas.forEach((parada, index) => {
                const paradaElement = document.createElement('div');
                paradaElement.className = 'preview-item';
                paradaElement.innerHTML = `
                    <i class="fas fa-route item-icon" style="color: #ff9800;"></i>
                    <strong>Parada ${index + 1}:</strong> <span>${parada}</span>
                `;
                paradasContainer.appendChild(paradaElement);
            });
            
            paradasContainer.style.display = 'block';
        } else {
            paradasContainer.style.display = 'none';
        }
    }

    clearForm() {
        const observacao = document.getElementById('observacaoWhatsapp');
        if (observacao) observacao.value = '';
        
        // Limpar preview
        const preview = document.getElementById('whatsappMessagePreview');
        preview.innerHTML = '<p>Adicione uma observação (opcional) para ver o preview da mensagem...</p>';
        
        // Desabilitar botão de copiar até ter dados do agendamento
        const copyBtn = document.getElementById('copyWhatsappMessage');
        copyBtn.disabled = !this.currentAgendamento;
    }

    updatePreview() {
        if (!this.currentAgendamento) return;
        
        const observacao = (document.getElementById('observacaoWhatsapp')?.value || '').trim();

        // Gerar mensagem com dados do agendamento
        const mensagem = this.generateWhatsAppMessage(observacao);
        
        // Mostrar preview
        const preview = document.getElementById('whatsappMessagePreview');
        preview.innerHTML = `<div class="whatsapp-preview-text">${mensagem.replace(/\n/g, '<br>')}</div>`;
        
        // Habilitar botão de copiar
        const copyBtn = document.getElementById('copyWhatsappMessage');
        copyBtn.disabled = false;
    }

    generateWhatsAppMessage(observacao) {
        if (!this.currentAgendamento) return '';

        const formatDate = new Date(this.currentAgendamento.data + 'T00:00:00').toLocaleDateString('pt-BR');
        
        // Determinar emoji do atendente baseado no nome
        const atendenteNome = this.currentAgendamento.atendente || '';
        let atendenteEmoji = '👨‍💼'; // Padrão: homem
        
        // Verificar nomes específicos para emojis personalizados
        if (atendenteNome.toLowerCase().includes('taiane')) {
            atendenteEmoji = '👩🏾‍💼'; 
        } else if (atendenteNome.toLowerCase().includes('ana') || 
                   atendenteNome.toLowerCase().includes('maria') || 
                   atendenteNome.toLowerCase().includes('julia') ||
                   atendenteNome.toLowerCase().includes('carla') ||
                   atendenteNome.toLowerCase().includes('fernanda')) {
            atendenteEmoji = '👩‍💼';
        }

        // Endereços e URLs salvos no agendamento
        const origem = this.currentAgendamento.enderecoOrigem || '';
        const destino = this.currentAgendamento.enderecoDestino || '';
        const urlOrigem = this.currentAgendamento.urlEnderecoOrigem || '';
        const urlDestino = this.currentAgendamento.urlEnderecoDestino || '';

        const partes = [];
        partes.push(`*Agendamento*`);
        partes.push('');
        partes.push(`🗓️ *Data:* ${formatDate}`);
        partes.push(`🕐 *Horário:* ${this.currentAgendamento.horario}`);
        partes.push(`🏙️ *Cidade:* ${this.currentAgendamento.cidade}`);
        partes.push('');
        partes.push(`👤 *Cliente:* ${this.currentAgendamento.nomeCliente}`);
        partes.push(`📱 *Telefone:* ${this.currentAgendamento.numeroContato}`);
        partes.push('');
        if (origem) {
            partes.push(`📍 *Endereço de Origem:*`);
            partes.push(origem);
            if (urlOrigem) partes.push(urlOrigem);
            partes.push('');
        }
        
        // Adicionar paradas se existirem
        const paradas = this.currentAgendamento.paradas || [];
        if (paradas && paradas.length > 0) {
            paradas.forEach((parada, index) => {
                partes.push(`🛑 *Parada ${index + 1}:*`);
                partes.push(parada);
            });
            partes.push('');
        }
        
        if (destino) {
            partes.push(`🎯 *Endereço de Destino:*`);
            partes.push(destino);
            if (urlDestino) partes.push(urlDestino);
            partes.push('');
        }
        if (observacao) {
            partes.push(`📝 *Observação:*`);
            partes.push(observacao);
            partes.push('');
        }
        partes.push(`${atendenteEmoji} *Atendente:* ${this.currentAgendamento.atendente}`);
        
        // Adicionar informações do usuário original se o agendamento foi transferido
        if (this.currentAgendamento.originalCreatedBy && this.currentAgendamento.originalCreatedBy !== this.currentAgendamento.atendente) {
            partes.push(`👤 *Criado originalmente por:* ${this.currentAgendamento.originalCreatedBy}`);
        }

        return partes.join('\n');
    }

    copyMessage() {
        if (!this.currentAgendamento) {
            showToast('Agendamento não encontrado', 'error');
            return;
        }

        const observacao = (document.getElementById('observacaoWhatsapp')?.value || '').trim();
        const mensagem = this.generateWhatsAppMessage(observacao);
        
        // Copiar para área de transferência
        navigator.clipboard.writeText(mensagem).then(() => {
            showToast('Mensagem copiada para área de transferência! 📋', 'success');
            
            // Fechar modal após copiar
            setTimeout(() => {
                this.close();
            }, 1000);
            
        }).catch(err => {
            console.error('Erro ao copiar mensagem:', err);
            
            // Fallback para navegadores mais antigos
            const textArea = document.createElement('textarea');
            textArea.value = mensagem;
            document.body.appendChild(textArea);
            textArea.select();
            
            try {
                document.execCommand('copy');
                showToast('Mensagem copiada para área de transferência! 📋', 'success');
                
                setTimeout(() => {
                    this.close();
                }, 1000);
                
            } catch (fallbackErr) {
                console.error('Erro no fallback de cópia:', fallbackErr);
                showToast('Erro ao copiar mensagem', 'error');
            }
            
            document.body.removeChild(textArea);
        });
    }
}

// Instância global
let whatsappModalInstance = null;

// Funções globais para uso nos botões
window.openWhatsappModal = function(agendamentoId) {
    if (!whatsappModalInstance) {
        whatsappModalInstance = new WhatsAppModal();
    }
    whatsappModalInstance.open(agendamentoId);
};

window.closeWhatsappModal = function() {
    if (whatsappModalInstance) {
        whatsappModalInstance.close();
    }
};

window.copyWhatsappMessage = function() {
    if (whatsappModalInstance) {
        whatsappModalInstance.copyMessage();
    }
};

// Inicializar quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', () => {
    whatsappModalInstance = new WhatsAppModal();
    console.log('WhatsAppModal: Script loaded successfully');
});

console.log('WhatsAppModal: Script loaded successfully');