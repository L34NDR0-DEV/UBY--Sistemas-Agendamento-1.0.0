# Changelog

Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.

## [1.0.3] - 2024-12-20

### 🔧 Correções
- **Sistema de Notificações**: Removido completamente o sistema de notificações HTML/CSS/JS anterior
- **Notificações Nativas**: Implementado sistema de notificações nativas do Windows via Electron
- **Sintaxe JavaScript**: Corrigidos erros de sintaxe no arquivo `main.js` (linha 2167)
- **Código Órfão**: Removido código residual da remoção do sistema de notificações
- **Interface**: Atualizado contador de versão na tela de login para v1.0.3

### ✨ Melhorias
- **Integração com SO**: Notificações agora aparecem na barra de notificações do Windows
- **Urgência Crítica**: Notificações de agendamentos atrasados configuradas com alta prioridade
- **Som Nativo**: Notificações incluem som do sistema operacional
- **Persistência**: Notificações permanecem visíveis até serem dispensadas pelo usuário

### 📋 Detalhes Técnicos
- Removidos arquivos: `notifications.js`, `notifications.css`, `notifications.json`
- Adicionadas funções `showNativeNotification` e `notifyDelayedAppointment` no processo principal
- Integração com `voice-manager.js` para notificações automáticas
- Handlers IPC para comunicação entre processos

## [1.0.2] - 2024-08-20

### 🔧 Correções
- **Sistema de Atualização**: Corrigido problema onde o botão de atualização automática não aparecia na interface
- **Carregamento de Scripts**: Adicionado carregamento correto do script `updater.js` na página principal
- **Inicialização**: Melhorada a inicialização do sistema de atualização no `main.js`
- **Interface**: Atualizado contador de versão na tela de login para v1.0.2

### 📋 Detalhes Técnicos
- Incluído `updater.js` no arquivo `main.html`
- Adicionada verificação de inicialização do `ModernUpdateManager`
- Corrigida ordem de carregamento dos scripts

## [1.0.1] - 2024-08-20

### Adicionado
- Sistema de otimização de performance adaptativo
- Detector automático de capacidade da máquina
- Sistema de lazy loading condicional baseado em performance
- Debouncing adaptativo para melhor responsividade
- Cache inteligente com ativação automática
- Throttling adaptativo para operações intensivas
- Paginação dinâmica baseada na capacidade do sistema
- Carregador automático dos sistemas de otimização

### Melhorado
- Performance geral da aplicação em máquinas com recursos limitados
- Responsividade da interface em sistemas mais lentos
- Gerenciamento de memória e recursos
- Experiência do usuário em diferentes configurações de hardware

### Técnico
- Integração completa do sistema de otimização no main.js
- Novos utilitários de performance em src/utils/
- Sistema modular de otimização com carregamento automático

## [1.0.0] - 2024-01-15

### Inicial
- Lançamento inicial do UBY Agendamentos
- Sistema completo de gestão de agendamentos
- Interface moderna e intuitiva
- Sistema de notificações em tempo real
- Suporte para transferência de agendamentos
- Sistema de WebSocket para comunicação em tempo real
- Compatibilidade com Windows 10 e 11