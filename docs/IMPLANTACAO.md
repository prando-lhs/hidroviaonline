# Implantação segura — Hidrovia Online

## Preparação
- Provisionar MongoDB Atlas com usuário de privilégio mínimo, rede restrita e backups.
- Configurar MONGODB_URI e SESSION_SECRET (segredo aleatório de 32+ caracteres) exclusivamente no gerenciador de segredos da hospedagem.
- Habilitar HTTPS e configurar NODE_ENV=production.
- Publicar backend Node.js 22+ em serviço persistente com suporte a conexões de saída para Atlas.
- Confirmar GET /api/health e executar testes de cadastro, login, relatos e moderação em banco isolado.
- Definir monitoramento, retenção de logs, alertas, política de recuperação e plano de rollback.
- Não divulgar dados de boias aproximados como fonte oficial. Importações exigem verificação e rastreabilidade.

## Pendências antes da produção
Rate limiting em memória é apenas proteção provisória de instância única. Substituir por Redis/proxy compartilhado; implementar verificação de e-mail, recuperação de senha, revogação de sessão, proteção CSRF completa e testes end-to-end. Nenhuma implantação foi realizada automaticamente.
