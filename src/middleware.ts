import { defineMiddleware } from 'astro:middleware';

// `i18n.routing: 'manual'` requires a middleware file. Locales are resolved by the explicit
// `/[lang]/...` routes, so there is nothing to do here.
export const onRequest = defineMiddleware((_context, next) => next());
