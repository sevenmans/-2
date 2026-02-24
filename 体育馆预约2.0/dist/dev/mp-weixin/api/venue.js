"use strict";
const utils_request = require("../utils/request.js");
function getVenueList(params) {
  return utils_request.get("/venues", params);
}
function getVenueDetail(id) {
  return utils_request.get(`/venues/${id}`);
}
function getVenueTimeSlots(venueId, date, params = {}) {
  return utils_request.get(`/timeslots/venue/${venueId}/date/${date}`, params);
}
function getVenueTypes() {
  return utils_request.get("/venues/types");
}
function getPopularVenues(limit = 5) {
  return utils_request.get("/venues/popular", { limit });
}
function searchVenues(params) {
  return utils_request.get("/venues/search", params);
}
function getSharingVenues(params) {
  return utils_request.get("/venues/sharing", params);
}
const venueApi = {
  getVenueList,
  getVenueDetail,
  getVenueTimeSlots,
  getVenueTypes,
  getPopularVenues,
  searchVenues,
  getSharingVenues
};
exports.venueApi = venueApi;
//# sourceMappingURL=../../.sourcemap/mp-weixin/api/venue.js.map
