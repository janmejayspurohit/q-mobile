# Dockerfile

# Stage 1: Build the Next.js application
FROM node:22-alpine AS builder

WORKDIR /workdir

COPY package.json package-lock.json ./
RUN npm install

COPY . .

RUN npm run build

# Stage 2: Create the production image
FROM node:22-alpine AS runner

WORKDIR /workdir

ENV NODE_ENV production

# Copy the standalone output from the builder stage
COPY --from=builder /workdir/.next/standalone ./
COPY --from=builder /workdir/public ./public
COPY --from=builder /workdir/.next/static ./.next/static


EXPOSE 3000

CMD ["node", "server.js"]