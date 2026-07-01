import { handleWebhook } from './webhook';
import { handleAdmin, requireAuth } from './admin';
import type { Env } from './types';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const { pathname } = new URL(request.url);

    if (pathname === '/webhook' && request.method === 'POST') {
      return handleWebhook(request, env);
    }

    if (pathname === '/admin' || pathname.startsWith('/api/')) {
      const authError = requireAuth(request, env);
      if (authError) return authError;
      return handleAdmin(request, env);
    }

    return env.ASSETS.fetch(request);
  },
};
