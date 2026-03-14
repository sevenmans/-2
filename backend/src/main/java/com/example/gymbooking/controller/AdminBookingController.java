package com.example.gymbooking.controller;

import com.example.gymbooking.model.Order;
import com.example.gymbooking.model.SharingOrder;
import com.example.gymbooking.model.SharingRequest;
import com.example.gymbooking.model.User;
import com.example.gymbooking.model.Venue;
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
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeParseException;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin/bookings")
@CrossOrigin(origins = "*")
public class AdminBookingController {

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private VenueRepository venueRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private SharingOrderRepository sharingOrderRepository;

    @Autowired
    private SharingRequestRepository sharingRequestRepository;

    private static final org.slf4j.Logger logger = org.slf4j.LoggerFactory.getLogger(AdminBookingController.class);

    @GetMapping
    @PreAuthorize("hasRole('ROLE_VENUE_ADMIN') or hasRole('ROLE_SUPER_ADMIN')")
    public ResponseEntity<?> getAdminBookingList(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int pageSize,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Long venueId,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate) {
        try {
            if (page < 1) {
                page = 1;
            }
            if (pageSize < 1) {
                pageSize = 10;
            }

            UserDetailsImpl currentUser = getCurrentUser();
            logger.info("当前用户ID: {}, 用户名: {}", currentUser.getId(), currentUser.getUsername());

            Set<Long> accessibleVenueIds = resolveAccessibleVenueIds(currentUser);
            logger.info("可访问的场馆IDs: {}", accessibleVenueIds);

            List<Order> allOrders = orderRepository.findAll();
            logger.info("数据库中总订单数: {}", allOrders.size());

            List<Order> orders = allOrders.stream()
                    .filter(order -> accessibleVenueIds.contains(order.getVenueId()))
                    .collect(Collectors.toList());
            logger.info("筛选后属于当前管理员场馆的订单数: {}", orders.size());

            if (venueId != null) {
                Long targetVenueId = venueId;
                orders = orders.stream()
                        .filter(order -> Objects.equals(order.getVenueId(), targetVenueId))
                        .collect(Collectors.toList());
            }

            if (status != null && !status.trim().isEmpty()) {
                String normalizedStatus = status.trim().toUpperCase();
                // 待核销状态包括：PAID、CONFIRMED、SHARING_SUCCESS
                if ("PAID".equals(normalizedStatus)) {
                    orders = orders.stream()
                            .filter(order -> order.getStatus() == Order.OrderStatus.PAID
                                    || order.getStatus() == Order.OrderStatus.CONFIRMED
                                    || order.getStatus() == Order.OrderStatus.SHARING_SUCCESS)
                            .collect(Collectors.toList());
                } else {
                    Order.OrderStatus targetStatus = Order.OrderStatus.valueOf(normalizedStatus);
                    orders = orders.stream()
                            .filter(order -> order.getStatus() == targetStatus)
                            .collect(Collectors.toList());
                }
            }

            if (type != null && !type.trim().isEmpty()) {
                Order.BookingType bookingType = Order.BookingType.valueOf(type.trim().toUpperCase());
                orders = orders.stream()
                        .filter(order -> order.getBookingType() == bookingType)
                        .collect(Collectors.toList());
            }

            LocalDateTime startDateTime = null;
            LocalDateTime endDateTime = null;
            if (startDate != null && !startDate.trim().isEmpty()) {
                startDateTime = LocalDate.parse(startDate.trim()).atStartOfDay();
            }
            if (endDate != null && !endDate.trim().isEmpty()) {
                endDateTime = LocalDateTime.of(LocalDate.parse(endDate.trim()), LocalTime.MAX);
            }
            if (startDateTime != null) {
                LocalDateTime finalStartDateTime = startDateTime;
                orders = orders.stream()
                        .filter(order -> order.getBookingTime() != null && !order.getBookingTime().isBefore(finalStartDateTime))
                        .collect(Collectors.toList());
            }
            if (endDateTime != null) {
                LocalDateTime finalEndDateTime = endDateTime;
                orders = orders.stream()
                        .filter(order -> order.getBookingTime() != null && !order.getBookingTime().isAfter(finalEndDateTime))
                        .collect(Collectors.toList());
            }

            if (keyword != null && !keyword.trim().isEmpty()) {
                String normalizedKeyword = keyword.trim();
                Long reqOrderId = resolveOrderIdByRequestCode(normalizedKeyword);
                String lowered = normalizedKeyword.toLowerCase();
                orders = orders.stream().filter(order -> {
                    boolean orderNoMatch = order.getOrderNo() != null && order.getOrderNo().toLowerCase().contains(lowered);
                    boolean reqMatch = reqOrderId != null && Objects.equals(order.getId(), reqOrderId);
                    Optional<User> userOpt = userRepository.findByUsername(order.getUsername());
                    boolean phoneMatch = userOpt.map(user -> user.getPhone() != null && user.getPhone().contains(normalizedKeyword)).orElse(false);
                    return orderNoMatch || reqMatch || phoneMatch;
                }).collect(Collectors.toList());
            }

            orders.sort(Comparator.comparing(Order::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder())));

            int total = orders.size();
            int start = Math.min((page - 1) * pageSize, total);
            int end = Math.min(start + pageSize, total);
            List<Order> pageOrders = orders.subList(start, end);

            List<Map<String, Object>> data = new ArrayList<>();
            for (Order order : pageOrders) {
                Map<String, Object> item = new HashMap<>();
                item.put("id", order.getId());
                item.put("orderNo", order.getOrderNo());
                item.put("venueId", order.getVenueId());
                item.put("venueName", order.getVenueName());
                item.put("bookingTime", order.getBookingTime());
                item.put("endTime", order.getEndTime());
                // 添加前端需要的字段：bookingDate 和 startTime
                if (order.getBookingTime() != null) {
                    item.put("bookingDate", order.getBookingTime().toLocalDate().toString());
                    item.put("startTime", order.getBookingTime().toLocalTime().toString().substring(0, 5));
                }
                if (order.getEndTime() != null) {
                    // getEndTime() 返回 LocalTime，直接转为字符串
                    String endTimeString = order.getEndTime().toString();
                    item.put("endTimeStr", endTimeString.length() >= 5 ? endTimeString.substring(0, 5) : endTimeString);
                }
                item.put("totalPrice", order.getTotalPrice());
                item.put("status", order.getStatus());
                item.put("bookingType", order.getBookingType());
                item.put("typeLabel", order.getBookingType() == Order.BookingType.SHARED ? "拼场预约" : "普通预约");
                item.put("username", order.getUsername());

                Optional<User> userOpt = userRepository.findByUsername(order.getUsername());
                if (userOpt.isPresent() && userOpt.get().getPhone() != null) {
                    String phone = userOpt.get().getPhone();
                    item.put("userPhone", phone);
                    item.put("userPhoneTail", getPhoneTail(phone));
                } else {
                    item.put("userPhone", null);
                    item.put("userPhoneTail", null);
                }

                if (order.getBookingType() == Order.BookingType.SHARED) {
                    SharingOrder sharingOrder = sharingOrderRepository.findByOrderId(order.getId());
                    if (sharingOrder != null) {
                        item.put("teamName", sharingOrder.getTeamName());
                        item.put("contactInfo", sharingOrder.getContactInfo());
                        item.put("description", sharingOrder.getDescription());
                        item.put("currentParticipants", sharingOrder.getCurrentParticipants());
                        item.put("maxParticipants", sharingOrder.getMaxParticipants());
                        item.put("pricePerTeam", sharingOrder.getPricePerTeam());
                    }
                }
                data.add(item);
            }

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("data", data);
            response.put("total", total);
            response.put("page", page);
            response.put("pageSize", pageSize);
            response.put("totalPages", (int) Math.ceil((double) total / pageSize));
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException | DateTimeParseException e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "筛选参数错误: " + e.getMessage());
            return ResponseEntity.badRequest().body(errorResponse);
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "获取管理员订单列表失败: " + e.getMessage());
            return ResponseEntity.badRequest().body(errorResponse);
        }
    }

    private UserDetailsImpl getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof UserDetailsImpl)) {
            throw new IllegalArgumentException("未获取到有效登录信息");
        }
        return (UserDetailsImpl) authentication.getPrincipal();
    }

    private Set<Long> resolveAccessibleVenueIds(UserDetailsImpl currentUser) {
        boolean isSuperAdmin = currentUser.getAuthorities().stream()
                .anyMatch(authority -> "ROLE_SUPER_ADMIN".equals(authority.getAuthority()));
        logger.info("是否为超级管理员: {}", isSuperAdmin);
        logger.info("用户权限列表: {}", currentUser.getAuthorities());

        List<Venue> venues = isSuperAdmin
                ? venueRepository.findAll()
                : venueRepository.findByManagerId(currentUser.getId());
        logger.info("查询到的场馆数量: {}, 场馆信息: {}", venues.size(),
                venues.stream().map(v -> "ID=" + v.getId() + ",Name=" + v.getName() + ",ManagerId=" + v.getManagerId())
                        .collect(Collectors.joining("; ")));
        return venues.stream().map(Venue::getId).collect(Collectors.toSet());
    }

    private Long resolveOrderIdByRequestCode(String keyword) {
        if (!keyword.startsWith("REQ_")) {
            return null;
        }
        String idPart = keyword.substring(4);
        if (idPart.isEmpty()) {
            return null;
        }
        try {
            Long requestId = Long.valueOf(idPart);
            return sharingRequestRepository.findById(requestId).map(SharingRequest::getOrderId).orElse(null);
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private String getPhoneTail(String phone) {
        if (phone == null || phone.isEmpty()) {
            return null;
        }
        if (phone.length() <= 4) {
            return phone;
        }
        return phone.substring(phone.length() - 4);
    }
}
