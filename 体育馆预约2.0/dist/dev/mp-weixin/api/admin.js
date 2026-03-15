"use strict";
const utils_request = require("../utils/request.js");
function getMyManagedVenues() {
  return utils_request.get("/venues/manager/me");
}
function createVenue(data) {
  return utils_request.post("/venues", data);
}
function updateVenue(id, data) {
  return utils_request.put(`/venues/${id}`, data);
}
function updateVenueStatus(id, data) {
  return utils_request.patch(`/venues/${id}/status`, data);
}
function deleteVenue(id) {
  return utils_request.del(`/venues/${id}`);
}
function getVenueDetail(id) {
  return utils_request.get(`/venues/${id}`, {}, { cache: false });
}
function getVenueTimeslots(venueId, date) {
  return utils_request.get(`/timeslots/venue/${venueId}/date/${date}`);
}
function updateTimeslotStatus(id, data) {
  return utils_request.patch(`/timeslots/${id}/status`, data);
}
function getGeneratedDates(venueId) {
  return utils_request.get(`/timeslots/venue/${venueId}/generated-dates`);
}
exports.createVenue = createVenue;
exports.deleteVenue = deleteVenue;
exports.getGeneratedDates = getGeneratedDates;
exports.getMyManagedVenues = getMyManagedVenues;
exports.getVenueDetail = getVenueDetail;
exports.getVenueTimeslots = getVenueTimeslots;
exports.updateTimeslotStatus = updateTimeslotStatus;
exports.updateVenue = updateVenue;
exports.updateVenueStatus = updateVenueStatus;
//# sourceMappingURL=../../.sourcemap/mp-weixin/api/admin.js.map
