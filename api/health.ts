import {
  ApiRequestLike,
  ApiResponseLike,
  enforceApiSecurity,
} from './_security';

/**
 * Hardened Vercel Serverless Proxy Health Route (/api/health)
 * Any future cloud sync or external API call must route through /api/* using server-only process.env secrets.
 */
export default function handler(req: ApiRequestLike, res: ApiResponseLike) {
  const guard = enforceApiSecurity(req, res, ['GET']);
  if (!guard.ok) return;

  res.status(200).json({
    status: 'ok',
    service: 'pala-api',
    mode: 'local-first',
  });
}
