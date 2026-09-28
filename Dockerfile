FROM node:22-bookworm-slim

# ffmpeg converts every upload to a small .m4a that plays on any phone.
RUN apt-get update \
  && apt-get install -y --no-install-recommends ffmpeg \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY public ./public
COPY src ./src
RUN mkdir -p /app/data && chown node:node /app/data

ENV NODE_ENV=production PORT=3000
EXPOSE 3000
USER node
CMD ["node", "src/server.js"]
