import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone', // Docker 이미지에 필요한 파일만 담는다
  cacheComponents: true,
  partialPrefetching: true,
  reactCompiler: true,
  async rewrites() {
    // 운영(https://sheet.tsungmn.com)에서는 Ingress가 /api를 API 서버로 보내고 접두어를 뗀다.
    // 그래서 개발에서만 /api를 로컬 API 서버로 넘긴다(기존 Vite 프록시와 같은 동작).
    if (process.env.NODE_ENV === 'production') return [];
    const target = process.env.API_PROXY_TARGET ?? 'http://localhost:8000';
    return [{ source: '/api/:path*', destination: `${target}/:path*` }];
  },
};

export default nextConfig;
