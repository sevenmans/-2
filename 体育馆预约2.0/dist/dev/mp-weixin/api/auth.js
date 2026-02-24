"use strict";
const utils_request = require("../utils/request.js");
function login(data) {
  return utils_request.post("/auth/signin", data);
}
function register(data) {
  return utils_request.post("/auth/signup", data);
}
function logout() {
  return utils_request.post("/auth/logout");
}
exports.login = login;
exports.logout = logout;
exports.register = register;
//# sourceMappingURL=../../.sourcemap/mp-weixin/api/auth.js.map
