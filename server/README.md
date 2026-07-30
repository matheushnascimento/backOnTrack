# Back on Track — Sync Server

Server WebSocket do TinyBase pra sincronizar dados entre dispositivos do app Back on Track. Fatia 2 da implementação do M6 (#198), sobre a decisão da [ADR-009](../docs/03-decisoes-tecnicas.md#adr-009).

## Arquitetura em uma frase

Node.js + `ws` + `createWsServer` do TinyBase, atrás do **Cloudflare Tunnel `home server`** (`cloudflared` do systemd, já rodando no host, servindo outros subdomínios). Uma `MergeableStore` por "sala" (o path da URL WS), persistida em arquivo JSON no volume. Cliente conecta em `wss://backontrack-sync.mhdn.com.br/<userId>`.

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

O homeserver **já tem um `cloudflared` rodando como serviço systemd** (unit `/etc/systemd/system/cloudflared.service`), servindo o túnel `home server` da Cloudflare com outros subdomínios (`app`, `cloud`, `mc`). **Reusamos esse túnel** — não subimos um segundo `cloudflared` no compose (seria replica redundante da mesma tunnel).

Passos (uma vez):

1. **Adicionar a rota `backontrack-sync` no dashboard do túnel:**

   Dashboard → túnel `home server` → aba **Routes → + Add route** (ou "Public Hostname → Add a public hostname"):
   - **Subdomain:** `backontrack-sync`
   - **Domain:** `mhdn.com.br`
   - **Service type:** **HTTP** (não HTTPS!)
   - **URL:** `127.0.0.1:8787`

   O cloudflared do systemd puxa a nova rota automaticamente — sem restart, sem rebuild.

2. **Subir o container `sync`:**

   ```bash
   cd server
   docker compose up -d --build
   docker compose logs sync   # esperado: "[sync] listening on ws://0.0.0.0:8787 ..."
   ```

   O container publica a porta 8787 **só em 127.0.0.1** (loopback do host — acessível pelo cloudflared do systemd, mas não pela LAN nem externamente).

3. **Smoke test remoto** (de qualquer máquina, sem VPN):

   ```bash
   URL=wss://backontrack-sync.mhdn.com.br npm run smoke
   ```

   Exit 0 = round-trip OK pelo TLS público da Cloudflare.

### Por que Cloudflare Tunnel

- **Zero porta aberta no roteador** — o `cloudflared` faz outbound; ideal pra homeserver atrás de NAT ou CG-NAT.
- **TLS gerenciado pela Cloudflare** — sem Let's Encrypt local, sem renovação, sem DNS challenge.
- **DDoS + cache + firewall grátis** na frente, se um dia precisar.
- **Um túnel serve N serviços** — o `home server` já servia `app`/`cloud`/`mc`; a rota `backontrack-sync` entra sem novo cloudflared.

Trade-off honesto: **dependência da Cloudflare** — se o dashboard/rede deles cair, o tunel cai. Aceitável pra este uso.

### Rotate do token (só se vazar)

O cloudflared do systemd usa `--token <JWT>` embutido na unit file. Se o token vazar (ex.: apareceu em log/output), **rotacione**:

1. Dashboard do túnel → **Rotate token** (invalida o antigo no lado Cloudflare).
2. No host, com `sudo` (o serviço roda como root):

   ```bash
   sudo cloudflared tunnel login   # uma vez — só se ~/.cloudflared/cert.pem não existe
   sudo bash -c '
     NEW=$(cloudflared tunnel token <TUNNEL_UUID>) && \
     [ ${#NEW} -ge 150 ] && [[ "$NEW" == eyJ* ]] && \
     cp /etc/systemd/system/cloudflared.service /etc/systemd/system/cloudflared.service.bak && \
     sed -i "s|--token [A-Za-z0-9._-]*|--token $NEW|" /etc/systemd/system/cloudflared.service && \
     echo "OK: ${#NEW} chars gravados"
   '
   sudo systemctl daemon-reload && sudo systemctl restart cloudflared
   ```

   O `cloudflared tunnel token <UUID>` imprime o token atual do túnel — pegamos direto via API em vez de depender do dashboard mostrar. Sem eco no shell.

## Persistência

Arquivo JSON por sala em `/data` (volume bind-mount `./data:/data`). Um `pathId` (ex.: `alice`) vira `alice.json`. Backup = copiar o diretório. Restore = colocar de volta antes do `up`.

Se apertar (concorrência alta, integridade, queries futuras), trocar por SQLite via `createSqlite3Persister` — mesmo shape, muda 1 função no `server.js`. Adiar até ter demanda concreta.

## Autenticação (M6 fatia B, #211, ADR-010)

O server valida JWT do Supabase se o cliente mandar `?token=<JWT>` na URL. HS256 verificado com `crypto` nativo (zero dep). Enforça `jwt.sub === pathId` — quem sabe o path sem o token do dono não conecta (403).

Duas envs controlam o comportamento:

| Env                   | Default    | Efeito                                                                                                      |
| --------------------- | ---------- | ----------------------------------------------------------------------------------------------------------- |
| `AUTH_MODE`           | `optional` | `optional`: aceita anônimo se sem token. `required`: rejeita sem token (401).                               |
| `SUPABASE_JWT_SECRET` | vazio      | Secret HS256 do projeto Supabase. Obrigatório se `AUTH_MODE=required` OU se algum cliente mandar `?token=`. |

**Onde pegar o `SUPABASE_JWT_SECRET`:** Supabase Dashboard → Project Settings → API → **JWT Settings** → "JWT Secret". Rotate lá também se precisar. É diferente da `anon key` (que é pública, vai no bundle do app); o JWT Secret NUNCA deve ir pro cliente.

Adicionar ao `.env` local do server:

```bash
cd server
echo 'AUTH_MODE=optional' >> .env
echo 'SUPABASE_JWT_SECRET=<colar-o-secret-aqui>' >> .env
chmod 600 .env
docker compose up -d --build
```

### Matriz de comportamento

| Requisição                          | `AUTH_MODE=optional` | `AUTH_MODE=required` |
| ----------------------------------- | -------------------- | -------------------- |
| Sem `?token=`                       | ✅ aceita anônimo    | ❌ 401               |
| `?token=` válido + `sub === pathId` | ✅ aceita            | ✅ aceita            |
| `?token=` válido + `sub !== pathId` | ❌ 403               | ❌ 403               |
| `?token=` assinatura inválida       | ❌ 401               | ❌ 401               |
| `?token=` expirado                  | ❌ 401               | ❌ 401               |

### Rollout

1. Deploy com `AUTH_MODE=optional`. Clientes anônimos (compat) continuam sincronizando.
2. Merge da fatia C (cliente passa a mandar JWT + migração dos dados anônimos → sala do userId). OTA chega nos testers.
3. Aviso via WhatsApp (Evolution API) pros testers logarem — [[evolution-api-testers-stack]].
4. Dias depois, PR separado: flip `AUTH_MODE=required` no server. Anônimo passa a ser rejeitado.

Cloudflare Tunnel na frente já garante TLS válido; o server em si só fala WS plano em `127.0.0.1:8787` do host (loopback, não LAN — só o cloudflared do systemd alcança).

## O que NÃO está aqui

- Cliente do app passando `?token=` — vem na fatia C junto com a migração dos dados anônimos.
- Migração de dados anônimos → sala do userId (fatia C).
- Validação em cenários reais (offline→online, 2 devices, reinstall) — última fatia do M6.
- Migração de schema server-side (não temos, `MergeableStore` cuida da forma dos dados).
