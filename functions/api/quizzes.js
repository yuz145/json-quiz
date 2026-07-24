import { json, getQuizIndex } from '../_utils.js';

export async function onRequestGet({ env }) {
  const list = await getQuizIndex(env);
  return json(list);
}
