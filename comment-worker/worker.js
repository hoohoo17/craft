const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Key',
};

function isAdmin(request, env) {
  return request.headers.get('X-Admin-Key') === env.ADMIN_KEY;
}

async function addLog(env, page, action, detail) {
  const logKey = `logs:${page}`;
  const logs = (await env.COMMENTS.get(logKey, 'json')) || [];
  logs.push({
    action,
    detail,
    date: new Date().toISOString(),
  });
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
    const json = (h) => ({ 'Content-Type': 'application/json', ...CORS_HEADERS, ...h });

    // 로그 조회 (관리자만)
    if (request.method === 'GET' && url.pathname === '/logs') {
      if (!isAdmin(request, env)) {
        return new Response(JSON.stringify({ error: '권한 없음' }), { status: 403, headers: json() });
      }
      const logs = await env.COMMENTS.get(`logs:${page}`, 'json');
      return new Response(JSON.stringify(logs || []), { headers: json() });
    }

    // 댓글 목록 조회
    if (request.method === 'GET') {
      const data = (await env.COMMENTS.get(key, 'json')) || [];
      if (isAdmin(request, env)) {
        return new Response(JSON.stringify(data), { headers: json() });
      }
      // 일반 사용자: 승인 댓글은 전체, 미승인은 이름/날짜만 (메시지 숨김)
      const sanitized = data.map(c =>
        c.approved
          ? c
          : { id: c.id, name: c.name, date: c.date, approved: false }
      );
      return new Response(JSON.stringify(sanitized), { headers: json() });
    }

    // 댓글 승인 (관리자만)
    if (request.method === 'PUT' && url.pathname === '/approve') {
      if (!isAdmin(request, env)) {
        return new Response(JSON.stringify({ error: '권한 없음' }), { status: 403, headers: json() });
      }
      const id = url.searchParams.get('id');
      const comments = (await env.COMMENTS.get(key, 'json')) || [];
      const comment = comments.find(c => c.id === id);
      if (comment) {
        comment.approved = true;
        await env.COMMENTS.put(key, JSON.stringify(comments));
        await addLog(env, page, 'APPROVE', { name: comment.name, message: comment.message });
      }
      return new Response(JSON.stringify({ ok: true }), { headers: json() });
    }

    // 댓글 삭제 (관리자만)
    if (request.method === 'DELETE') {
      if (!isAdmin(request, env)) {
        return new Response(JSON.stringify({ error: '권한 없음' }), { status: 403, headers: json() });
      }
      const id = url.searchParams.get('id');
      if (!id) {
        return new Response(JSON.stringify({ error: 'id가 필요합니다' }), { status: 400, headers: json() });
      }
      const comments = (await env.COMMENTS.get(key, 'json')) || [];
      const deleted = comments.find(c => c.id === id);
      const filtered = comments.filter(c => c.id !== id);
      await env.COMMENTS.put(key, JSON.stringify(filtered));
      if (deleted) await addLog(env, page, 'DELETE', { name: deleted.name, message: deleted.message });
      return new Response(JSON.stringify({ ok: true }), { headers: json() });
    }

    // 댓글 등록 (누구나, 비공개 상태로 저장)
    if (request.method === 'POST') {
      const { name, message } = await request.json();
      if (!name || !message) {
        return new Response(JSON.stringify({ error: '이름과 메시지를 입력하세요' }), { status: 400, headers: json() });
      }

      const comments = (await env.COMMENTS.get(key, 'json')) || [];
      comments.push({
        id: Date.now().toString(),
        name: name.slice(0, 20),
        message: message.slice(0, 500),
        date: new Date().toISOString(),
        approved: false,
      });

      if (comments.length > 100) comments.splice(0, comments.length - 100);

      await env.COMMENTS.put(key, JSON.stringify(comments));
      await addLog(env, page, 'CREATE', { name: name.slice(0, 20), message: message.slice(0, 500) });
      return new Response(JSON.stringify({ ok: true }), { headers: json() });
    }

    return new Response('Not Found', { status: 404, headers: CORS_HEADERS });
  },
};
