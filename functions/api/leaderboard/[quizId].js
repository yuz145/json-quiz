import { json, progressKey, progressIndexKey } from '../../_utils.js';

export async function onRequestGet({ params, env }) {
  const quizId = params.quizId;
  const idxRaw = await env.QUIZ_KV.get(progressIndexKey(quizId));
  const names = idxRaw ? JSON.parse(idxRaw) : [];

  const results = [];
  for (const name of names) {
    const raw = await env.QUIZ_KV.get(progressKey(quizId, name));
    if (!raw) continue;
    const p = JSON.parse(raw);
    const total = p.correct + p.wrong;
    results.push({
      name: p.name,
      correct: p.correct,
      wrong: p.wrong,
      total,
      rate: total > 0 ? Math.round((p.correct / total) * 100) : 0,
      completed: !!p.completed,
      updatedAt: p.updatedAt,
    });
  }
  results.sort((a, b) => b.rate - a.rate || b.total - a.total);
  return json(results);
}
