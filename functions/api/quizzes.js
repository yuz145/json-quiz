import { json, safe } from '../_utils.js';

export const onRequestGet = safe(async ({ env }) => {
  const { results } = await env.DB.prepare(
    `SELECT id, title, category,
            json_array_length(questions) AS count,
            updated_at AS updatedAt
     FROM quizzes
     ORDER BY created_at ASC`
  ).all();
  return json(results);
});
