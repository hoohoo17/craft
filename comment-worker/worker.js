const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

async function addLog(env, page, action, detail) {
  const logKey = `logs:${page}`;
  const logs = (await env.COMMENTS.get(logKey, 'json')) || [];
  logs.push({
    action,
    detail,
    date: new Date().toISOString(),
  });
  // 최근 500개만 유지
  if (logs.length > 500) logs.splice(0, logs.length - 500);
  await env.COMMENTS.put(logKey, JSON.stringify(logs));
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    const url = new URL(request.url);
    const page = url.searchParams.get('page') || 'index';
    const key = `comments:${page}`;

    // 로그 조회: GET /logs?page=index
    if (request.method === 'GET' && url.pathname === '/logs') {
      const logs = await env.COMMENTS.get(`logs:${page}`, 'json');
      return new Response(JSON.stringify(logs || []), {
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      });
    }

    if (request.method === 'GET') {
      const data = await env.COMMENTS.get(key, 'json');
      return new Response(JSON.stringify(data || []), {
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      });
    }

    if (request.method === 'DELETE') {
      const id = url.searchParams.get('id');
      if (!id) {
        return new Response(JSON.stringify({ error: 'id가 필요합니다' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
        });
      }
      const comments = (await env.COMMENTS.get(key, 'json')) || [];
      const deleted = comments.find(c => c.id === id);
      const filtered = comments.filter(c => c.id !== id);
      await env.COMMENTS.put(key, JSON.stringify(filtered));
      if (deleted) await addLog(env, page, 'DELETE', { name: deleted.name, message: deleted.message });
      return new Response(JSON.stringify({ ok: true }), {
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      });
    }

    if (request.method === 'POST') {
      const { name, message } = await request.json();
      if (!name || !message) {
        return new Response(JSON.stringify({ error: '이름과 메시지를 입력하세요' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
        });
      }

      const comments = (await env.COMMENTS.get(key, 'json')) || [];
      comments.push({
        id: Date.now().toString(),
        name: name.slice(0, 20),
        message: message.slice(0, 500),
        date: new Date().toISOString(),
      });

      // 최근 100개만 유지
      if (comments.length > 100) comments.splice(0, comments.length - 100);

      await env.COMMENTS.put(key, JSON.stringify(comments));
      await addLog(env, page, 'CREATE', { name: name.slice(0, 20), message: message.slice(0, 500) });
      return new Response(JSON.stringify({ ok: true }), {
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      });
    }

    return new Response('Not Found', { status: 404, headers: CORS_HEADERS });
  },
};
