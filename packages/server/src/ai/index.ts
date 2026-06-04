/**
 * AI module entry point.
 *
 * Re-exports the router so it can be mounted in the main Koa app.
 */

export { default as aiRouter } from './routes.js'
export { default as monitorRouter } from './monitorRoutes.js'
