import { json, isAdmin, safe, getQuizIndex, progressKey, quizKey } from '../../_utils.js';

export const onRequestGet = safe(async ({ request, env }) => {
  if (!isAdmin(request, env)) {
    return json({ error: 'unauthorized' }, 401);
  }

  const quizzes = await getQuizIndex(env);
  if (!Array.isArray(quizzes) || quizzes.length === 0) {
    return json([]);
  }

  const allRecords = [];

  for (const q of quizzes) {
    if (!q || !q.id) continue;
    const indexKey = 'index:progress:' + q.id;
    const rawDeviceList = await env.QUIZ_KV.get(indexKey);
    const deviceIds = rawDeviceList ? JSON.parse(rawDeviceList) : [];
    if (!Array.isArray(deviceIds) || deviceIds.length === 0) continue;

    // クイズの個別データを取得して総問題数を取得（なければq.countを使用）
    let totalCount = q.count || 0;
    try {
      const rawQuiz = await env.QUIZ_KV.get(quizKey(q.id));
      if (rawQuiz) {
        const parsed = JSON.parse(rawQuiz);
        if (Array.isArray(parsed.questions)) totalCount = parsed.questions.length;
      }
    } catch (e) {}

    const records = await Promise.all(
      deviceIds.map(async (devId) => {
        const raw = await env.QUIZ_KV.get(progressKey(q.id, devId));
        if (!raw) return null;
        try {
          const rec = JSON.parse(raw);
          return {
            deviceId: rec.deviceId || devId,
            ip: rec.ip || 'ローカル / 不明',
            quizId: q.id,
            quizTitle: q.title || q.id,
            category: q.category || '未分類',
            idx: rec.idx || 0,
            orderLength: Array.isArray(rec.order) ? rec.order.length : totalCount,
            totalCount: totalCount,
            correct: rec.correct || 0,
            wrong: rec.wrong || 0,
            completed: !!rec.completed,
            updatedAt: rec.updatedAt || '',
          };
        } catch (e) {
          return null;
        }
      })
    );

    records.forEach(r => {
      if (r) allRecords.push(r);
    });
  }

  // 最終プレイ日時の新しい順（降順）にソート
  allRecords.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

  return json(allRecords);
});

export const onRequestDelete = safe(async ({ request, env }) => {
  if (!isAdmin(request, env)) {
    return json({ error: 'unauthorized' }, 401);
  }

  const quizzes = await getQuizIndex(env);
  if (Array.isArray(quizzes)) {
    for (const q of quizzes) {
      if (!q || !q.id) continue;
      const indexKey = 'index:progress:' + q.id;
      try {
        const rawDeviceList = await env.QUIZ_KV.get(indexKey);
        const deviceIds = rawDeviceList ? JSON.parse(rawDeviceList) : [];
        if (Array.isArray(deviceIds)) {
          await Promise.all(
            deviceIds.map(devId => env.QUIZ_KV.delete(progressKey(q.id, devId)))
          );
        }
        await env.QUIZ_KV.delete(indexKey);
      } catch (e) {}
    }
  }

  return json({ success: true, message: 'すべての取り組みログを全削除しました。' });
});
