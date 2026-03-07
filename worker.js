/**
 * 엠앤에서 페르소나 인터뷰 — Cloudflare Workers CORS 프록시
 * ──────────────────────────────────────────────────────────
 * GitHub Pages에서 Anthropic API를 직접 호출하면 CORS 오류가 발생합니다.
 * 이 Worker가 중간에서 요청을 전달해 CORS 문제를 해결합니다.
 *
 * 배포 방법:
 *   1. https://workers.cloudflare.com 접속 (무료 가입)
 *   2. "Create a Worker" 클릭
 *   3. 이 파일 전체 내용을 붙여넣기
 *   4. "Deploy" 클릭
 *   5. Worker URL 복사 (예: https://mnserve-proxy.사용자명.workers.dev)
 *   6. 앱 모달의 "프록시 URL" 입력창에 붙여넣기
 */

export default {
  async fetch(request, env) {

    // ── CORS 프리플라이트 처리 ──
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, x-api-key, anthropic-version',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    // GET 요청 → 상태 확인용
    if (request.method === 'GET') {
      return new Response(JSON.stringify({ status: 'ok', service: 'mnserve-persona-proxy' }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // POST 이외 요청 거부
    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 });
    }

    // ── Anthropic API로 전달 ──
    const body = await request.text();
    const apiKey = request.headers.get('x-api-key') || '';
    const version = request.headers.get('anthropic-version') || '2023-06-01';

    if (!apiKey) {
      return new Response(JSON.stringify({ error: { message: 'x-api-key 헤더가 없습니다.' } }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    try {
      const anthropicResp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': version,
        },
        body: body,
      });

      const respBody = await anthropicResp.arrayBuffer();

      return new Response(respBody, {
        status: anthropicResp.status,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });

    } catch (e) {
      return new Response(
        JSON.stringify({ error: { message: '프록시 오류: ' + e.message } }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }
  },
};
