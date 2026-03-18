"use strict";
const config_index = require("../config/index.js");
function getFileBaseURL() {
  return config_index.config.baseURL.replace(/\/api\/?$/, "");
}
function resolveFileUrl(path) {
  if (!path)
    return "";
  if (typeof path !== "string")
    return String(path);
  if (/^https?:\/\//i.test(path))
    return path;
  if (path.startsWith("/uploads/"))
    return getFileBaseURL() + path;
  return path;
}
exports.resolveFileUrl = resolveFileUrl;
//# sourceMappingURL=../../.sourcemap/mp-weixin/utils/url.js.map
