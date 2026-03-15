package com.example.gymbooking.controller;

import com.example.gymbooking.model.Order;
import com.example.gymbooking.model.SharingOrder;
import com.example.gymbooking.model.SharingRequest;
import com.example.gymbooking.model.Venue;
import com.example.gymbooking.payload.response.MessageResponse;
import com.example.gymbooking.repository.OrderRepository;
import com.example.gymbooking.repository.SharingOrderRepository;
import com.example.gymbooking.repository.SharingRequestRepository;
import com.example.gymbooking.repository.UserRepository;
import com.example.gymbooking.repository.VenueRepository;
import com.example.gymbooking.security.services.UserDetailsImpl;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/verification")
@CrossOrigin(origins = "*")
public class VerificationController {

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private SharingRequestRepository sharingRequestRepository;

    @Autowired
    private SharingOrderRepository sharingOrderRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private VenueRepository venueRepository;

    @GetMapping("/code/{code}")
    @PreAuthorize("hasRole('ROLE_VENUE_ADMIN') or hasRole('ROLE_SUPER_ADMIN')")
    public ResponseEntity<?> getOrderByVerificationCode(@PathVariable String code) {
        try {
            UserDetailsImpl currentUser = getCurrentUser();
            ResolvedOrder resolvedOrder = resolveOrderByCode(code);
            if (!isVenueManagedByCurrentAdmin(resolvedOrder.order.getVenueId(), currentUser.getId())) {
                return ResponseEntity.status(403).body(new MessageResponse("无权限查看该订单"));
            }
            Map<String, Object> response = buildOrderDetailResponse(resolvedOrder);
            response.put("success", true);
            response.put("message", "核销码查询成功");
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(new MessageResponse(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(new MessageResponse("核销码查询失败: " + e.getMessage()));
        }
    }

    @PostMapping("/code/verify")
    @PreAuthorize("hasRole('ROLE_VENUE_ADMIN') or hasRole('ROLE_SUPER_ADMIN')")
    public ResponseEntity<?> verifyByCode(@RequestBody(required = false) Map<String, Object> payload,
                                          @RequestParam(required = false) String code) {
        try {
            String verificationCode = code;
            if ((verificationCode == null || verificationCode.trim().isEmpty())
                    && payload != null && payload.containsKey("code")) {
                verificationCode = String.valueOf(payload.get("code"));
            }
            if (verificationCode == null || verificationCode.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(new MessageResponse("缺少核销码"));
            }

            UserDetailsImpl currentUser = getCurrentUser();
            ResolvedOrder resolvedOrder = resolveOrderByCode(verificationCode.trim());

            if (!isVenueManagedByCurrentAdmin(resolvedOrder.order.getVenueId(), currentUser.getId())) {
                return ResponseEntity.status(403).body(new MessageResponse("无权限核销该订单"));
            }

            Order order = resolvedOrder.order;
            if (order.getStatus() != Order.OrderStatus.CONFIRMED
                    && order.getStatus() != Order.OrderStatus.PAID
                    && order.getStatus() != Order.OrderStatus.SHARING_SUCCESS) {
                return ResponseEntity.badRequest().body(new MessageResponse("订单状态不是可核销状态，无法核销"));
            }

            order.setStatus(Order.OrderStatus.VERIFIED);
            Order updatedOrder = orderRepository.save(order);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "订单核销成功");
            response.put("verificationCode", verificationCode);
            response.put("codeType", resolvedOrder.codeType);
            response.put("verifiedBy", currentUser.getUsername());
            response.put("verificationTime", LocalDateTime.now());
            response.put("order", updatedOrder);
            if (resolvedOrder.sharingRequest != null) {
                response.put("verifiedParticipant", Map.of(
                        "requestId", resolvedOrder.sharingRequest.getId(),
                        "username", resolvedOrder.sharingRequest.getApplicantUsername()
                ));
            }
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(new MessageResponse(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(new MessageResponse("订单核销失败: " + e.getMessage()));
        }
    }

    /**
     * 核销订单（按订单ID）
     */
    @PostMapping("/orders/{id}/verify")
    @PreAuthorize("hasRole('ROLE_VENUE_ADMIN') or hasRole('ROLE_SUPER_ADMIN')")
    public ResponseEntity<?> verifyOrder(@PathVariable Long id) {
        try {
            UserDetailsImpl currentUser = getCurrentUser();
            Order order = orderRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("订单不存在"));

            if (!isVenueManagedByCurrentAdmin(order.getVenueId(), currentUser.getId())) {
                return ResponseEntity.status(403).body(new MessageResponse("无权限核销该订单"));
            }

            if (order.getStatus() != Order.OrderStatus.CONFIRMED
                    && order.getStatus() != Order.OrderStatus.PAID
                    && order.getStatus() != Order.OrderStatus.SHARING_SUCCESS) {
                return ResponseEntity.badRequest()
                        .body(new MessageResponse("订单状态不是已确认或已支付，无法进行核销操作"));
            }

            order.setStatus(Order.OrderStatus.VERIFIED);
            Order updatedOrder = orderRepository.save(order);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "订单核销成功");
            response.put("order", updatedOrder);
            response.put("verificationTime", LocalDateTime.now());

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(new MessageResponse("订单核销失败: " + e.getMessage()));
        }
    }

    /**
     * 完成订单
     * 将订单状态从VERIFIED更新为COMPLETED
     */
    @PostMapping("/orders/{id}/complete")
    @PreAuthorize("hasRole('ROLE_VENUE_ADMIN') or hasRole('ROLE_SUPER_ADMIN')")
    public ResponseEntity<?> completeOrder(@PathVariable Long id) {
        try {
            UserDetailsImpl currentUser = getCurrentUser();
            Order order = resolveOrderForCompletion(id);

            if (!isVenueManagedByCurrentAdmin(order.getVenueId(), currentUser.getId())) {
                return ResponseEntity.status(403).body(new MessageResponse("无权限完成该订单"));
            }

            if (order.getStatus() != Order.OrderStatus.VERIFIED) {
                return ResponseEntity.badRequest()
                        .body(new MessageResponse("订单状态不是已核销，无法完成订单"));
            }

            order.setStatus(Order.OrderStatus.COMPLETED);
            Order updatedOrder = orderRepository.save(order);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "订单已完成");
            response.put("order", updatedOrder);
            response.put("completionTime", LocalDateTime.now());

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(new MessageResponse("完成订单失败: " + e.getMessage()));
        }
    }

    private Order resolveOrderForCompletion(Long id) {
        if (id == null) {
            throw new RuntimeException("订单不存在");
        }
        if (id >= 0) {
            return orderRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("订单不存在"));
        }
        Long requestId = -id;
        SharingRequest sharingRequest = sharingRequestRepository.findById(requestId)
                .orElseThrow(() -> new RuntimeException("虚拟订单对应申请不存在"));
        Long orderId = sharingRequest.getOrderId();
        if (orderId == null && sharingRequest.getSharingOrderId() != null) {
            SharingOrder sharingOrder = sharingOrderRepository.findById(sharingRequest.getSharingOrderId())
                    .orElseThrow(() -> new RuntimeException("拼场订单不存在"));
            orderId = sharingOrder.getOrderId();
        }
        if (orderId == null) {
            throw new RuntimeException("虚拟订单未关联主订单");
        }
        return orderRepository.findById(orderId)
                .orElseThrow(() -> new RuntimeException("虚拟订单关联主订单不存在"));
    }

    /**
     * 获取订单核销状态
     */
    @GetMapping("/orders/{id}/status")
    public ResponseEntity<?> getVerificationStatus(@PathVariable Long id) {
        try {
            Order order = orderRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("订单不存在"));

            Map<String, Object> response = new HashMap<>();
            response.put("orderId", order.getId());
            response.put("orderNo", order.getOrderNo());
            response.put("status", order.getStatus());
            response.put("statusDescription", order.getStatus().getDescription());
            response.put("isVerified", order.getStatus() == Order.OrderStatus.VERIFIED
                    || order.getStatus() == Order.OrderStatus.COMPLETED);
            response.put("isCompleted", order.getStatus() == Order.OrderStatus.COMPLETED);

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(new MessageResponse("获取核销状态失败: " + e.getMessage()));
        }
    }

    private UserDetailsImpl getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof UserDetailsImpl)) {
            throw new IllegalArgumentException("未获取到有效登录信息");
        }
        return (UserDetailsImpl) authentication.getPrincipal();
    }

    private boolean isVenueManagedByCurrentAdmin(Long venueId, Long userId) {
        Optional<Venue> venue = venueRepository.findById(venueId);
        return venue.isPresent() && Objects.equals(venue.get().getManagerId(), userId);
    }

    private ResolvedOrder resolveOrderByCode(String code) {
        if (code == null || code.trim().isEmpty()) {
            throw new IllegalArgumentException("核销码不能为空");
        }

        String normalizedCode = code.trim();
        if (normalizedCode.startsWith("REQ_")) {
            return resolveByRequestCode(normalizedCode);
        }

        Order order = orderRepository.findByOrderNo(normalizedCode)
                .orElseThrow(() -> new IllegalArgumentException("核销码不存在"));
        return new ResolvedOrder(order, "ORDER_CODE", null);
    }

    private ResolvedOrder resolveByRequestCode(String code) {
        String idPart = code.substring(4);
        if (idPart.isEmpty()) {
            throw new IllegalArgumentException("参与者核销码格式不正确");
        }

        Long requestId;
        try {
            requestId = Long.valueOf(idPart);
        } catch (NumberFormatException e) {
            throw new IllegalArgumentException("参与者核销码格式不正确");
        }

        SharingRequest sharingRequest = sharingRequestRepository.findById(requestId)
                .orElseThrow(() -> new IllegalArgumentException("参与者核销码不存在"));

        Long orderId = sharingRequest.getOrderId();
        if (orderId == null && sharingRequest.getSharingOrderId() != null) {
            SharingOrder sharingOrder = sharingOrderRepository.findById(sharingRequest.getSharingOrderId())
                    .orElseThrow(() -> new IllegalArgumentException("拼场订单不存在"));
            orderId = sharingOrder.getOrderId();
        }

        if (orderId == null) {
            throw new IllegalArgumentException("未找到关联主订单");
        }

        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new IllegalArgumentException("关联主订单不存在"));
        return new ResolvedOrder(order, "REQUEST_CODE", sharingRequest);
    }

    private Map<String, Object> buildOrderDetailResponse(ResolvedOrder resolvedOrder) {
        Order order = resolvedOrder.order;
        Map<String, Object> response = new HashMap<>();
        response.put("orderId", order.getId());
        response.put("orderNo", order.getOrderNo());
        response.put("status", order.getStatus());
        response.put("statusDescription", order.getStatus().getDescription());
        response.put("bookingType", order.getBookingType());
        response.put("venueId", order.getVenueId());
        response.put("venueName", order.getVenueName());
        response.put("bookingTime", order.getBookingTime());
        response.put("endTime", order.getEndTime());
        response.put("totalPrice", order.getTotalPrice());
        response.put("username", order.getUsername());
        response.put("codeType", resolvedOrder.codeType);
        response.put("isVerified", order.getStatus() == Order.OrderStatus.VERIFIED
                || order.getStatus() == Order.OrderStatus.COMPLETED);

        userRepository.findByUsername(order.getUsername()).ifPresent(user -> {
            response.put("userPhone", user.getPhone());
            response.put("userNickname", user.getNickname());
        });

        if (resolvedOrder.sharingRequest != null) {
            response.put("matchedParticipant", Map.of(
                    "requestId", resolvedOrder.sharingRequest.getId(),
                    "username", resolvedOrder.sharingRequest.getApplicantUsername(),
                    "contact", resolvedOrder.sharingRequest.getApplicantContact(),
                    "status", resolvedOrder.sharingRequest.getStatus(),
                    "isPaid", resolvedOrder.sharingRequest.getIsPaid() != null && resolvedOrder.sharingRequest.getIsPaid()
            ));
        }

        if (order.getBookingType() == Order.BookingType.SHARED) {
            SharingOrder sharingOrder = sharingOrderRepository.findByOrderId(order.getId());
            if (sharingOrder != null) {
                response.put("sharingOrderId", sharingOrder.getId());
                response.put("teamName", sharingOrder.getTeamName());
                response.put("contactInfo", sharingOrder.getContactInfo());
                response.put("description", sharingOrder.getDescription());
                response.put("currentParticipants", sharingOrder.getCurrentParticipants());
                response.put("maxParticipants", sharingOrder.getMaxParticipants());
                response.put("pricePerTeam", sharingOrder.getPricePerTeam());
                response.put("sharingStatus", sharingOrder.getStatus());
            }

            List<SharingRequest> requests = sharingRequestRepository.findByOrderId(order.getId());
            List<Map<String, Object>> participants = requests.stream()
                    .filter(request -> request.getStatus() != SharingRequest.RequestStatus.CANCELLED
                            && request.getStatus() != SharingRequest.RequestStatus.REJECTED
                            && request.getStatus() != SharingRequest.RequestStatus.TIMEOUT_CANCELLED)
                    .map(request -> {
                        Map<String, Object> participant = new HashMap<>();
                        participant.put("requestId", request.getId());
                        participant.put("username", request.getApplicantUsername());
                        participant.put("contact", request.getApplicantContact());
                        participant.put("status", request.getStatus());
                        participant.put("isPaid", request.getIsPaid() != null && request.getIsPaid());
                        return participant;
                    })
                    .collect(Collectors.toList());
            response.put("participants", participants);
        }

        return response;
    }

    private static class ResolvedOrder {
        private final Order order;
        private final String codeType;
        private final SharingRequest sharingRequest;

        private ResolvedOrder(Order order, String codeType, SharingRequest sharingRequest) {
            this.order = order;
            this.codeType = codeType;
            this.sharingRequest = sharingRequest;
        }
    }
}
