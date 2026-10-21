# Hidrovia Online — autenticação e moderação (etapa 2)

> Protótipo experimental. **Não utilizar como fonte oficial de navegação ou segurança aquaviária.** As posições das boias são aproximadas.

## Requisitos
- Node.js 22 ou superior
- MongoDB acessível localmente ou por URI
- Navegador moderno

## Executar
```bash
cd backend
npm install
cp .env.example .env
```
Edite `backend/.env` e substitua `SESSION_SECRET` por uma chave aleatória com **pelo menos 32 caracteres**. Configure `MONGODB_URI`. Nunca publique `.env`.

```bash
npm test
npm run dev
```
Acesse `http://localhost:3000/login.html` para cadastrar uma conta e entrar; o mapa fica em `http://localhost:3000`.

## Fluxo
1. Usuário cria conta com e-mail e senha de pelo menos 12 caracteres.
2. Login cria cookie HttpOnly, SameSite=Strict, assinado com HMAC e válido por sete dias.
3. Envio de relato exige sessão autenticada e é salvo como **PENDENTE**.
4. Somente administradores podem aprovar ou rejeitar em `/moderacao.html`.
5. Apenas relatos **ATIVOS** são listados na API pública.

## Tornar um usuário administrador
Não há cadastro público de administrador. Após criar a conta, use uma conexão administrativa segura ao MongoDB:
```javascript
use hidroviaonline
db.users.updateOne({email:"SEU_EMAIL_VERIFICADO"}, {$set:{role:"admin"}})
```
Confirme a identidade e o e-mail do titular antes da promoção. A aplicação não envia e-mails de verificação nesta etapa.

## Endpoints
- `GET /api/health` — status do servidor e banco
- `POST /api/auth/register` — criar conta
- `POST /api/auth/login` — iniciar sessão
- `GET /api/auth/me` — conta atual
- `POST /api/auth/logout` — sair
- `GET /api/relatos` — relatos aprovados
- `POST /api/relatos` — criar relato pendente (autenticado)
- `GET /api/relatos/moderacao` — pendentes (admin)
- `PATCH /api/relatos/:id/status` — aprovar/rejeitar/resolver (admin)

## Antes de publicar
- Adicionar verificação de e-mail, recuperação de senha, auditoria e revogação de sessões.
- Substituir limite de tentativas em memória por rate limit compartilhado (Redis/proxy) e configurar proxy confiável.
- Revisar políticas de CSRF/CSP, HTTPS, logs e proteção contra spam.
- Implementar sincronização offline confiável, testes de integração e precisão dos dados náuticos.
- Remover `backend/node_modules` já rastreado do repositório.
- Validar instalação/execução em ambiente real; não houve testes integrados nesta revisão.
