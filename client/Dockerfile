# syntax=docker/dockerfile:1

# ---------- Build stage: Node + Angular CLI (05 §10.2) ----------
FROM node:20-alpine AS build
WORKDIR /build

# Dependencies first, so they are cached until the lockfile changes.
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .
# Tests run outside the image (ng test); the image build only produces the bundle.
RUN npx ng build --configuration production

# ---------- Runtime stage: nginx serves the SPA and proxies /api ----------
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /build/dist/client/browser /usr/share/nginx/html
EXPOSE 80
