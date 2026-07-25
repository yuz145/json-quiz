import { json, isAdmin, safe } from '../_utils.js';

export const onRequestGet = safe(async ({ request, env }) => {
  if (!isAdmin(request, env)) {
    return json({ error: 'unauthorized' }, 401);
  }

  // IPごとの最新行（updated_atが最大の行）から国/地域/都市を取り出す。
  // 管理画面専用の情報のため、一般ユーザー向けAPI（/api/progress系）では返さない。
  const { results } = await env.DB.prepare(`
    SELECT
      latest.ip AS ip,
      n.nickname AS nickname,
      n.updated_at AS nicknameUpdatedAt,
      latest.updated_at AS lastSeen,
      latest.country AS country,
      latest.region AS region,
      latest.city AS city
    FROM (
      SELECT p.*, ROW_NUMBER() OVER (PARTITION BY p.ip ORDER BY p.updated_at DESC) AS rn
      FROM progress p
      WHERE p.ip IS NOT NULL
    ) latest
    LEFT JOIN ip_nicknames n ON n.ip = latest.ip
    WHERE latest.rn = 1
    ORDER BY latest.updated_at DESC
  `).all();

  return json(results);
});

export const onRequestPost = safe(async ({ request, env }) => {
  if (!isAdmin(request, env)) {
    return json({ error: 'unauthorized' }, 401);
  }

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return json({ error: 'invalid JSON body' }, 400);
  }

  const ip = typeof body.ip === 'string' ? body.ip.trim() : '';
  if (!ip) return json({ error: 'ip is required' }, 400);
  const nickname = typeof body.nickname === 'string' ? body.nickname.trim() : '';

  if (!nickname) {
    // 空文字の場合はニックネームをクリア（レコード自体を削除）
    await env.DB.prepare('DELETE FROM ip_nicknames WHERE ip = ?').bind(ip).run();
    return json({ ip, nickname: null });
  }

  const now = new Date().toISOString();
  await env.DB.prepare(
    `INSERT INTO ip_nicknames (ip, nickname, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(ip) DO UPDATE SET nickname = excluded.nickname, updated_at = excluded.updated_at`
  ).bind(ip, nickname, now).run();

  return json({ ip, nickname, updatedAt: now });
});
