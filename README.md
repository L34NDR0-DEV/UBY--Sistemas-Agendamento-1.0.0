# UBY - Sistema de Agendamento

**Versão 1.0.0** - Sistema completo de agendamento com interface moderna e funcionalidades avançadas.

## 📋 Descrição

O UBY é um sistema de agendamento desenvolvido em Electron que oferece uma interface intuitiva para gerenciamento de agendamentos, com suporte a diferentes tipos de visualização, notificações em tempo real e integração com WhatsApp.

## ✨ Funcionalidades

### 🎯 Principais
- **Interface Post-it**: Visualização em cards coloridos por status
- **Sistema de Login**: Autenticação de usuários com diferentes perfis
- **Busca Avançada**: Sistema de filtros por data, status, atendente e mais
- **Notificações**: Sistema de notificações em tempo real
- **Modo Escuro**: Interface adaptável com tema claro/escuro
- **Integração WhatsApp**: Envio direto de mensagens
- **Localização**: Integração com mapas para endereços

### 🎨 Interface
- **Post-its Coloridos**: Diferentes cores por status (amarelo, rosa, azul, verde, laranja, roxo)
- **Truncagem Inteligente**: Observações longas são truncadas com tooltip
- **Responsivo**: Interface adaptável a diferentes tamanhos de tela
- **Animações**: Transições suaves e feedback visual

### 🔧 Funcionalidades Técnicas
- **WebSocket**: Atualizações em tempo real
- **Cache Offline**: Funcionamento sem conexão
- **Backup Automático**: Sistema de backup de dados
- **Resolução de Conflitos**: Gerenciamento automático de conflitos de dados
- **Áudio**: Sistema de notificações sonoras
- **Voz**: Suporte a comandos de voz

## 🚀 Instalação

### Pré-requisitos
- Node.js (versão 14 ou superior)
- npm ou yarn

### Passos

1. **Clone o repositório**:
   ```bash
   git clone https://github.com/seu-usuario/UBY--Sistemas-Agendamento-1.0.0.git
   cd UBY--Sistemas-Agendamento-1.0.0
   ```

2. **Instale as dependências**:
   ```bash
   npm install
   ```

3. **Execute o aplicativo**:
   ```bash
   npm start
   ```

## 📖 Como Usar

### Login
1. Execute o aplicativo
2. Faça login com suas credenciais
3. Acesse o painel principal

### Gerenciamento de Agendamentos
- **Visualizar**: Os agendamentos aparecem como post-its coloridos
- **Filtrar**: Use a barra de busca para filtrar por critérios específicos
- **Editar**: Clique no botão "EDITAR" em qualquer post-it
- **Status**: Acompanhe o status através das cores dos post-its

### Cores dos Post-its
- 🟡 **Amarelo**: Agendado
- 🩷 **Rosa**: Em andamento
- 🔵 **Azul**: Concluído
- 🟢 **Verde**: Confirmado
- 🟠 **Laranja**: Pendente
- 🟣 **Roxo**: Cancelado

## 🛠️ Estrutura do Projeto

```
├── app/                    # Aplicação Electron principal
├── src/
│   ├── assets/            # Recursos estáticos
│   ├── data/              # Dados da aplicação
│   ├── scripts/           # Scripts JavaScript
│   ├── styles/            # Arquivos CSS
│   ├── utils/             # Utilitários
│   └── views/             # Páginas HTML
├── assets/                # Assets principais
└── package.json           # Configurações do projeto
```

## 🔧 Scripts Disponíveis

- `npm start` - Inicia a aplicação
- `npm run build` - Gera build de produção
- `npm test` - Executa testes
- `npm run dev` - Modo desenvolvimento

## 🌐 Tecnologias Utilizadas

- **Electron** - Framework para aplicações desktop
- **JavaScript** - Linguagem principal
- **HTML5/CSS3** - Interface e estilos
- **WebSocket** - Comunicação em tempo real
- **Node.js** - Runtime JavaScript

## 📱 Integrações

- **WhatsApp Web** - Envio de mensagens
- **Google Maps** - Localização e rotas
- **WebSocket** - Atualizações em tempo real
- **Sistema de Arquivos** - Backup e cache local

## 🔒 Segurança

- Autenticação de usuários
- Validação de dados
- Sanitização de entradas
- Backup automático de dados

## 📋 Changelog

### Versão 1.0.0
- ✅ Sistema completo de agendamento
- ✅ Interface post-it com cores por status
- ✅ Modo escuro implementado
- ✅ Truncagem de observações longas
- ✅ Sistema de notificações
- ✅ Integração WhatsApp
- ✅ Busca avançada
- ✅ WebSocket para atualizações em tempo real

## 🤝 Contribuição

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo `LICENSE` para mais detalhes.

## 👥 Equipe

- **Desenvolvedor Principal**: Leandro
- **Versão**: 1.0.0
- **Status**: Finalizado

## 📞 Suporte

Para suporte técnico ou dúvidas:
- Abra uma issue no GitHub
- Entre em contato através do sistema

---

**UBY - Sistema de Agendamento** © 2025
