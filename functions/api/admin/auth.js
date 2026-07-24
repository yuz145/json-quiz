import { json, isAdmin, safe } from '../../_utils.js';

export const onRequestPost = safe(async ({ request, env }) => {
  if (isAdmin(request, env)) {
    return json({ success: true });
  } else {
    return json({ error: 'invalid password' }, 401);
  }
});
