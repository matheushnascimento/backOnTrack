# Backing image slim, sem toolchain: o server só precisa de node runtime.
FROM node:22-alpine

WORKDIR /app

# Copiar manifest primeiro pra aproveitar cache do docker build.
COPY package.json ./
RUN npm install --omit=dev

# Depois o restante do server.
COPY server.js ./
COPY smoke-client.js ./

# Porta interna. O Traefik na frente mapeia via label, não via publish.
EXPOSE 8787

# Volume onde ficam os JSONs por sala (bind mount no compose).
VOLUME ["/data"]
ENV DATA_DIR=/data

CMD ["node", "server.js"]
