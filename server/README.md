# Back on Track — Sync Server

Server WebSocket do TinyBase pra sincronizar dados entre dispositivos do app Back on Track. Fatia 2 da implementação do M6 (#198), sobre a decisão da [ADR-009](../docs/03-decisoes-tecnicas.md#adr-009).

## Arquitetura em uma frase

Node.js + `ws` + `createWsServer` do TinyBase, atrás de **Cloudflare Tunnel** com TLS terminado na borda. Uma `MergeableStore` por "sala" (o path da URL WS), persistida em arquivo JSON no volume. Cliente conecta em `wss://backontrack-sync.mhdn.com.br/<userId>`.

## Dev local

```bash
cd server
npm install
npm start
# outra aba:
URL=ws://localhost:8787 npm run smoke
```

O `smoke` conecta, escreve uma célula, desconecta, reconecta e confirma que o valor voltou. Exit 0 = OK.

## Deploy no homeserver

Pré-requisitos:

- Docker rodando (docker-ce 29+ recomendado; ver [[docker-snap-apparmor-broken]] pro histórico).
- Domínio na Cloudflare (`mhdn.com.br` já está — nameservers `mina.ns.cloudflare.com` / `jeff.ns.cloudflare.com`).
- Conta Cloudflare Zero Trust ativada (é grátis pra até 50 usuários; a maioria das contas free já tem).

Passos:

1. **Criar o túnel no Cloudflare Zero Trust** (uma vez):

   - Dashboard: **Zero Trust → Networks → Tunnels → Create a tunnel**.
   - Connector: **Cloudflared**. Nome sugerido: `backontrack-sync`.
   - Na tela do túnel, aba **Public Hostname → Add a public hostname**:
     - Subdomain: `backontrack-sync`
     - Domain: `mhdn.com.br`
     - Service type: **HTTP** (não HTTPS!)
     - URL: `sync:8787` (nome do service Docker, porta interna)
   - Copiar o token que aparece após "Install and run a connector" — é o argumento do `cloudflared service install <TOKEN>`. Começa com `eyJh` e tem **~200 caracteres**; copie o token inteiro, não só o prefixo.

2. **Criar o `.env` local** (gitignored). O token vem no comando `cloudflared service install <TOKEN>` que o dashboard mostra na aba "Install and run a connector" — copie o argumento inteiro depois de `install `, começando com `eyJh` e com ~200 caracteres. Sem quebras de linha, sem aspas:

   ```bash
   cd server
   # NÃO copie o "eyJhIjoi..." literal — cole o token INTEIRO do dashboard:
   echo 'CLOUDFLARE_TUNNEL_TOKEN=<COLE_TOKEN_INTEIRO_DE_~200_CHARS>' > .env
   chmod 600 .env
   # Sanidade: comprimento do token no .env (deve dar 150+)
   awk -F= '/^CLOUDFLARE_TUNNEL_TOKEN=/{print length($2)}' .env
   ```

3. **Subir:**

   ```bash
   docker compose up -d --build
   docker compose logs -f cloudflared   # esperado: "Registered tunnel connection"
   ```

4. **Smoke test remoto** (de qualquer máquina, sem VPN):

   ```bash
   URL=wss://backontrack-sync.mhdn.com.br npm run smoke
   ```

   Exit 0 = round-trip OK pelo TLS público da Cloudflare.

### Por que Cloudflare Tunnel (e não Traefik)

- **Zero porta aberta no roteador** — o `cloudflared` faz outbound; ideal pra homeserver atrás de NAT ou CG-NAT.
- **TLS gerenciado pela Cloudflare** — sem Let's Encrypt local, sem renovação, sem DNS challenge.
- **DDoS + cache + firewall grátis** na frente, se um dia precisar.
- **Um túnel serve N serviços** — se depois `nextcloud` ou outro quiser ser público, adiciona rota no mesmo túnel (sem novo container).

Trade-off honesto: **dependência da Cloudflare** — se o dashboard/rede deles cair, o tunel cai. Aceitável pra este uso.

## Persistência

Arquivo JSON por sala em `/data` (volume bind-mount `./data:/data`). Um `pathId` (ex.: `alice`) vira `alice.json`. Backup = copiar o diretório. Restore = colocar de volta antes do `up`.

Se apertar (concorrência alta, integridade, queries futuras), trocar por SQLite via `createSqlite3Persister` — mesmo shape, muda 1 função no `server.js`. Adiar até ter demanda concreta.

## Segurança

**Sem auth nesta fatia.** Trust-by-obscurity — quem sabe o `pathId` (userId) conecta e sincroniza. Aceitável enquanto os testers são 5-6 conhecidos e os IDs são difíceis de adivinhar. Auth real (JWT, token compartilhado, etc.) fica pra próxima fatia do M6.

Cloudflare Tunnel na frente já garante TLS válido; o server em si só fala WS plano na rede interna do Docker (sem porta publicada no host).

## O que NÃO está aqui

- Integração do client do app (`createWsSynchronizer` no `infra/persistence.js`) — próxima fatia.
- Auth real — fatia própria.
- Validação em cenários reais (offline→online, 2 devices, reinstall) — última fatia do M6.
- Migração de schema server-side (não temos, `MergeableStore` cuida da forma dos dados).
