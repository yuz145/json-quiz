import { json, getQuizIndex, normalizeCategory } from '../_utils.js';

export async function onRequestGet({ env }) {
  const list = await getQuizIndex(env);
  return json(list.map(entry => ({ ...entry, category: normalizeCategory(entry.category) })));
}
