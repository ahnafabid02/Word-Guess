FROM node:24-alpine
WORKDIR /app
COPY package.json game.js server.js ./
COPY public ./public
USER node
ENV PORT=3000
EXPOSE 3000
CMD ["node", "server.js"]
