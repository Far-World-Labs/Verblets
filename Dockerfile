FROM node:20-slim

RUN apt-get update && apt-get install -y python3 python3-pip ffmpeg sox && \
    pip3 install --no-cache-dir TTS

WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
CMD ["node"]
