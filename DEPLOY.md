# Publicação do Hidrovia Online com MongoDB Atlas e Render

Esta etapa prepara a infraestrutura, **mas não cria automaticamente** o cluster, o serviço ou as credenciais. A aplicação só estará online após a configuração e o deploy concluídos.

## 1. Criar banco MongoDB Atlas
1. Crie um projeto e um cluster no [MongoDB Atlas](https://cloud.mongodb.com/).
2. Em **Database Access**, crie um usuário específico para a aplicação, com permissão de leitura/escrita apenas no banco `hidroviaonline`. Use senha forte e única.
3. Em **Network Access**, autorize o IP de saída da hospedagem. Se o provedor usar IP dinâmico e for indispensável permitir acesso amplo, utilize credenciais exclusivas e privilégios mínimos; restrinja a rede quando possível.
4. Em **Connect > Drivers**, copie a URI de conexão e inclua o nome do banco: `mongodb+srv://USUARIO:SENHA@SEU-CLUSTER.mongodb.net/hidroviaonline?retryWrites=true&w=majority`. Codifique caracteres especiais da senha para URI.
5. **Nunca** envie a URI, senha ou `SESSION_SECRET` ao GitHub ou ao chat.

## 2. Publicar no Render
1. Conecte este repositório ao [Render](https://dashboard.render.com/) e crie um serviço pelo Blueprint `render.yaml`.
2. Configure a variável secreta `MONGODB_URI` com a URI do Atlas. O Blueprint gera `SESSION_SECRET` automaticamente. Confirme que `NODE_ENV=production`.
3. Configure o domínio HTTPS e conclua o deploy. O Render deve executar `npm ci` e `npm start` na pasta `backend`.
4. Abra `https://SEU-DOMINIO/api/health`: somente `{"status":"ok","database":"connected"}` com HTTP 200 confirma o banco conectado. HTTP 503 indica indisponibilidade.
5. Teste cadastro, login, envio de relato, moderação e leitura em dois navegadores. Um relato novo começa `PENDENTE` e só aparece publicamente depois de aprovado.

## 3. Cuidados antes de abrir ao público
- Configure alertas, backups e monitoramento no Atlas/Render conforme o plano contratado.
- Adicione verificação de e-mail, recuperação de senha, proteção antiabuso persistente, política de retenção de dados, auditoria, HTTPS e revisão CSRF/CSP antes de usuários reais.
- Revise o uso de cookies e as regras de segurança do proxy. Evite hospedar frontend e API em domínios diferentes sem ajustar autenticação e CORS.
- Este é um **protótipo experimental**, não uma fonte oficial para segurança da navegação.
- A persistência online depende do Atlas configurado e do servidor Render ativo; GitHub Actions testa contra MongoDB temporário e não armazena dados de produção.
