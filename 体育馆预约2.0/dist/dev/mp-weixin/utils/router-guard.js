"use strict";
require("../common/vendor.js");
const ADMIN_ROLE = "ROLE_VENUE_ADMIN";
const guestPages = [
  "/pages/user/login",
  "/pages/index/index"
];
function isAdmin(userInfo) {
  if (!userInfo || !userInfo.roles)
    return false;
  return Array.isArray(userInfo.roles) ? userInfo.roles.includes(ADMIN_ROLE) : userInfo.roles === ADMIN_ROLE;
}
exports.guestPages = guestPages;
exports.isAdmin = isAdmin;
//# sourceMappingURL=../../.sourcemap/mp-weixin/utils/router-guard.js.map
