# ---- Stage 1: Builder ----
FROM node:20-alpine AS builder

RUN apk add --no-cache python3 make g++

WORKDIR /usr/src/app

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci

COPY . .

RUN npx prisma generate
RUN npm run build

# ---- Stage 2: Runner ----
FROM node:20-alpine AS runner

WORKDIR /usr/src/app

COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/src/generated ./dist/generated
COPY --from=builder /usr/src/app/prisma ./prisma
COPY package*.json ./

EXPOSE 3000

COPY start.sh ./
RUN chmod +x start.sh

ENTRYPOINT ["/bin/sh", "./start.sh"]
