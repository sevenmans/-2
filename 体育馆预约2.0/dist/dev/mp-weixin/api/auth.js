"use strict";
const utils_request = require("../utils/request.js");
function login(data) {
  return utils_request.post("/auth/signin", data);
}
function logout() {
  return utils_request.post("/auth/logout");
}
function wechatLogin(data) {
  return utils_request.post("/auth/wechat/login", data);
}
exports.login = login;
exports.logout = logout;
exports.wechatLogin = wechatLogin;
//# sourceMappingURL=../../.sourcemap/mp-weixin/api/auth.js.map
