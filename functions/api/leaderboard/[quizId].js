import { json, progressKey, progressIndexKey, safe } from '../../_utils.js';

export const onRequestGet = safe(async ({ params, env }) => {
  const quizId = params.quizId;
  const idxKey = progressIndexKey(quizId);
  const idxRaw = await env.QUIZ_KV.get(idxKey);
  const deviceIds = idxRaw ? JSON.parse(idxRaw) : [];

  const results = [];
  const stillValid = [];
  for (const deviceId of deviceIds) {
    const raw = await env.QUIZ_KV.get(progressKey(quizId, deviceId));
    if (!raw) continue; // TTL経過で消えた参加者は一覧からも外す
    stillValid.push(deviceId);
    const p = JSON.parse(raw);
    const total = p.correct + p.wrong;
    results.push({
      label: '参加者' + stillValid.length,
      correct: p.correct,
      wrong: p.wrong,
      total,
      rate: total > 0 ? Math.round((p.correct / total) * 100) : 0,
      completed: !!p.completed,
      updatedAt: p.updatedAt,
    });
  }
  if (stillValid.length !== deviceIds.length) {
    await env.QUIZ_KV.put(idxKey, JSON.stringify(stillValid));
  }

  results.sort((a, b) => b.rate - a.rate || b.total - a.total);
  return json(results);
});
