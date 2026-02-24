"use strict";
const utils_request = require("../utils/request.js");
function createBooking(data) {
  return utils_request.post("/bookings", data);
}
function getBookingDetail(id, params = {}, options = {}) {
  return utils_request.get(`/bookings/${id}`, params, options);
}
function cancelBooking(id) {
  return utils_request.put(`/bookings/${id}/cancel`);
}
function getVenueAvailableSlots(venueId, date) {
  return utils_request.get(`/bookings/venues/${venueId}/slots`, { date });
}
function createSharedBooking(data) {
  return utils_request.post("/bookings/shared", data);
}
exports.cancelBooking = cancelBooking;
exports.createBooking = createBooking;
exports.createSharedBooking = createSharedBooking;
exports.getBookingDetail = getBookingDetail;
exports.getVenueAvailableSlots = getVenueAvailableSlots;
//# sourceMappingURL=../../.sourcemap/mp-weixin/api/booking.js.map
