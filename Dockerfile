# sheet-forge-web: Next.js standalone 빌드. API 주소는 코드의 "/api"(같은 호스트)라 빌드 인자가 필요 없다.
FROM node:22-slim AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
# 비root(숫자 uid)로 실행. Next가 런타임 캐시를 쓸 수 있게 .next/cache만 쓰기 가능하게 둔다.
RUN mkdir -p .next/cache && chown -R 10001 .next/cache
USER 10001
EXPOSE 3000
CMD ["node", "server.js"]
