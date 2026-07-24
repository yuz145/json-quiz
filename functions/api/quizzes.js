import { json, getQuizIndex, normalizeCategory, safe } from '../_utils.js';

export const onRequestGet = safe(async ({ env }) => {
  const list = await getQuizIndex(env);
  return json(list.map(entry => ({ ...entry, category: normalizeCategory(entry.category) })));
});
