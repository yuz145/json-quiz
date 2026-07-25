import { json, isAdmin, safe } from '../../_utils.js';

export const onRequestGet = safe(async ({ request, env }) => {
  if (!isAdmin(request, env)) {
    return json({ error: 'unauthorized' }, 401);
  }

  const { results } = await env.DB.prepare(`
    SELECT
      p.device_id AS deviceId,
      p.ip AS ip,
      p.quiz_id AS quizId,
      q.title AS quizTitle,
      q.category AS category,
      p.idx AS idx,
      json_array_length(p.order_json) AS orderLength,
      json_array_length(q.questions) AS totalCount,
      p.correct AS correct,
      p.wrong AS wrong,
      p.completed AS completed,
      p.updated_at AS updatedAt
    FROM progress p
    JOIN quizzes q ON q.id = p.quiz_id
    ORDER BY p.updated_at DESC
  `).all();

  const records = results.map(r => ({
    ...r,
    completed: !!r.completed,
    category: r.category || '未分類',
  }));

  return json(records);
});

export const onRequestDelete = safe(async ({ request, env }) => {
  if (!isAdmin(request, env)) {
    return json({ error: 'unauthorized' }, 401);
  }
  await env.DB.prepare('DELETE FROM progress').run();
  return json({ success: true, message: 'すべての取り組みログを全削除しました。' });
});
