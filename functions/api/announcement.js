import { json, isAdmin, safe } from '../_utils.js';

// トップページの🔔ボタンから見られる「お知らせ」。GETは一般ユーザーも呼ぶため認証不要、
// PUTは管理画面からの更新のみを許可する。
export const onRequestGet = safe(async ({ env }) => {
  const row = await env.DB.prepare('SELECT content, updated_at FROM announcement WHERE id = 1').first();
  return json({ content: row ? row.content : '', updatedAt: row ? row.updated_at : null });
});

export const onRequestPut = safe(async ({ request, env }) => {
  if (!isAdmin(request, env)) {
    return json({ error: 'unauthorized' }, 401);
  }

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return json({ error: 'invalid JSON body' }, 400);
  }

  const content = typeof body.content === 'string' ? body.content : '';
  const now = new Date().toISOString();
  await env.DB.prepare(
    `INSERT INTO announcement (id, content, updated_at) VALUES (1, ?, ?)
     ON CONFLICT(id) DO UPDATE SET content = excluded.content, updated_at = excluded.updated_at`
  ).bind(content, now).run();

  return json({ content, updatedAt: now });
});
