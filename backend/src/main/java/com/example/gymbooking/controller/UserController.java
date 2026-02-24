package com.example.gymbooking.controller;

import com.example.gymbooking.model.User;
import com.example.gymbooking.model.Order;
import com.example.gymbooking.model.SharingRequest;
import com.example.gymbooking.model.SharingOrder;
import com.example.gymbooking.model.Venue;
import com.example.gymbooking.model.TimeSlot;
import com.example.gymbooking.repository.UserRepository;
import com.example.gymbooking.repository.OrderRepository;
import com.example.gymbooking.repository.SharingRequestRepository;
import com.example.gymbooking.repository.SharingOrderRepository;
import com.example.gymbooking.repository.VenueRepository;
import com.example.gymbooking.repository.TimeSlotRepository;
import com.example.gymbooking.security.services.UserDetailsImpl;
import com.example.gymbooking.service.FileUploadService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.time.LocalTime;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.List;

@RestController
@RequestMapping("/api/users")
@CrossOrigin(origins = "*")
public class UserController {

    private static final Logger logger = LoggerFactory.getLogger(UserController.class);

    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private SharingRequestRepository sharingRequestRepository;

    @Autowired
    private SharingOrderRepository sharingOrderRepository;

    @Autowired
    private VenueRepository venueRepository;
    
    @Autowired
    private TimeSlotRepository timeSlotRepository;
    
    @Autowired
    private PasswordEncoder passwordEncoder;
    
    @Autowired
    private FileUploadService fileUploadService;
    
    /**
     * 获取当前用户信息
     */
    @GetMapping("/me")
    public ResponseEntity<Map<String, Object>> getCurrentUser() {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
            
            Optional<User> userOpt = userRepository.findByUsername(userDetails.getUsername());
            if (!userOpt.isPresent()) {
                return ResponseEntity.notFound().build();
            }
            
            User user = userOpt.get();
            Map<String, Object> response = new HashMap<>();
            response.put("id", user.getId());
            response.put("username", user.getUsername());
            response.put("nickname", user.getNickname());
            response.put("phone", user.getPhone());
            response.put("email", user.getEmail());
            response.put("roles", user.getRoles());
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "获取用户信息失败: " + e.getMessage());
            return ResponseEntity.badRequest().body(errorResponse);
        }
    }
    
    /**
     * 获取指定用户信息
     */
    @GetMapping("/{userId}")
    public ResponseEntity<Map<String, Object>> getUserInfo(@PathVariable Long userId) {
        try {
            Optional<User> userOpt = userRepository.findById(userId);
            if (!userOpt.isPresent()) {
                return ResponseEntity.notFound().build();
            }
            
            User user = userOpt.get();
            Map<String, Object> response = new HashMap<>();
            response.put("id", user.getId());
            response.put("username", user.getUsername());
            response.put("nickname", user.getNickname());
            response.put("phone", user.getPhone());
            response.put("email", user.getEmail());
            // 不返回敏感信息如密码和角色
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "获取用户信息失败: " + e.getMessage());
            return ResponseEntity.badRequest().body(errorResponse);
        }
    }
    
    /**
     * 更新用户信息
     */
    @PutMapping("/me")
    public ResponseEntity<Map<String, Object>> updateUserInfo(@RequestBody Map<String, Object> updateData) {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
            
            Optional<User> userOpt = userRepository.findByUsername(userDetails.getUsername());
            if (!userOpt.isPresent()) {
                return ResponseEntity.notFound().build();
            }
            
            User user = userOpt.get();
            
            // 更新允许修改的字段
            if (updateData.containsKey("nickname")) {
                user.setNickname(updateData.get("nickname").toString());
            }
            if (updateData.containsKey("phone")) {
                user.setPhone(updateData.get("phone").toString());
            }
            if (updateData.containsKey("email")) {
                String email = updateData.get("email").toString();
                if (email != null && !email.trim().isEmpty()) {
                    // 检查邮箱是否已被其他用户使用
                    Optional<User> existingUser = userRepository.findByEmail(email);
                    if (existingUser.isPresent() && !existingUser.get().getId().equals(user.getId())) {
                        Map<String, Object> errorResponse = new HashMap<>();
                        errorResponse.put("success", false);
                        errorResponse.put("message", "邮箱已被使用");
                        return ResponseEntity.badRequest().body(errorResponse);
                    }
                    user.setEmail(email);
                } else {
                    user.setEmail(null);
                }
            }
            
            User savedUser = userRepository.save(user);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "用户信息更新成功");
            response.put("data", Map.of(
                "id", savedUser.getId(),
                "username", savedUser.getUsername(),
                "nickname", savedUser.getNickname(),
                "phone", savedUser.getPhone(),
                "email", savedUser.getEmail()
            ));
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "更新用户信息失败: " + e.getMessage());
            return ResponseEntity.badRequest().body(errorResponse);
        }
    }
    
    /**
     * 修改密码
     */
    @PutMapping("/me/password")
    public ResponseEntity<Map<String, Object>> changePassword(@RequestBody Map<String, String> passwordData) {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
            
            Optional<User> userOpt = userRepository.findByUsername(userDetails.getUsername());
            if (!userOpt.isPresent()) {
                return ResponseEntity.notFound().build();
            }
            
            User user = userOpt.get();
            String oldPassword = passwordData.get("oldPassword");
            String newPassword = passwordData.get("newPassword");
            
            // 验证旧密码
            if (!passwordEncoder.matches(oldPassword, user.getPassword())) {
                Map<String, Object> errorResponse = new HashMap<>();
                errorResponse.put("success", false);
                errorResponse.put("message", "旧密码不正确");
                return ResponseEntity.badRequest().body(errorResponse);
            }
            
            // 设置新密码
            user.setPassword(passwordEncoder.encode(newPassword));
            userRepository.save(user);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "密码修改成功");
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "修改密码失败: " + e.getMessage());
            return ResponseEntity.badRequest().body(errorResponse);
        }
    }
    
    /**
     * 获取当前用户的预约记录
     */
    @GetMapping("/me/bookings")
    public ResponseEntity<Map<String, Object>> getMyBookings(
            @RequestParam(name = "page", defaultValue = "1") int page,
            @RequestParam(name = "pageSize", defaultValue = "10") int pageSize,
            @RequestParam(name = "status", required = false) String status) {

        try {
            // 获取当前认证信息
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

            // 检查认证是否有效
            if (authentication == null || !authentication.isAuthenticated() ||
                "anonymousUser".equals(authentication.getPrincipal())) {
                logger.error("用户未认证或认证信息无效");
                Map<String, Object> errorResponse = new HashMap<>();
                errorResponse.put("success", false);
                errorResponse.put("message", "用户未认证，请先登录");
                return ResponseEntity.status(401).body(errorResponse);
            }

            // 安全地获取用户详情
            UserDetailsImpl userDetails;
            try {
                userDetails = (UserDetailsImpl) authentication.getPrincipal();
            } catch (ClassCastException e) {
                logger.error("无法转换认证主体为UserDetailsImpl: {}", e.getMessage());
                Map<String, Object> errorResponse = new HashMap<>();
                errorResponse.put("success", false);
                errorResponse.put("message", "认证信息格式错误");
                return ResponseEntity.status(401).body(errorResponse);
            }

            String currentUsername = userDetails.getUsername();
            logger.info("获取用户预约记录，用户名: {}", currentUsername);

            List<Order> orders = orderRepository.findByUsername(currentUsername);
            logger.info("找到 {} 个发起的订单，用户名: {}", orders.size(), currentUsername);

            // 同时获取用户作为申请者的拼场申请
            logger.info("=== 开始查询用户拼场申请 ===");
            logger.info("查询用户名: {}", currentUsername);

            List<SharingRequest> sharingRequests = sharingRequestRepository.findByApplicantUsername(currentUsername);
            logger.info("找到 {} 个拼场申请，用户名: {}", sharingRequests.size(), currentUsername);

            // 详细打印每个拼场申请的信息
            for (SharingRequest request : sharingRequests) {
                logger.info("拼场申请详情 - ID: {}, 申请者: {}, 订单ID: {}, 拼场订单ID: {}, 状态: {}, 支付金额: {}, 创建时间: {}",
                           request.getId(), request.getApplicantUsername(), request.getOrderId(),
                           request.getSharingOrderId(), request.getStatus(), request.getPaymentAmount(), request.getCreatedAt());
            }

            // 将拼场申请转换为订单格式，添加到结果中
            for (SharingRequest request : sharingRequests) {
                logger.info("=== 处理拼场申请 ===");
                logger.info("申请ID: {}, 申请者: {}, orderId: {}, sharingOrderId: {}, 状态: {}, 支付金额: {}",
                           request.getId(), request.getApplicantUsername(), request.getOrderId(),
                           request.getSharingOrderId(), request.getStatus(), request.getPaymentAmount());

                // 仅在“已同意后需要支付/已支付/已完成”时才把拼场申请混入“我的预约”列表
                // 待处理/拒绝/取消/超时 等状态应在“我的申请”页面查看，不应出现在预约列表并触发支付/取消预约逻辑
                if (request.getStatus() == SharingRequest.RequestStatus.PENDING ||
                    request.getStatus() == SharingRequest.RequestStatus.REJECTED ||
                    request.getStatus() == SharingRequest.RequestStatus.CANCELLED ||
                    request.getStatus() == SharingRequest.RequestStatus.TIMEOUT_CANCELLED) {
                    logger.info("跳过拼场申请（不纳入预约列表）- 申请ID: {}, 状态: {}", request.getId(), request.getStatus());
                    continue;
                }

                Order originalOrder = null;

                // 优先从orderId获取，如果没有则从sharingOrderId获取
                if (request.getOrderId() != null) {
                    originalOrder = orderRepository.findById(request.getOrderId()).orElse(null);
                    if (originalOrder != null) {
                        logger.info("✅ 从orderId获取原始订单成功: ID={}, 场馆={}, 时间={}, 价格={}",
                                   originalOrder.getId(), originalOrder.getVenueName(),
                                   originalOrder.getBookingTime(), originalOrder.getTotalPrice());
                    } else {
                        logger.error("❌ 从orderId获取原始订单失败: {}", request.getOrderId());
                    }
                } else if (request.getSharingOrderId() != null) {
                    // 如果没有orderId，尝试从SharingOrder获取对应的Order
                    originalOrder = findOrderBySharingOrderId(request.getSharingOrderId());
                    if (originalOrder != null) {
                        logger.info("✅ 从sharingOrderId获取原始订单成功: ID={}, 场馆={}, 时间={}, 价格={}",
                                   originalOrder.getId(), originalOrder.getVenueName(),
                                   originalOrder.getBookingTime(), originalOrder.getTotalPrice());
                    } else {
                        logger.error("❌ 从sharingOrderId获取原始订单失败: {}", request.getSharingOrderId());
                    }
                } else {
                    logger.error("❌ 申请ID {} 既没有orderId也没有sharingOrderId", request.getId());
                }

                if (originalOrder != null) {
                    // 创建一个虚拟订单对象，表示申请者的"订单"
                    Order applicantOrder = createVirtualOrderFromRequest(request, originalOrder);
                    orders.add(applicantOrder);
                    logger.info("✅ 添加申请者虚拟订单 - 申请ID: {}, 虚拟订单ID: {}, 状态: {}, 支付状态: {}",
                               request.getId(), applicantOrder.getId(), request.getStatus(), request.getIsPaid());
                } else {
                    logger.error("❌ 无法找到申请ID {} 对应的原始订单，orderId: {}, sharingOrderId: {}",
                               request.getId(), request.getOrderId(), request.getSharingOrderId());
                }
                logger.info("=== 拼场申请处理完成 ===");
            }

            logger.info("总共返回 {} 个订单（包括发起的订单和申请的拼场）", orders.size());

            // 根据状态过滤
            if (status != null && !status.trim().isEmpty()) {
                Order.OrderStatus orderStatus = Order.OrderStatus.valueOf(status.toUpperCase());
                orders = orders.stream()
                        .filter(order -> order.getStatus() == orderStatus)
                        .collect(java.util.stream.Collectors.toList());
            }

            // 按创建时间倒序排序，确保最新的订单（包括虚拟订单）在前面
            orders.sort((o1, o2) -> {
                if (o1.getCreatedAt() == null && o2.getCreatedAt() == null) return 0;
                if (o1.getCreatedAt() == null) return 1;
                if (o2.getCreatedAt() == null) return -1;
                return o2.getCreatedAt().compareTo(o1.getCreatedAt()); // 倒序
            });

            logger.info("排序后的订单列表，前3个订单的创建时间:");
            for (int i = 0; i < Math.min(3, orders.size()); i++) {
                Order order = orders.get(i);
                logger.info("  订单{}: ID={}, 订单号={}, 创建时间={}",
                           i+1, order.getId(), order.getOrderNo(), order.getCreatedAt());
            }
            
            // 转换为前端需要的格式
            List<Map<String, Object>> bookingList = orders.stream().map(order -> {
                Map<String, Object> booking = new HashMap<>();
                booking.put("id", order.getId());
                booking.put("venueName", order.getVenueName());
                booking.put("venueId", order.getVenueId());
                
                // 从场馆信息获取位置
                String venueLocation = "位置未知";
                if (order.getVenueId() != null) {
                    try {
                        Optional<Venue> venue = venueRepository.findById(order.getVenueId());
                        if (venue.isPresent()) {
                            venueLocation = venue.get().getLocation();
                            logger.info("✅ 获取场馆地址成功: 订单ID={}, 场馆ID={}, 地址={}",
                                       order.getId(), order.getVenueId(), venueLocation);
                        } else {
                            logger.warn("⚠️ 场馆不存在: 订单ID={}, 场馆ID={}", order.getId(), order.getVenueId());
                        }
                    } catch (Exception e) {
                        logger.error("❌ 获取场馆地址失败: 订单ID={}, 场馆ID={}, 错误: {}",
                                    order.getId(), order.getVenueId(), e.getMessage());
                    }
                } else {
                    logger.warn("⚠️ 订单场馆ID为空: 订单ID={}", order.getId());
                }
                booking.put("venueLocation", venueLocation);
                
                // 格式化时间
                if (order.getBookingTime() != null) {
                    booking.put("bookingDate", order.getBookingTime().toLocalDate().toString());

                    // 对于已取消的订单，优先使用保存的原始时间信息
                    if (order.getStatus() == Order.OrderStatus.CANCELLED &&
                        order.getOriginalStartTime() != null && order.getOriginalEndTime() != null) {

                        booking.put("startTime", order.getOriginalStartTime().toString());
                        booking.put("endTime", order.getOriginalEndTime().toString());

                        // 🔥 修复：计算实际的时间段数量，而不是硬编码为1
                        // 每个时间段是1小时，所以时间段数量 = (结束时间 - 开始时间) / 60分钟
                        long minutesDiff = java.time.temporal.ChronoUnit.MINUTES.between(
                            order.getOriginalStartTime(),
                            order.getOriginalEndTime()
                        );
                        int calculatedTimeSlotCount = (int) (minutesDiff / 60);
                        if (calculatedTimeSlotCount <= 0) {
                            calculatedTimeSlotCount = 1; // 最少1个时段
                        }
                        booking.put("timeSlotCount", calculatedTimeSlotCount);

                        logger.info("🔴 已取消订单{}的时间信息: startTime={}, endTime={}, 时间段数: {}",
                                   order.getId(), order.getOriginalStartTime(), order.getOriginalEndTime(), calculatedTimeSlotCount);

                    } else {
                        // 检查是否为虚拟订单（ID为负数）
                        if (order.getId() < 0) {
                            // 虚拟订单：直接使用订单对象中的时间信息
                            logger.info("✅ 处理虚拟订单时间信息: ID={}, bookingTime={}, endTime={}",
                                       order.getId(), order.getBookingTime(), order.getEndTime());

                            LocalTime startTime = order.getBookingTime().toLocalTime();
                            LocalTime endTime;

                            if (order.getEndDateTime() != null) {
                                endTime = order.getEndDateTime().toLocalTime();
                            } else {
                                // 如果没有结束时间，默认+2小时
                                endTime = startTime.plusHours(2);
                            }

                            booking.put("startTime", startTime.toString());
                            booking.put("endTime", endTime.toString());
                            booking.put("timeSlotCount", 1);

                            logger.info("✅ 虚拟订单时间设置完成: startTime={}, endTime={}", startTime, endTime);
                        } else {
                            // 真实订单：获取该订单的所有时间段，计算完整的时间范围
                            try {
                                List<TimeSlot> orderTimeSlots = timeSlotRepository.findByOrderId(order.getId());

                                if (!orderTimeSlots.isEmpty()) {
                                    // 找到最早的开始时间和最晚的结束时间
                                    LocalTime earliestStart = orderTimeSlots.stream()
                                        .map(TimeSlot::getStartTime)
                                        .min(LocalTime::compareTo)
                                        .orElse(order.getBookingTime().toLocalTime());

                                    LocalTime latestEnd = orderTimeSlots.stream()
                                        .map(TimeSlot::getEndTime)
                                        .max(LocalTime::compareTo)
                                        .orElse(order.getBookingTime().toLocalTime().plusHours(1));

                                    booking.put("startTime", earliestStart.toString());
                                    booking.put("endTime", latestEnd.toString());

                                    // 添加时间段数量信息
                                    booking.put("timeSlotCount", orderTimeSlots.size());
                                } else {
                                    // 如果没有找到时间段，使用订单的预约时间
                                    LocalTime startTime = order.getBookingTime().toLocalTime();
                                    booking.put("startTime", startTime.toString());
                                    booking.put("endTime", startTime.plusHours(1).toString());
                                    booking.put("timeSlotCount", 1);
                                }
                            } catch (Exception e) {
                                // 如果查询失败，使用默认值
                                logger.error("查询订单时间段失败: {}", e.getMessage());
                                LocalTime startTime = order.getBookingTime().toLocalTime();
                                booking.put("startTime", startTime.toString());
                                booking.put("endTime", startTime.plusHours(1).toString());
                                booking.put("timeSlotCount", 1);
                            }
                        }
                    }
                }
                
                booking.put("totalPrice", order.getTotalPrice());
                booking.put("status", order.getStatus().name());
                booking.put("bookingType", order.getBookingType().name()); // 添加订单类型字段
                booking.put("createdAt", order.getCreatedAt() != null ? order.getCreatedAt().toString() : null);
                booking.put("createTime", order.getCreatedAt() != null ? order.getCreatedAt().toString() : null);

                booking.put("orderNo", order.getOrderNo());

                // 为虚拟订单添加paymentAmount字段（前端需要）
                if (order.getId() < 0) {
                    booking.put("paymentAmount", order.getTotalPrice());
                    logger.info("✅ 为虚拟订单添加paymentAmount字段: ID={}, paymentAmount={}",
                               order.getId(), order.getTotalPrice());
                }
                
                return booking;
            }).collect(java.util.stream.Collectors.toList());
            
            // 手动分页
            int start = (page - 1) * pageSize;
            int end = Math.min(start + pageSize, bookingList.size());
            List<Map<String, Object>> pageContent = bookingList.subList(start, end);
            
            Map<String, Object> response = new HashMap<>();
            response.put("data", pageContent);
            response.put("total", bookingList.size());
            response.put("page", page);
            response.put("pageSize", pageSize);
            response.put("totalPages", (int) Math.ceil((double) bookingList.size() / pageSize));
            
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            // 详细记录异常信息
            logger.error("获取预约记录失败", e);
            logger.error("异常类型: {}", e.getClass().getName());
            logger.error("异常消息: {}", e.getMessage());
            if (e.getCause() != null) {
                logger.error("异常原因: {}", e.getCause().getMessage());
            }

            // 打印堆栈跟踪的前10行
            StackTraceElement[] stackTrace = e.getStackTrace();
            for (int i = 0; i < Math.min(10, stackTrace.length); i++) {
                logger.error("  at {}", stackTrace[i]);
            }

            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "获取预约记录失败: " + e.getMessage());
            errorResponse.put("error", e.getClass().getSimpleName());

            // 返回500错误而不是400，因为这是服务器内部错误
            return ResponseEntity.status(500).body(errorResponse);
        }
    }
    
    /**
     * 获取当前用户的订单记录
     */
    @GetMapping("/me/orders")
    public ResponseEntity<Map<String, Object>> getMyOrders(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int pageSize,
            @RequestParam(required = false) String status) {
        
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
            
            List<Order> orders = orderRepository.findByUsername(userDetails.getUsername());
            
            // 根据状态过滤
            if (status != null && !status.trim().isEmpty()) {
                Order.OrderStatus orderStatus = Order.OrderStatus.valueOf(status.toUpperCase());
                orders = orders.stream()
                        .filter(order -> order.getStatus() == orderStatus)
                        .collect(java.util.stream.Collectors.toList());
            }
            
            // 手动分页
            int start = (page - 1) * pageSize;
            int end = Math.min(start + pageSize, orders.size());
            List<Order> pageContent = orders.subList(start, end);
            
            Map<String, Object> response = new HashMap<>();
            response.put("data", pageContent);
            response.put("total", orders.size());
            response.put("page", page);
            response.put("pageSize", pageSize);
            response.put("totalPages", (int) Math.ceil((double) orders.size() / pageSize));
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "获取订单记录失败: " + e.getMessage());
            return ResponseEntity.badRequest().body(errorResponse);
        }
    }
    
    /**
     * 获取用户统计信息
     */
    @GetMapping("/me/stats")
    public ResponseEntity<Map<String, Object>> getUserStats() {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
            
            // 获取用户的订单统计
            List<Order> userOrders = orderRepository.findByUsername(userDetails.getUsername());
            
            // 统计各种状态的订单数量
            long totalBookings = userOrders.size();
            long pendingBookings = userOrders.stream()
                    .filter(order -> order.getStatus() == Order.OrderStatus.PENDING)
                    .count();
            long confirmedBookings = userOrders.stream()
                    .filter(order -> order.getStatus() == Order.OrderStatus.CONFIRMED)
                    .count();
            long completedBookings = userOrders.stream()
                    .filter(order -> order.getStatus() == Order.OrderStatus.COMPLETED)
                    .count();
            long cancelledBookings = userOrders.stream()
                    .filter(order -> order.getStatus() == Order.OrderStatus.CANCELLED)
                    .count();
            
            // 计算总消费金额
            double totalSpent = userOrders.stream()
                    .filter(order -> order.getStatus() == Order.OrderStatus.COMPLETED)
                    .mapToDouble(Order::getTotalPrice)
                    .sum();
            
            Map<String, Object> stats = new HashMap<>();
            stats.put("totalBookings", totalBookings);
            stats.put("pendingBookings", pendingBookings);
            stats.put("confirmedBookings", confirmedBookings);
            stats.put("completedBookings", completedBookings);
            stats.put("cancelledBookings", cancelledBookings);
            stats.put("totalSpent", totalSpent);
            stats.put("pendingSharings", 0); // 暂时设为0，后续可以添加拼场统计
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("data", stats);
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "获取用户统计信息失败: " + e.getMessage());
            return ResponseEntity.badRequest().body(errorResponse);
        }
    }
    
    /**
     * 上传用户头像
     */
    @PostMapping("/me/avatar")
    public ResponseEntity<Map<String, Object>> uploadAvatar(@RequestParam("file") MultipartFile file) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            // 获取当前用户
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth == null || !auth.isAuthenticated()) {
                response.put("success", false);
                response.put("message", "用户未登录");
                return ResponseEntity.status(401).body(response);
            }
            
            String username = auth.getName();
            Optional<User> userOpt = userRepository.findByUsername(username);
            
            if (!userOpt.isPresent()) {
                response.put("success", false);
                response.put("message", "用户不存在");
                return ResponseEntity.notFound().build();
            }
            
            User user = userOpt.get();
            
            // 删除旧头像
            if (user.getAvatar() != null && !user.getAvatar().isEmpty()) {
                fileUploadService.deleteFile(user.getAvatar());
            }
            
            // 上传新头像
            String avatarPath = fileUploadService.uploadAvatar(file);
            
            // 更新用户头像路径
            user.setAvatar(avatarPath);
            userRepository.save(user);
            
            response.put("success", true);
            response.put("message", "头像上传成功");
            response.put("avatarUrl", avatarPath);
            
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "头像上传失败: " + e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }

    /**
     * 获取虚拟订单详情（用于支付页面）
     */
    @GetMapping("/me/virtual-order/{requestId}")
    public ResponseEntity<Map<String, Object>> getVirtualOrderDetail(@PathVariable Long requestId) {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
            String currentUsername = userDetails.getUsername();

            logger.info("获取虚拟订单详情，申请ID: {}, 用户: {}", requestId, currentUsername);

            // 获取拼场申请
            Optional<SharingRequest> requestOpt = sharingRequestRepository.findById(requestId);
            if (!requestOpt.isPresent()) {
                Map<String, Object> errorResponse = new HashMap<>();
                errorResponse.put("success", false);
                errorResponse.put("message", "拼场申请不存在");
                return ResponseEntity.notFound().build();
            }

            SharingRequest request = requestOpt.get();

            // 验证是否是申请者本人
            if (!request.getApplicantUsername().equals(currentUsername)) {
                Map<String, Object> errorResponse = new HashMap<>();
                errorResponse.put("success", false);
                errorResponse.put("message", "无权访问此申请");
                return ResponseEntity.status(403).body(errorResponse);
            }

            // 获取原始订单
            logger.info("=== 虚拟订单详情API调试 ===");
            logger.info("申请ID: {}, 申请者: {}, orderId: {}, sharingOrderId: {}",
                       request.getId(), request.getApplicantUsername(), request.getOrderId(), request.getSharingOrderId());

            Order originalOrder = null;
            if (request.getOrderId() != null) {
                originalOrder = orderRepository.findById(request.getOrderId()).orElse(null);
                if (originalOrder != null) {
                    logger.info("✅ 从orderId获取原始订单成功: ID={}, 场馆={}, 时间={}, 价格={}",
                               originalOrder.getId(), originalOrder.getVenueName(),
                               originalOrder.getBookingTime(), originalOrder.getTotalPrice());
                } else {
                    logger.error("❌ 从orderId获取原始订单失败: {}", request.getOrderId());
                }
            } else if (request.getSharingOrderId() != null) {
                originalOrder = findOrderBySharingOrderId(request.getSharingOrderId());
                if (originalOrder != null) {
                    logger.info("✅ 从sharingOrderId获取原始订单成功: ID={}, 场馆={}, 时间={}, 价格={}",
                               originalOrder.getId(), originalOrder.getVenueName(),
                               originalOrder.getBookingTime(), originalOrder.getTotalPrice());
                } else {
                    logger.error("❌ 从sharingOrderId获取原始订单失败: {}", request.getSharingOrderId());
                }
            } else {
                logger.error("❌ 申请既没有orderId也没有sharingOrderId");
            }

            if (originalOrder == null) {
                logger.error("❌ 无法找到原始订单，返回404");
                Map<String, Object> errorResponse = new HashMap<>();
                errorResponse.put("success", false);
                errorResponse.put("message", "找不到对应的原始订单");
                return ResponseEntity.notFound().build();
            }

            // 创建虚拟订单
            Order virtualOrder = createVirtualOrderFromRequest(request, originalOrder);

            // 构建响应数据（与真实订单格式保持一致）
            Map<String, Object> response = new HashMap<>();
            response.put("id", virtualOrder.getId());
            response.put("orderNo", virtualOrder.getOrderNo());
            response.put("username", virtualOrder.getUsername());
            response.put("venueId", virtualOrder.getVenueId());
            response.put("venueName", virtualOrder.getVenueName());
            response.put("fieldId", virtualOrder.getFieldId());
            response.put("fieldName", virtualOrder.getFieldName());
            response.put("status", virtualOrder.getStatus().name());
            response.put("bookingType", virtualOrder.getBookingType().name());
            response.put("totalPrice", virtualOrder.getTotalPrice());
            response.put("bookingTime", virtualOrder.getBookingTime());
            response.put("endTime", virtualOrder.getEndTime());
            response.put("createdAt", virtualOrder.getCreatedAt());
            response.put("updatedAt", virtualOrder.getUpdatedAt());
            response.put("teamName", virtualOrder.getTeamName());
            response.put("contactInfo", virtualOrder.getContactInfo());

            logger.info("✅ 虚拟订单基本信息: ID={}, 场馆={}, 时间={}-{}, 金额={}",
                       virtualOrder.getId(), virtualOrder.getVenueName(),
                       virtualOrder.getBookingTime(), virtualOrder.getEndTime(), virtualOrder.getTotalPrice());

            // 添加拼场特有信息
            response.put("isVirtualOrder", true);
            response.put("originalRequestId", request.getId());
            response.put("applicantTeamName", request.getApplicantTeamName());
            response.put("applicantContact", request.getApplicantContact());
            response.put("requestStatus", request.getStatus().name());

            // 添加场馆地址信息
            if (virtualOrder.getVenueId() != null) {
                try {
                    Optional<Venue> venueOpt = venueRepository.findById(virtualOrder.getVenueId());
                    if (venueOpt.isPresent()) {
                        Venue venue = venueOpt.get();
                        response.put("venueLocation", venue.getLocation());
                        logger.info("✅ 虚拟订单添加场馆地址: {}", venue.getLocation());
                    } else {
                        response.put("venueLocation", "地址未知");
                        logger.warn("⚠️ 虚拟订单场馆地址未找到，场馆ID: {}", virtualOrder.getVenueId());
                    }
                } catch (Exception e) {
                    response.put("venueLocation", "地址获取失败");
                    logger.error("❌ 虚拟订单获取场馆地址失败: {}", e.getMessage());
                }
            } else {
                response.put("venueLocation", "场馆信息缺失");
            }

            // 设置支付金额：使用虚拟订单对象中已经计算好的金额，确保一致性
            Double paymentAmount = virtualOrder.getTotalPrice(); // 虚拟订单的totalPrice就是申请者需要支付的金额
            response.put("paymentAmount", paymentAmount);

            logger.info("=== 虚拟订单API响应调试 ===");
            logger.info("虚拟订单ID: {}, totalPrice: {}, paymentAmount: {}", virtualOrder.getId(), virtualOrder.getTotalPrice(), paymentAmount);
            logger.info("原始申请paymentAmount: {}", request.getPaymentAmount());
            logger.info("=== 虚拟订单API响应完成 ===");

            Map<String, Object> result = new HashMap<>();
            result.put("code", 200);
            result.put("message", "success");
            result.put("data", response);

            return ResponseEntity.ok(result);

        } catch (Exception e) {
            logger.error("获取虚拟订单详情失败: {}", e.getMessage(), e);
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "获取虚拟订单详情失败: " + e.getMessage());
            return ResponseEntity.status(500).body(errorResponse);
        }
    }

    /**
     * 从拼场申请创建虚拟订单对象，用于在前端显示
     */
    private Order createVirtualOrderFromRequest(SharingRequest request, Order originalOrder) {
        Order virtualOrder = new Order();

        logger.info("=== 创建虚拟订单 ===");
        logger.info("申请ID: {}, 申请者: {}, 原订单ID: {}",
                   request.getId(), request.getApplicantUsername(), originalOrder.getId());

        // 设置申请者信息
        virtualOrder.setId(-request.getId()); // 使用负数ID区分虚拟订单
        virtualOrder.setUsername(request.getApplicantUsername());
        virtualOrder.setOrderNo("REQ_" + request.getId()); // 特殊订单号标识

        // 设置申请者的队伍名称和联系方式
        virtualOrder.setTeamName(request.getApplicantTeamName());
        virtualOrder.setContactInfo(request.getApplicantContact());

        // ✅ 修复：完全从原订单复制场地信息
        virtualOrder.setVenueId(originalOrder.getVenueId());
        virtualOrder.setVenueName(originalOrder.getVenueName());
        virtualOrder.setFieldId(originalOrder.getFieldId());
        virtualOrder.setFieldName(originalOrder.getFieldName());

        logger.info("=== 虚拟订单场馆信息设置 ===");
        logger.info("原订单场馆ID: {}, 场馆名称: {}", originalOrder.getVenueId(), originalOrder.getVenueName());
        logger.info("虚拟订单场馆ID: {}, 场馆名称: {}", virtualOrder.getVenueId(), virtualOrder.getVenueName());

        // 获取场馆详细信息（包括地址）
        logger.info("=== 虚拟订单场馆信息设置调试 ===");
        logger.info("原订单场馆ID: {}, 场馆名称: {}, 场地ID: {}, 场地名称: {}",
                   originalOrder.getVenueId(), originalOrder.getVenueName(),
                   originalOrder.getFieldId(), originalOrder.getFieldName());

        if (originalOrder.getVenueId() != null) {
            try {
                Optional<Venue> venueOpt = venueRepository.findById(originalOrder.getVenueId());
                if (venueOpt.isPresent()) {
                    Venue venue = venueOpt.get();
                    logger.info("✅ 找到场馆信息: ID={}, 名称={}, 地址={}",
                               venue.getId(), venue.getName(), venue.getLocation());
                    // 注意：Order模型没有location字段，需要在API响应中添加
                } else {
                    logger.warn("⚠️ 找不到场馆信息，场馆ID: {}", originalOrder.getVenueId());
                }
            } catch (Exception e) {
                logger.error("❌ 获取场馆信息失败: {}", e.getMessage());
            }
        }
        logger.info("=== 虚拟订单场馆信息设置完成 ===");

        // 设置预约时间信息
        logger.info("=== 虚拟订单时间设置调试 ===");
        logger.info("原订单ID: {}, bookingTime: {}, endTime: {}",
                   originalOrder.getId(), originalOrder.getBookingTime(), originalOrder.getEndDateTime());

        // ✅ 修复：完全从原订单获取时间信息
        if (originalOrder.getBookingTime() != null) {
            virtualOrder.setBookingTime(originalOrder.getBookingTime());
            logger.info("✅ 设置虚拟订单开始时间: {}", originalOrder.getBookingTime());
        } else {
            logger.warn("⚠️ 原订单 {} 的 bookingTime 为空", originalOrder.getId());
        }

        if (originalOrder.getEndDateTime() != null) {
            virtualOrder.setEndTime(originalOrder.getEndDateTime());
            logger.info("✅ 设置虚拟订单结束时间: {}", originalOrder.getEndDateTime());
        } else {
            logger.warn("⚠️ 原订单 {} 的结束时间为空", originalOrder.getId());
            // 如果没有结束时间，尝试根据开始时间推算（假设2小时）
            if (originalOrder.getBookingTime() != null) {
                LocalDateTime calculatedEndTime = originalOrder.getBookingTime().plusHours(2);
                virtualOrder.setEndTime(calculatedEndTime);
                logger.info("✅ 计算虚拟订单结束时间: {} + 2小时 = {}",
                           originalOrder.getBookingTime(), calculatedEndTime);
            }
        }

        logger.info("✅ 虚拟订单最终时间: bookingTime={}, endTime={}",
                   virtualOrder.getBookingTime(), virtualOrder.getEndTime());
        logger.info("=== 虚拟订单时间设置完成 ===");

        // 设置拼场相关信息
        virtualOrder.setBookingType(Order.BookingType.SHARED);

        // ✅ 修复：确保使用申请中的paymentAmount，这是从SharingOrder.pricePerTeam设置的
        Double paymentAmount = request.getPaymentAmount();
        logger.info("=== 虚拟订单金额设置调试 ===");
        logger.info("申请ID: {}, 申请者: {}", request.getId(), request.getApplicantUsername());
        logger.info("申请中的paymentAmount: {}", paymentAmount);
        logger.info("原订单ID: {}, 原订单总价: {}", originalOrder.getId(), originalOrder.getTotalPrice());

        // 确保paymentAmount有值
        if (paymentAmount == null || paymentAmount <= 0) {
            // ✅ 修复：如果申请中没有设置paymentAmount，则使用原订单总价（原订单总价已经是每队价格）
            if (originalOrder.getTotalPrice() != null && originalOrder.getTotalPrice() > 0) {
                paymentAmount = originalOrder.getTotalPrice(); // 原订单总价就是每队价格
                logger.info("✅ 使用原订单总价作为paymentAmount: {}", paymentAmount);

                // 更新申请中的paymentAmount，确保一致性
                request.setPaymentAmount(paymentAmount);
                sharingRequestRepository.save(request);
                logger.info("✅ 更新申请中的paymentAmount: {}", paymentAmount);
            } else {
                paymentAmount = 100.0; // 默认金额，避免0元订单
                logger.warn("⚠️ 原订单总价为空或0，使用默认金额: {}", paymentAmount);

                // 更新申请中的paymentAmount，确保一致性
                request.setPaymentAmount(paymentAmount);
                sharingRequestRepository.save(request);
                logger.info("✅ 更新申请中的paymentAmount为默认值: {}", paymentAmount);
            }
        } else {
            logger.info("✅ 使用申请中已设置的paymentAmount: {}", paymentAmount);
        }

        // 设置虚拟订单的总价为申请者需要支付的金额
        virtualOrder.setTotalPrice(paymentAmount);

        // 重要：为了前端兼容性，需要在响应中添加paymentAmount字段
        // 因为Order模型没有paymentAmount字段，我们需要在API响应中手动添加
        logger.info("✅ 虚拟订单最终金额设置: totalPrice={}, paymentAmount={}", paymentAmount, paymentAmount);
        logger.info("=== 虚拟订单金额设置完成 ===");

        virtualOrder.setCurrentParticipants(1);
        virtualOrder.setMaxParticipants(2);
        virtualOrder.setAllowSharing(true);

        // 根据申请状态设置订单状态
        switch (request.getStatus()) {
            case PENDING:
                virtualOrder.setStatus(Order.OrderStatus.PENDING);
                break;
            case APPROVED_PENDING_PAYMENT:
                virtualOrder.setStatus(Order.OrderStatus.PENDING); // 待支付
                break;
            case PAID:
                virtualOrder.setStatus(Order.OrderStatus.SHARING_SUCCESS); // 已支付才是拼场成功
                break;
            case APPROVED:
                // APPROVED状态表示申请被批准但还未支付，应该是PENDING状态
                virtualOrder.setStatus(Order.OrderStatus.PENDING);
                break;
            case REJECTED:
            case CANCELLED:
            case TIMEOUT_CANCELLED:
                virtualOrder.setStatus(Order.OrderStatus.CANCELLED);
                break;
            default:
                virtualOrder.setStatus(Order.OrderStatus.PENDING);
        }

        // 设置创建时间
        virtualOrder.setCreatedAt(request.getCreatedAt());
        virtualOrder.setUpdatedAt(request.getUpdatedAt());

        return virtualOrder;
    }

    /**
     * 根据SharingOrderId查找对应的Order
     */
    private Order findOrderBySharingOrderId(Long sharingOrderId) {
        try {
            SharingOrder sharingOrder = sharingOrderRepository.findById(sharingOrderId).orElse(null);
            if (sharingOrder != null && sharingOrder.getOrderId() != null) {
                return orderRepository.findById(sharingOrder.getOrderId()).orElse(null);
            }
            return null;
        } catch (Exception e) {
            logger.error("根据SharingOrderId查找Order失败，sharingOrderId: {}, 错误: {}", sharingOrderId, e.getMessage());
            return null;
        }
    }
}
