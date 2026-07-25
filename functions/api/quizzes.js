import { json, safe } from '../_utils.js';

export const onRequestGet = safe(async ({ request, env }) => {
  const url = new URL(request.url);
  const deviceId = url.searchParams.get('deviceId');

  if (!deviceId) {
    const { results } = await env.DB.prepare(
      `SELECT id, title, category,
              json_array_length(questions) AS count,
              updated_at AS updatedAt
       FROM quizzes
       ORDER BY created_at ASC`
    ).all();
    return json(results);
  }

  // deviceIdが指定された場合、そのデバイスのこれまでの最高正解数(bestCorrect)を併せて返す
  const { results } = await env.DB.prepare(
    `SELECT q.id AS id, q.title AS title, q.category AS category,
            json_array_length(q.questions) AS count,
            q.updated_at AS updatedAt,
            COALESCE(p.best_correct, 0) AS bestCorrect,
            CASE WHEN p.device_id IS NULL THEN 0 ELSE 1 END AS attempted
     FROM quizzes q
     LEFT JOIN progress p ON p.quiz_id = q.id AND p.device_id = ?
     ORDER BY q.created_at ASC`
  ).bind(deviceId).all();
  return json(results);
});
