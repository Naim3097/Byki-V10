// Vercel BotID: attaches an invisible challenge token to the protected API
// calls so the routes can reject scripted scraping (see src/server/guard.ts).
import { initBotId } from 'botid/client/core';

initBotId({
  protect: [
    { path: '/api/analyze', method: 'POST' },
    { path: '/api/dtc/lookup', method: 'POST' },
  ],
});
