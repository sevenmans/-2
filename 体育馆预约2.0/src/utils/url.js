import config from '@/config/index.js'

function getFileBaseURL() {
  // config.baseURL like: http://localhost:8080/api
  return config.baseURL.replace(/\/api\/?$/, '')
}

/**
 * Resolve backend stored file path to absolute URL for <image/>.
 * - absolute http(s) is returned as-is
 * - /uploads/... will be prefixed with server origin (baseURL without /api)
 * - other relative paths are returned as-is
 */
export function resolveFileUrl(path) {
  if (!path) return ''
  if (typeof path !== 'string') return String(path)
  if (/^https?:\/\//i.test(path)) return path
  if (path.startsWith('/uploads/')) return getFileBaseURL() + path
  return path
}

