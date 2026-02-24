package com.example.gymbooking.controller;

import com.example.gymbooking.model.Order;
import com.example.gymbooking.model.Order.BookingType;
import com.example.gymbooking.model.Venue;
import com.example.gymbooking.model.SharingRequest;
import com.example.gymbooking.model.SharingOrder;
import com.example.gymbooking.model.TimeSlot;

import com.example.gymbooking.repository.OrderRepository;
import com.example.gymbooking.repository.VenueRepository;
import com.example.gymbooking.repository.SharingRequestRepository;
import com.example.gymbooking.repository.SharingOrderRepository;
import com.example.gymbooking.repository.TimeSlotRepository;
import com.example.gymbooking.repository.UserRepository;
import com.example.gymbooking.service.TimeSlotService;
import com.example.gymbooking.security.services.UserDetailsImpl;

import org.springframework.beans.factory.annotation.Autowired;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;
import java.util.Arrays;

@RestController
@RequestMapping("/api/bookings")
@CrossOrigin(origins = "*")
public class BookingController {
    
    private static final Logger logger = LoggerFactory.getLogger(BookingController.class);
    
    @Autowired
    private OrderRepository orderRepository;
    
    @Autowired
    private VenueRepository venueRepository;
    
    @Autowired
    private SharingRequestRepository sharingRequestRepository;
    
    @Autowired
    private SharingOrderRepository sharingOrderRepository;
    
    @Autowired
    private TimeSlotService timeSlotService;
    
    @Autowired
    private TimeSlotRepository timeSlotRepository;
    
    @Autowired
    private UserRepository userRepository;
    
    /**
     * 创建预约
     */
    @PostMapping
    public ResponseEntity<Map<String, Object>> createBooking(@RequestBody Map<String, Object> bookingData) {
        try {
            // 获取当前用户
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            String username;
            if (authentication.getPrincipal() instanceof UserDetailsImpl) {
                UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
                username = userDetails.getUsername();
            } else {
                // 匿名用户或测试用户
                username = "test_user";
            }
            
            // 🔧 修复：解析请求数据，支持字段映射工具修复后的数据结构
            Long venueId = Long.valueOf(bookingData.get("venueId").toString());
            System.out.println("解析场馆ID: " + venueId);

            // 🔧 修复：兼容多种日期字段名称
            String date;
            if (bookingData.containsKey("bookingDate")) {
                date = bookingData.get("bookingDate").toString();
                System.out.println("使用bookingDate字段: " + date);
            } else if (bookingData.containsKey("date")) {
                date = bookingData.get("date").toString();
                System.out.println("使用date字段: " + date);
            } else {
                throw new RuntimeException("缺少日期参数，请提供date或bookingDate字段");
            }

            String startTime = bookingData.get("startTime").toString();
            String endTime = bookingData.get("endTime").toString();
            System.out.println("解析时间: " + startTime + " - " + endTime);

            // 🔧 修复：获取场馆名称
            String venueName = "";
            if (bookingData.containsKey("venueName")) {
                venueName = bookingData.get("venueName").toString();
                System.out.println("使用前端传递的场馆名称: " + venueName);
            }

            // 🔧 修复：获取前端计算的价格，支持多种价格字段名称
            Double frontendPrice = null;
            System.out.println("🔍 开始解析前端价格数据...");
            System.out.println("前端传递的所有数据: " + bookingData);

            if (bookingData.containsKey("totalPrice")) {
                try {
                    frontendPrice = Double.valueOf(bookingData.get("totalPrice").toString());
                    System.out.println("✅ 成功解析totalPrice: " + frontendPrice);
                } catch (NumberFormatException e) {
                    System.out.println("❌ totalPrice格式错误: " + e.getMessage());
                }
            } else if (bookingData.containsKey("price")) {
                try {
                    frontendPrice = Double.valueOf(bookingData.get("price").toString());
                    System.out.println("✅ 成功解析price: " + frontendPrice);
                } catch (NumberFormatException e) {
                    System.out.println("❌ price格式错误: " + e.getMessage());
                }
            }

            if (frontendPrice == null || frontendPrice <= 0) {
                System.out.println("⚠️ 前端价格无效 (null或<=0)，将使用场馆默认价格");
                System.out.println("前端价格值: " + frontendPrice);
            } else {
                System.out.println("💰 最终使用的前端价格: " + frontendPrice);
            }

            // 记录日志，帮助调试
            System.out.println("预约参数 - 场馆ID: " + venueId + ", 日期: " + date + ", 时间: " + startTime + "-" + endTime + ", 前端价格: " + frontendPrice);
            
            // 🔧 修复：获取前端传递的球场ID和名称
            Long fieldId = null;
            String fieldName = null;

            if (bookingData.containsKey("fieldId")) {
                try {
                    fieldId = Long.valueOf(bookingData.get("fieldId").toString());
                    System.out.println("前端传递的球场ID: " + fieldId);
                } catch (NumberFormatException e) {
                    System.out.println("前端球场ID格式错误，将使用默认值");
                }
            }

            if (bookingData.containsKey("fieldName")) {
                fieldName = bookingData.get("fieldName").toString();
                System.out.println("前端传递的球场名称: " + fieldName);
            }

            // 拼场相关参数
            String bookingTypeStr = bookingData.getOrDefault("bookingType", "EXCLUSIVE").toString();
            Order.BookingType bookingType = Order.BookingType.valueOf(bookingTypeStr.toUpperCase());
            String teamName = bookingData.getOrDefault("teamName", "").toString();
            String contactInfo = bookingData.getOrDefault("contactInfo", "").toString();
            // 拼场服务固定为两支球队，不需要人数限制
            Integer maxParticipants = 2; // 固定为2支球队
            String description = bookingData.getOrDefault("description", "").toString();
            
            // 验证场馆是否存在
            Optional<Venue> venueOpt = venueRepository.findById(venueId);
            if (!venueOpt.isPresent()) {
                Map<String, Object> errorResponse = new HashMap<>();
                errorResponse.put("success", false);
                errorResponse.put("message", "场馆不存在");
                return ResponseEntity.badRequest().body(errorResponse);
            }
            
            Venue venue = venueOpt.get();

            // 🔧 修复：使用前端传递的场馆名称，如果没有则使用数据库中的名称
            if (venueName.isEmpty()) {
                venueName = venue.getName();
                System.out.println("使用数据库中的场馆名称: " + venueName);
            }

            // 构建预约时间
            // 检查startTime格式并正确处理
            String formattedStartTime = startTime;
            String[] timeParts = startTime.split(":");
            if (timeParts.length == 2) {
                // 格式是HH:mm，添加秒数
                formattedStartTime = startTime + ":00";
            } else if (timeParts.length == 3) {
                // 格式已经是HH:mm:ss，直接使用
                formattedStartTime = startTime;
            }
            
            String bookingTimeStr = date + " " + formattedStartTime;
            System.out.println("时间解析 - 原始startTime: " + startTime + ", 格式化后: " + formattedStartTime + ", 完整时间字符串: " + bookingTimeStr);
            
            LocalDateTime bookingTime = LocalDateTime.parse(bookingTimeStr, DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
            
            // 处理结束时间
            String formattedEndTime = endTime;
            String[] endTimeParts = endTime.split(":");
            if (endTimeParts.length == 2) {
                // 格式是HH:mm，添加秒数
                formattedEndTime = endTime + ":00";
            } else if (endTimeParts.length == 3) {
                // 格式已经是HH:mm:ss，直接使用
                formattedEndTime = endTime;
            }
            
            String endTimeStr = date + " " + formattedEndTime;
            LocalDateTime endDateTime = LocalDateTime.parse(endTimeStr, DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
            
            // 确定使用的价格：优先使用前端计算的价格，否则使用场馆默认价格
            Double finalPrice = frontendPrice != null ? frontendPrice : venue.getPrice();
            System.out.println("最终使用的价格: " + finalPrice + " (前端价格: " + frontendPrice + ", 场馆价格: " + venue.getPrice() + ")");

            // 🔧 修复：创建订单，使用正确的场馆名称和价格
            Order order;
            if (bookingType == Order.BookingType.SHARED) {
                // 🔧 重要注释：对于拼场订单，Order表的total_price字段存储每队费用（总费用的一半）
                // 这是因为每个Order记录代表一个队伍的订单，所以存储该队伍需要支付的金额
                order = Order.createSharedOrder(
                    username, venueId, venueName, bookingTime, endDateTime, finalPrice,
                    teamName, contactInfo, maxParticipants, description
                );
                System.out.println("创建拼场订单 - Order表total_price存储每队费用: " + finalPrice);
            } else {
                // 对于包场订单，Order表的total_price字段存储完整的总费用
                order = Order.createOrder(
                    username, venueId, venueName, bookingTime, endDateTime, finalPrice
                );
                order.setBookingType(Order.BookingType.EXCLUSIVE);
                System.out.println("创建包场订单 - Order表total_price存储总费用: " + finalPrice);
            }
            
            // 设置为待支付状态，用户需要先支付
            order.setStatus(Order.OrderStatus.PENDING);
            
            // 🔧 修复：设置场地相关字段，优先使用前端传递的值
            if (fieldId != null) {
                order.setFieldId(fieldId);
                System.out.println("使用前端传递的球场ID: " + fieldId);
            } else if (order.getFieldId() == null) {
                order.setFieldId(venueId); // 使用场馆ID作为默认球场ID
                System.out.println("使用场馆ID作为默认球场ID: " + venueId);
            }

            // 🔧 修复：优先使用前端传递的球场名称，确保不为空
            if (fieldName != null && !fieldName.trim().isEmpty()) {
                order.setFieldName(fieldName.trim());
                System.out.println("使用前端传递的球场名称: " + fieldName.trim());
            } else if (venueName != null && !venueName.trim().isEmpty()) {
                order.setFieldName(venueName.trim()); // 使用场馆名称
                System.out.println("使用场馆名称作为球场名称: " + venueName.trim());
            } else {
                order.setFieldName(venue.getName() + "主场地"); // 最后的默认值
                System.out.println("使用默认球场名称: " + venue.getName() + "主场地");
            }
            
            // 先保存一次订单以获取ID
            Order savedOrder = orderRepository.save(order);
            System.out.println("📊 Order保存成功:");
            System.out.println("  - 订单ID: " + savedOrder.getId());
            System.out.println("  - 订单类型: " + savedOrder.getBookingType());
            System.out.println("  - 总价格(total_price): " + savedOrder.getTotalPrice());
            System.out.println("  - 球场ID(field_id): " + savedOrder.getFieldId());
            System.out.println("  - 球场名称(field_name): " + savedOrder.getFieldName());

            // 如果是拼场订单，同时创建SharingOrder记录
            SharingOrder sharingOrder = null;
            if (bookingType == Order.BookingType.SHARED) {
                try {
                    LocalDate bookingDate = LocalDate.parse(date);
                    LocalTime startTimeLocal = LocalTime.parse(startTime);
                    LocalTime endTimeLocal = LocalTime.parse(endTime);
                    
                    // 🔧 重要注释：SharingOrder表的价格字段说明
                    // price_per_team: 每队费用（单队需要支付的金额）
                    // total_price: 总费用（两队费用之和，即场地的完整费用）
                    Double pricePerTeam = finalPrice; // 前端发送的是每队价格
                    Double totalPrice = finalPrice * 2; // 总价格 = 每队价格 × 2

                    System.out.println("SharingOrder价格设置 - price_per_team(每队费用): " + pricePerTeam + ", total_price(总费用): " + totalPrice);
                    
                    // 🔧 修复：使用正确的场馆ID和名称
                    Long actualVenueId = fieldId != null ? fieldId : venueId;
                    String actualVenueName = fieldName != null ? fieldName : venue.getName();

                    sharingOrder = new SharingOrder(
                        actualVenueId, actualVenueName, bookingDate, startTimeLocal, endTimeLocal,
                        teamName, contactInfo, maxParticipants, pricePerTeam, totalPrice,
                        username
                    );

                    System.out.println("📊 SharingOrder创建详情:");
                    System.out.println("  - 场馆ID: " + actualVenueId);
                    System.out.println("  - 场馆名称: " + actualVenueName);
                    System.out.println("  - 预约日期: " + bookingDate);
                    System.out.println("  - 开始时间: " + startTimeLocal);
                    System.out.println("  - 结束时间: " + endTimeLocal);
                    System.out.println("  - 每队价格(price_per_team): " + pricePerTeam);
                    System.out.println("  - 总价格(total_price): " + totalPrice);
                    
                    if (description != null && !description.trim().isEmpty()) {
                        sharingOrder.setDescription(description);
                    }
                    
                    sharingOrder = sharingOrderRepository.save(sharingOrder);
                    System.out.println("成功创建拼场订单记录: " + sharingOrder.getId());
                } catch (Exception e) {
                    System.err.println("创建拼场订单记录失败: " + e.getMessage());
                    e.printStackTrace();
                    // 如果拼场订单创建失败，删除已创建的普通订单
                    try {
                        orderRepository.delete(savedOrder);
                        System.out.println("已回滚普通订单: " + savedOrder.getId());
                    } catch (Exception rollbackException) {
                        System.err.println("订单回滚失败: " + rollbackException.getMessage());
                    }
                    throw new RuntimeException("拼场订单创建失败: " + e.getMessage());
                }
            }

            // 更新时间段状态为已预约
            List<TimeSlot> bookedSlots = null;
            String timeSlotMessage = "";
            try {
                LocalDate bookingDate = LocalDate.parse(date);
                LocalTime startTimeLocal = LocalTime.parse(startTime);
                LocalTime endTimeLocal = LocalTime.parse(endTime);
                
                // 检查是否有传入slotIds数组
                if (bookingData.containsKey("slotIds") && bookingData.get("slotIds") instanceof List) {
                    // 处理多个时间段的情况
                    List<?> rawSlotIds = (List<?>) bookingData.get("slotIds");
                    List<Long> slotIds = new ArrayList<>();
                    
                    // 将List中的元素转换为Long类型
                    for (Object item : rawSlotIds) {
                        if (item instanceof Integer) {
                            slotIds.add(((Integer) item).longValue());
                        } else if (item instanceof Long) {
                            slotIds.add((Long) item);
                        } else if (item instanceof String) {
                            try {
                                slotIds.add(Long.parseLong((String) item));
                            } catch (NumberFormatException e) {
                                logger.warn("无法将字符串转换为Long: {}", item);
                            }
                        } else if (item instanceof Number) {
                            slotIds.add(((Number) item).longValue());
                        }
                    }
                    
                    logger.info("收到多个时间段ID: {}", slotIds);
                    
                    bookedSlots = new ArrayList<>();
                    for (Long slotId : slotIds) {
                        // 查找时间段
                        Optional<TimeSlot> timeSlotOpt = timeSlotRepository.findById(slotId);
                        if (timeSlotOpt.isPresent()) {
                            TimeSlot timeSlot = timeSlotOpt.get();
                            // 更新时间段状态
                            timeSlot.setStatus(TimeSlot.SlotStatus.RESERVED);
                            timeSlot.setOrderId(savedOrder.getId());
                            timeSlotRepository.save(timeSlot);
                            bookedSlots.add(timeSlot);
                        } else {
                            logger.warn("未找到时间段ID: {}", slotId);
                        }
                    }
                    
                    logger.info("成功更新了 {} 个时间段的状态", bookedSlots.size());
                } else {
                    // 处理单个时间段的情况（原有逻辑）
                    bookedSlots = timeSlotService.bookTimeSlots(
                        venueId, bookingDate, startTimeLocal, endTimeLocal, savedOrder.getId()
                    );
                }

                // 使用前端传递的正确价格，而不是重新计算
                // 只有在前端没有传递价格时才使用后端计算的价格
                if (frontendPrice == null || frontendPrice == 0) {
                    Double calculatedPrice = timeSlotService.calculateTotalPrice(bookedSlots);
                    savedOrder.setTotalPrice(calculatedPrice);
                    System.out.println("使用后端计算的价格: " + calculatedPrice);
                } else {
                    // 保持使用前端传递的价格
                    System.out.println("保持使用前端传递的价格: " + finalPrice);
                }
                orderRepository.save(savedOrder);

                System.out.println("成功更新了 " + bookedSlots.size() + " 个时间段的状态");
                timeSlotMessage = "时间段预订成功";
            } catch (Exception e) {
                System.err.println("更新时间段状态失败: " + e.getMessage());
                e.printStackTrace();
                
                // 如果时间段更新失败，删除已创建的订单和拼场订单
                try {
                    orderRepository.delete(savedOrder);
                    System.out.println("已回滚订单: " + savedOrder.getId());
                    
                    // 如果存在拼场订单，也要删除
                    if (sharingOrder != null) {
                        sharingOrderRepository.delete(sharingOrder);
                        System.out.println("已回滚拼场订单: " + sharingOrder.getId());
                    }
                } catch (Exception rollbackException) {
                    System.err.println("订单回滚失败: " + rollbackException.getMessage());
                }
                
                // 抛出异常，让外层catch处理
                throw new RuntimeException("时间段预订失败: " + e.getMessage());
            }
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "预约成功");
            response.put("timeSlotMessage", timeSlotMessage);
            response.put("bookedSlotsCount", bookedSlots != null ? bookedSlots.size() : 0);
            response.put("id", savedOrder.getId()); // 添加订单ID
            response.put("orderId", savedOrder.getId()); // 兼容性
            response.put("data", savedOrder);
            
            // 如果是拼场订单，也返回拼场订单信息
            if (sharingOrder != null) {
                response.put("sharingOrderId", sharingOrder.getId());
                response.put("sharingOrder", sharingOrder);
            }
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "预约失败: " + e.getMessage());
            return ResponseEntity.badRequest().body(errorResponse);
        }
    }
    
    /**
     * 获取预约列表
     */
    @GetMapping
    public ResponseEntity<Map<String, Object>> getBookingList(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int pageSize,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate,
            @RequestParam(required = false) Long userId) {
        
        try {
            List<Order> orders;
            
            // 检查是否有认证用户
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            if (authentication != null && authentication.isAuthenticated() && 
                !"anonymousUser".equals(authentication.getPrincipal())) {
                // 有认证用户，获取用户特定的预约
                UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
                String username = userDetails.getUsername();
                
                if (userId == null) {
                    orders = orderRepository.findByUsername(username);
                } else {
                    // 管理员可以查看所有用户的预约（这里简化处理）
                    orders = orderRepository.findAll();
                }
            } else {
                // 没有认证用户，返回所有预约（公开访问）
                orders = orderRepository.findAll();
            }
            
            // 根据状态过滤
            if (status != null && !status.trim().isEmpty()) {
                Order.OrderStatus orderStatus = Order.OrderStatus.valueOf(status.toUpperCase());
                orders = orders.stream()
                        .filter(order -> order.getStatus() == orderStatus)
                        .collect(Collectors.toList());
            }
            
            // 根据日期范围过滤
            if (startDate != null && !startDate.trim().isEmpty()) {
                LocalDateTime start = LocalDateTime.parse(startDate + " 00:00:00", DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
                orders = orders.stream()
                        .filter(order -> order.getBookingTime().isAfter(start) || order.getBookingTime().isEqual(start))
                        .collect(Collectors.toList());
            }
            
            if (endDate != null && !endDate.trim().isEmpty()) {
                LocalDateTime end = LocalDateTime.parse(endDate + " 23:59:59", DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
                orders = orders.stream()
                        .filter(order -> order.getBookingTime().isBefore(end) || order.getBookingTime().isEqual(end))
                        .collect(Collectors.toList());
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
            errorResponse.put("message", "获取预约列表失败: " + e.getMessage());
            return ResponseEntity.badRequest().body(errorResponse);
        }
    }
    
    /**
     * 获取预约详情
     */
    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> getBookingDetail(@PathVariable Long id) {
        try {
            logger.info("🔍 收到获取订单详情请求, ID: {}", id);

            if (id == null) {
                logger.error("❌ 订单ID为空");
                Map<String, Object> errorResponse = new HashMap<>();
                errorResponse.put("success", false);
                errorResponse.put("message", "订单ID不能为空");
                return ResponseEntity.badRequest().body(errorResponse);
            }

            // 检查是否为虚拟订单（负数ID）
            if (id < 0) {
                logger.info("🔍 检测到虚拟订单请求，转发到虚拟订单详情API, ID: {}", id);
                Long requestId = -id; // 转换为正数获取申请ID
                return getVirtualOrderDetailForBookingAPI(requestId);
            }

            // 获取真实订单信息
            Order order = orderRepository.findById(id)
                    .orElseThrow(() -> {
                        logger.error("❌ 订单不存在, ID: {}", id);
                        return new RuntimeException("订单不存在");
                    });
            
            logger.info("📦 找到订单: {}", order.getOrderNo());
            
            // 构建响应数据
            Map<String, Object> response = new HashMap<>();
            
            // 基本订单信息
            response.put("id", order.getId());
            response.put("orderNo", order.getOrderNo());
            response.put("username", order.getUsername());
            response.put("venueId", order.getVenueId());
            response.put("venueName", order.getVenueName());
            response.put("status", order.getStatus().name());
            response.put("bookingType", order.getBookingType().name());
            response.put("createdAt", order.getCreatedAt());
            response.put("updatedAt", order.getUpdatedAt());
            
            // 获取订单关联的所有时间段
            logger.info("⏰ 从TimeSlot表获取时间信息");
            List<TimeSlot> timeSlots = timeSlotRepository.findByOrderId(order.getId());
            logger.info("找到 {} 个关联的时间段", timeSlots.size());
            
            // 处理时间段信息
            if (!timeSlots.isEmpty()) {
                // 按开始时间排序
                timeSlots.sort(Comparator.comparing(TimeSlot::getStartTime));
                
                // 获取最早开始时间和最晚结束时间
                TimeSlot firstSlot = timeSlots.get(0);
                TimeSlot lastSlot = timeSlots.get(timeSlots.size() - 1);
                
                LocalDate bookingDate = firstSlot.getDate();
                LocalTime startTime = firstSlot.getStartTime();
                LocalTime endTime = lastSlot.getEndTime();
                
                // 设置时间信息
                response.put("bookingDate", bookingDate.toString());
                response.put("startTime", startTime.toString());
                response.put("endTime", endTime.toString());
                
                // 计算所有时间段价格之和
                double totalPrice = timeSlots.stream()
                        .mapToDouble(slot -> slot.getPrice() != null ? slot.getPrice() : 0)
                        .sum();
                
                logger.info("⏰ 时间范围: {} {}-{}", bookingDate, startTime, endTime);
                
                if (order.getBookingType() == BookingType.SHARED) {
                    // 拼场订单：返回总价和每队价格
                    double perTeamPrice = order.getTotalPrice();
                    logger.info("💰 拼场订单 - 总费用: {}, 每队费用: {}", totalPrice, perTeamPrice);
                    
                    // 添加拼场订单特定的价格信息
                    response.put("isSharedBooking", true);
                    response.put("totalOriginalPrice", totalPrice);  // 总费用
                    response.put("totalPrice", perTeamPrice);         // 每队需要支付的费用
                } else {
                    // 普通订单：只返回总价
                    logger.info("💰 计算总价: {} ({} 个时间段)", totalPrice, timeSlots.size());
                    response.put("isSharedBooking", false);
                    response.put("totalPrice", totalPrice);
                }
                
                // 添加时间段列表到响应
                List<Map<String, Object>> slotsData = timeSlots.stream()
                        .map(slot -> {
                            Map<String, Object> slotMap = new HashMap<>();
                            slotMap.put("id", slot.getId());
                            slotMap.put("date", slot.getDate().toString());
                            slotMap.put("startTime", slot.getStartTime().toString());
                            slotMap.put("endTime", slot.getEndTime().toString());
                            slotMap.put("price", slot.getPrice());
                            slotMap.put("status", slot.getStatus().name());
                            return slotMap;
                        })
                        .collect(Collectors.toList());
                response.put("timeSlots", slotsData);
                
            } else {
                logger.warn("⚠️ 订单 {} 没有关联的时间段，使用订单信息", order.getId());

                // 对于已取消的订单，优先使用保存的原始时间信息
                if (order.getStatus() == Order.OrderStatus.CANCELLED &&
                    order.getOriginalStartTime() != null && order.getOriginalEndTime() != null) {

                    LocalDate bookingDate = order.getBookingTime() != null ?
                            order.getBookingTime().toLocalDate() : LocalDate.now();

                    // 设置时间信息
                    response.put("bookingDate", bookingDate.toString());
                    response.put("startTime", order.getOriginalStartTime().toString());
                    response.put("endTime", order.getOriginalEndTime().toString());
                    response.put("totalPrice", order.getTotalPrice());

                    logger.info("✅ 使用已取消订单{}的原始时间信息: {} - {}",
                               order.getId(), order.getOriginalStartTime(), order.getOriginalEndTime());

                } else {
                    // 如果没有关联的时间段，使用订单中的时间信息
                    LocalDateTime startTime = order.getBookingTime() != null ?
                            order.getBookingTime() : LocalDateTime.now();
                    LocalDate bookingDate = startTime.toLocalDate();

                    // 处理结束时间
                    LocalDateTime endTime;
                    if (order.getEndTime() != null) {
                        endTime = LocalDateTime.of(bookingDate, order.getEndTime());
                    } else {
                        endTime = startTime.plusHours(2);
                        logger.warn("订单 {} 的结束时间为空，使用默认值: {}", order.getId(), endTime);
                    }

                    // 处理总价
                    Double totalPrice = order.getTotalPrice() != null ?
                            order.getTotalPrice() : 100.0;

                    // 设置时间信息
                    response.put("bookingDate", bookingDate.toString());
                    response.put("startTime", startTime.toLocalTime().toString());
                    response.put("endTime", endTime.toLocalTime().toString());
                    response.put("totalPrice", totalPrice);
                }
            }
            
            // 获取场馆信息
            logger.info("🏟️ 查找场馆信息, venueId: {}", order.getVenueId());
            venueRepository.findById(order.getVenueId()).ifPresent(venue -> {
                response.put("venueLocation", venue.getLocation());
                logger.info("🏟️ 找到场馆位置: {}", venue.getLocation());
            });

            // 🔧 修复：如果是拼场订单，获取SharingOrder表中的队伍名称和联系方式
            if (order.getBookingType() == Order.BookingType.SHARED) {
                logger.info("🤝 检测到拼场订单，查询SharingOrder表获取队伍信息");
                SharingOrder sharingOrder = sharingOrderRepository.findByOrderId(order.getId());
                if (sharingOrder != null) {
                    response.put("teamName", sharingOrder.getTeamName());
                    response.put("contactInfo", sharingOrder.getContactInfo());
                    logger.info("🤝 找到拼场订单信息 - 队伍名称: {}, 联系方式: {}",
                        sharingOrder.getTeamName(), sharingOrder.getContactInfo());
                } else {
                    logger.warn("⚠️ 拼场订单但未找到对应的SharingOrder记录, orderId: {}", order.getId());
                    response.put("teamName", "未设置");
                    response.put("contactInfo", "未设置");
                }
            }

            logger.info("✅ 订单详情获取成功: {}", order.getOrderNo());
            
            // 构建标准响应
            Map<String, Object> result = new HashMap<>();
            result.put("code", 200);
            result.put("message", "success");
            result.put("data", response);
            
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            System.err.println("❌ 获取订单详情时发生异常: " + e.getMessage());
            e.printStackTrace();
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "服务器内部错误: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }
    
    /**
     * 取消预约
     */
    @PutMapping("/{id}/cancel")
    public ResponseEntity<Map<String, Object>> cancelBooking(@PathVariable Long id) {
        try {
            // 兼容：取消拼场申请的“虚拟订单”（负数ID）
            if (id < 0) {
                Long requestId = -id;
                Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
                String username = "guest";
                if (authentication != null && authentication.isAuthenticated() &&
                    !"anonymousUser".equals(authentication.getPrincipal())) {
                    UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
                    username = userDetails.getUsername();
                }

                Optional<SharingRequest> requestOpt = sharingRequestRepository.findById(requestId);
                if (!requestOpt.isPresent()) {
                    Map<String, Object> errorResponse = new HashMap<>();
                    errorResponse.put("success", false);
                    errorResponse.put("message", "申请不存在");
                    return ResponseEntity.badRequest().body(errorResponse);
                }

                SharingRequest sharingRequest = requestOpt.get();
                if (!sharingRequest.getApplicantUsername().equals(username)) {
                    Map<String, Object> errorResponse = new HashMap<>();
                    errorResponse.put("success", false);
                    errorResponse.put("message", "无权限取消该申请");
                    return ResponseEntity.badRequest().body(errorResponse);
                }

                boolean canCancel = sharingRequest.getStatus() == SharingRequest.RequestStatus.PENDING;
                if (!canCancel) {
                    if (sharingRequest.getStatus() == SharingRequest.RequestStatus.APPROVED_PENDING_PAYMENT) {
                        canCancel = sharingRequest.getIsPaid() == null || !sharingRequest.getIsPaid();
                    }
                }
                if (!canCancel) {
                    Map<String, Object> errorResponse = new HashMap<>();
                    errorResponse.put("success", false);
                    errorResponse.put("message", "当前状态不允许取消申请");
                    return ResponseEntity.badRequest().body(errorResponse);
                }

                sharingRequest.setStatus(SharingRequest.RequestStatus.CANCELLED);
                SharingRequest savedRequest = sharingRequestRepository.save(sharingRequest);

                Map<String, Object> response = new HashMap<>();
                response.put("success", true);
                response.put("message", "申请已取消");
                response.put("data", savedRequest);
                return ResponseEntity.ok(response);
            }

            Optional<Order> orderOpt = orderRepository.findById(id);
            if (!orderOpt.isPresent()) {
                Map<String, Object> errorResponse = new HashMap<>();
                errorResponse.put("success", false);
                errorResponse.put("message", "预约不存在");
                return ResponseEntity.notFound().build();
            }
            
            Order order = orderOpt.get();
            
            // 检查是否可以取消
            if (order.getStatus() == Order.OrderStatus.CANCELLED || 
                order.getStatus() == Order.OrderStatus.COMPLETED) {
                Map<String, Object> errorResponse = new HashMap<>();
                errorResponse.put("success", false);
                errorResponse.put("message", "该预约无法取消");
                return ResponseEntity.badRequest().body(errorResponse);
            }
            
            // 在释放时间段之前，保存原始时间信息到订单中（如果还没有保存的话）
            if (order.getOriginalStartTime() == null || order.getOriginalEndTime() == null) {
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

                        // 保存原始时间信息
                        order.setOriginalStartTime(earliestStart);
                        order.setOriginalEndTime(latestEnd);

                        logger.info("保存订单{}的原始时间信息: {} - {}", order.getId(), earliestStart, latestEnd);
                    }
                } catch (Exception e) {
                    logger.warn("保存订单{}的原始时间信息失败: {}", order.getId(), e.getMessage());
                }
            }

            order.setStatus(Order.OrderStatus.CANCELLED);
            Order savedOrder = orderRepository.save(order);

            // 🔥 修复：获取释放的时间段ID列表，返回给前端
            List<Long> releasedTimeSlotIds = timeSlotService.cancelBooking(order.getId());
            logger.info("🔴 释放了 {} 个时间段，订单ID: {}", releasedTimeSlotIds.size(), order.getId());

            // 如果是拼场订单，同步取消对应的拼场订单
            if (order.getBookingType() == Order.BookingType.SHARED) {
                logger.info("检测到拼场订单取消，同步取消对应的拼场订单，主订单ID: {}", order.getId());
                try {
                    SharingOrder sharingOrder = sharingOrderRepository.findByOrderId(order.getId());
                    if (sharingOrder != null) {
                        logger.info("找到对应的拼场订单，ID: {}, 当前状态: {}", sharingOrder.getId(), sharingOrder.getStatus());

                        // 只有在拼场订单未完成的情况下才取消
                        if (sharingOrder.getStatus() != SharingOrder.SharingOrderStatus.CANCELLED &&
                            sharingOrder.getStatus() != SharingOrder.SharingOrderStatus.CONFIRMED &&
                            sharingOrder.getStatus() != SharingOrder.SharingOrderStatus.EXPIRED) {

                            sharingOrder.setStatus(SharingOrder.SharingOrderStatus.CANCELLED);
                            sharingOrderRepository.save(sharingOrder);
                            logger.info("拼场订单已同步取消，拼场订单ID: {}", sharingOrder.getId());
                        } else {
                            logger.info("拼场订单状态为 {}，无需取消", sharingOrder.getStatus());
                        }
                    } else {
                        logger.warn("未找到主订单ID为 {} 的拼场订单", order.getId());
                    }
                } catch (Exception e) {
                    logger.error("同步取消拼场订单失败: {}", e.getMessage(), e);
                    // 不影响主订单的取消，只记录错误
                }
            }

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "预约已取消");
            response.put("data", savedOrder);
            response.put("releasedTimeSlotIds", releasedTimeSlotIds); // 🔥 返回释放的时间段ID列表
            response.put("venueId", order.getVenueId()); // 🔥 返回场馆ID
            response.put("bookingDate", order.getBookingTime() != null ? order.getBookingTime().toLocalDate().toString() : null); // 🔥 返回预约日期

            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "取消预约失败: " + e.getMessage());
            return ResponseEntity.badRequest().body(errorResponse);
        }
    }
    
    /**
     * 获取场地的可预约时间段
     */
    @GetMapping("/venues/{venueId}/slots")
    public ResponseEntity<Map<String, Object>> getAvailableSlots(
            @PathVariable Long venueId,
            @RequestParam String date) {
        
        Optional<Venue> venue = venueRepository.findById(venueId);
        if (!venue.isPresent()) {
            return ResponseEntity.notFound().build();
        }
        
        // 查询该日期该场地的已预约时间段
        LocalDateTime startOfDay = LocalDateTime.parse(date + " 00:00:00", DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
        LocalDateTime endOfDay = LocalDateTime.parse(date + " 23:59:59", DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
        
        List<Order> bookedOrders = orderRepository.findByVenueIdAndBookingTimeBetween(venueId, startOfDay, endOfDay);
        Set<Integer> bookedHours = bookedOrders.stream()
                .map(order -> order.getBookingTime().getHour())
                .collect(Collectors.toSet());
        
        // 生成可预约时间段
        List<Map<String, Object>> slots = new ArrayList<>();
        for (int hour = 9; hour <= 21; hour++) {
            Map<String, Object> slot = new HashMap<>();
            slot.put("startTime", String.format("%02d:00", hour));
            slot.put("endTime", String.format("%02d:00", hour + 1));
            slot.put("available", !bookedHours.contains(hour));
            slot.put("price", venue.get().getPrice());
            slots.add(slot);
        }
        
        Map<String, Object> response = new HashMap<>();
        response.put("venueId", venueId);
        response.put("date", date);
        response.put("slots", slots);
        
        return ResponseEntity.ok(response);
    }
    
    /**
     * 创建拼场预约
     * 支持多时间段预约，自动计算价格并创建相关记录
     *
     * 🔑 重要说明：拼场订单价格存储规则
     * ==========================================
     * Order表（主订单）:
     *   - total_price = 每队支付金额（场地总金额÷2）
     *   - 例如：场地总价200元，Order表存储100元
     *
     * SharingOrder表（拼场订单）:
     *   - total_price = 场地总金额（完整费用）
     *   - price_per_team = 每队支付金额（场地总金额÷2）
     *   - 例如：total_price=200元，price_per_team=100元
     *
     * 设计原理：
     *   - Order记录代表单个队伍的订单，存储该队伍需支付的金额
     *   - SharingOrder记录代表整个拼场活动，存储完整的场地费用信息
     * ==========================================
     */
    @PostMapping("/shared")
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<?> createSharedBooking(@RequestBody Map<String, Object> request) {
        Long venueId = null;
        LocalDate bookingDate = null;
        LocalTime bookingStartTime = null;
        LocalTime bookingEndTime = null;
        Order savedOrder = null;
        
        try {
            logger.info("=== 开始处理创建拼场预约请求 ===");
            logger.info("请求参数: {}", request);
            logger.info("🔍 [调试] 请求中的slotIds: {}", request.get("slotIds"));
            logger.info("🔍 [调试] slotIds类型: {}", request.get("slotIds") != null ? request.get("slotIds").getClass() : "null");
            
            // 获取当前用户
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            String username = authentication.getName();
            logger.info("当前用户: {}", username);
            
            // 验证用户存在
            userRepository.findByUsername(username)
                    .orElseThrow(() -> new RuntimeException("用户不存在"));
            logger.info("用户信息验证成功");
            
            // 解析请求数据
            venueId = Long.parseLong(request.get("venueId").toString());
            String date = request.get("date").toString();
            String startTime = request.get("startTime").toString();
            String endTime = request.get("endTime") != null ? request.get("endTime").toString() : null; // 🔧 获取前端传递的结束时间
            String teamName = request.get("teamName").toString();
            String contactInfo = request.get("contactInfo").toString();
            // 拼场服务固定为两支球队
            Integer maxParticipants = 2;
            String description = request.get("description") != null ? request.get("description").toString() : "";

            // 🔧 修复：获取前端传递的价格
            Double frontendPrice = null;
            if (request.containsKey("price")) {
                try {
                    frontendPrice = Double.valueOf(request.get("price").toString());
                    logger.info("拼场预约 - 前端传递的价格: {}", frontendPrice);
                } catch (NumberFormatException e) {
                    logger.warn("拼场预约 - 前端价格格式错误，将使用后端计算价格");
                }
            }

            logger.info("解析请求数据成功: venueId={}, date={}, startTime={}, endTime={}, teamName={}, contactInfo={}, maxParticipants={}, frontendPrice={}",
                    venueId, date, startTime, endTime, teamName, contactInfo, maxParticipants, frontendPrice);
            
            // 验证场馆是否存在
            Venue venue = venueRepository.findById(venueId)
                    .orElseThrow(() -> new RuntimeException("场馆不存在"));
            logger.info("场馆验证成功: {}", venue.getName());
            
            // 解析日期
            bookingDate = LocalDate.parse(date);

            // 🔧 修复：先处理slotIds，再确定最终的时间范围
            List<String> slotIdList = new ArrayList<>();
            if (request.containsKey("slotIds") && request.get("slotIds") != null) {
                Object slotIdsObj = request.get("slotIds");
                logger.info("🔍 [调试] slotIds原始数据: {}, 类型: {}", slotIdsObj, slotIdsObj.getClass());

                if (slotIdsObj instanceof List) {
                    // 将List中的元素转换为String类型（因为前端发送的是字符串ID）
                    List<?> rawList = (List<?>) slotIdsObj;
                    for (Object item : rawList) {
                        if (item != null) {
                            slotIdList.add(item.toString());
                        }
                    }
                }

                logger.info("🔍 [调试] 解析后的slotIdList: {}", slotIdList);

                // 🔧 修复：前端ID与后端ID不匹配问题
                // 前端发送的是字符串ID（如"frontend_40_2025-07-29_7_0"），但后端数据库使用数字ID
                // 解决方案：解析前端ID，提取时间信息，然后通过时间查询数据库
                if (!slotIdList.isEmpty()) {
                    logger.info("🔍 [ID解析] 开始解析前端时间段ID");

                    List<TimeSlot> timeSlots = new ArrayList<>();
                    List<String> timeRanges = new ArrayList<>();

                    // 解析前端ID，提取时间信息
                    for (String slotIdStr : slotIdList) {
                        logger.info("🔍 [ID解析] 处理ID: {}", slotIdStr);

                        // 尝试解析前端格式的ID: frontend_venueId_date_hour_minute
                        if (slotIdStr.startsWith("frontend_")) {
                            String[] parts = slotIdStr.split("_");
                            if (parts.length >= 5) {
                                try {
                                    int hour = Integer.parseInt(parts[3]);
                                    int minute = Integer.parseInt(parts[4]);
                                    LocalTime slotStartTime = LocalTime.of(hour, minute);
                                    LocalTime slotEndTime = slotStartTime.plusMinutes(30); // 每个时间段30分钟

                                    timeRanges.add(slotStartTime + "-" + slotEndTime);
                                    logger.info("🔍 [ID解析] 解析出时间: {}-{}", slotStartTime, slotEndTime);

                                    // 通过时间查询数据库中的时间段
                                    List<TimeSlot> foundSlots = timeSlotRepository.findByVenueIdAndDateAndStartTimeAndEndTime(
                                        venueId, bookingDate, slotStartTime, slotEndTime);

                                    if (!foundSlots.isEmpty()) {
                                        timeSlots.add(foundSlots.get(0));
                                        logger.info("🔍 [ID解析] 找到对应的数据库时间段: ID={}", foundSlots.get(0).getId());
                                    } else {
                                        logger.warn("⚠️ [ID解析] 数据库中未找到时间段: {}-{}", slotStartTime, slotEndTime);
                                    }
                                } catch (Exception e) {
                                    logger.error("❌ [ID解析] 解析ID失败: {}, 错误: {}", slotIdStr, e.getMessage());
                                }
                            }
                        } else {
                            // 如果是数字ID，直接查询
                            try {
                                Long numericId = Long.parseLong(slotIdStr);
                                Optional<TimeSlot> slot = timeSlotRepository.findById(numericId);
                                if (slot.isPresent()) {
                                    timeSlots.add(slot.get());
                                    logger.info("🔍 [ID解析] 通过数字ID找到时间段: {}", numericId);
                                }
                            } catch (NumberFormatException e) {
                                logger.error("❌ [ID解析] 无效的ID格式: {}", slotIdStr);
                            }
                        }
                    }

                    logger.info("🔍 [ID解析] 解析完成，找到 {} 个有效时间段", timeSlots.size());
                    logger.info("🔍 [ID解析] 时间范围列表: {}", timeRanges);

                    if (!timeSlots.isEmpty()) {
                        // 按开始时间排序
                        timeSlots.sort(Comparator.comparing(TimeSlot::getStartTime));

                        // 🔍 详细调试：打印所有查询到的时间段
                        logger.info("🔍 [时间段调试] 查询到的所有时间段:");
                        for (int i = 0; i < timeSlots.size(); i++) {
                            TimeSlot slot = timeSlots.get(i);
                            logger.info("   [{}] ID: {}, 时间: {}-{}", i, slot.getId(), slot.getStartTime(), slot.getEndTime());
                        }

                        // 使用第一个时间段的开始时间
                        bookingStartTime = timeSlots.get(0).getStartTime();
                        // 使用最后一个时间段的结束时间
                        bookingEndTime = timeSlots.get(timeSlots.size() - 1).getEndTime();

                        logger.info("✅ [时间段调试] 最终确定的时间范围: {}-{}", bookingStartTime, bookingEndTime);
                        logger.info("✅ [时间段调试] 第一个时间段: {}-{}", timeSlots.get(0).getStartTime(), timeSlots.get(0).getEndTime());
                        logger.info("✅ [时间段调试] 最后一个时间段: {}-{}", timeSlots.get(timeSlots.size() - 1).getStartTime(), timeSlots.get(timeSlots.size() - 1).getEndTime());
                    } else {
                        // 如果数据库中没有找到时间段，使用前端传递的时间
                        bookingStartTime = LocalTime.parse(startTime);
                        bookingEndTime = LocalTime.parse(endTime);
                        logger.warn("⚠️ 数据库中未找到任何时间段，使用前端时间: {}-{}", bookingStartTime, bookingEndTime);
                    }
                } else {
                    // 如果slotIdList为空，使用前端传递的时间
                    bookingStartTime = LocalTime.parse(startTime);
                    bookingEndTime = LocalTime.parse(endTime);
                    logger.info("🔍 [调试] slotIdList为空，使用前端时间: {}-{}", bookingStartTime, bookingEndTime);
                }
            } else {
                // 如果没有slotIds，使用前端传递的时间
                bookingStartTime = LocalTime.parse(startTime);
                bookingEndTime = LocalTime.parse(endTime);
                logger.info("🔍 [调试] 没有slotIds，使用前端时间: {}-{}", bookingStartTime, bookingEndTime);
            }
            
            logger.info("预约时间: 日期={}, 开始时间={}, 结束时间={}",
                    bookingDate, bookingStartTime, bookingEndTime);
            logger.info("场馆价格: 每小时价格={}", venue.getPrice());
            
            // ===== 后端价格计算（备用方案）=====
            // 当前端价格无效时，后端重新计算价格作为备用方案
            logger.info("🔍 [价格计算] 开始后端价格计算（备用方案）");
            logger.info("🔍 [价格计算] 前端传递的每队价格: ¥{}", frontendPrice);

            // 1. 获取场馆基础价格信息
            double hourlyRate = venue.getPrice();  // 场馆每小时价格
            logger.info("🔍 [价格计算] 场馆每小时价格: ¥{}", hourlyRate);

            // 2. 计算时间段相关信息
            int slotCount = slotIdList != null ? slotIdList.size() : 1;  // 选择的时间段数量
            double totalHours = slotCount * 0.5;                         // 总小时数（每个时间段30分钟）

            logger.info("🔍 [价格计算] 选择时间段: {} 个", slotCount);
            logger.info("🔍 [价格计算] 总预约时长: {} 小时", totalHours);
            logger.info("🔍 [价格计算] 时间段ID列表: {}", slotIdList);

            // 3. 后端价格计算公式
            // 场地总价 = 每小时价格 × 总小时数
            double totalPrice = Math.round((hourlyRate * totalHours) * 100.0) / 100.0;
            // 每队价格 = 场地总价 ÷ 2（拼场两队平分费用）
            double pricePerTeam = Math.round((totalPrice / 2) * 100.0) / 100.0;

            logger.info("🔍 [价格计算] 后端计算结果:");
            logger.info("   - 场地总价: ¥{} ({}小时 × ¥{}/小时)", totalPrice, totalHours, hourlyRate);
            logger.info("   - 每队价格: ¥{} (总价 ÷ 2)", pricePerTeam);
            logger.info("🔍 [价格对比] 前端: ¥{} vs 后端: ¥{}", frontendPrice, pricePerTeam);

            // 创建订单，使用计算好的价格
            LocalDateTime bookingTime = LocalDateTime.of(bookingDate, bookingStartTime);
            LocalDateTime endDateTime = LocalDateTime.of(bookingDate, bookingEndTime);

            // ===== 方案一：前端价格优先策略 =====
            // 优先使用前端精确计算的价格，确保前后端价格一致性
            // 只有在前端价格无效时才使用后端计算作为备用方案

            // 🔑 重要说明：拼场订单价格变量定义
            double finalPricePerTeam;   // 每队支付金额（总金额÷2）→ 存储到Order.total_price
            double fieldTotalPrice;     // 场地总金额（完整费用）→ 存储到SharingOrder.total_price

            if (frontendPrice != null && frontendPrice > 0) {
                // ===== 使用前端传递的价格（推荐方案）=====
                // 前端已经根据用户选择的时间段精确计算了每队价格
                finalPricePerTeam = frontendPrice;                    // 每队支付价格
                fieldTotalPrice = finalPricePerTeam * 2;              // 场地完整价格

                logger.info("✅ [价格策略] 使用前端精确计算价格:");
                logger.info("   - 每队支付: ¥{} (存储到Order表)", finalPricePerTeam);
                logger.info("   - 场地总价: ¥{} (仅用于SharingOrder表)", fieldTotalPrice);
                logger.info("   - 价格来源: 前端计算");
            } else {
                // ===== 使用后端计算价格（备用方案）=====
                // 当前端价格无效时，使用后端重新计算的价格
                finalPricePerTeam = pricePerTeam;                     // 每队支付价格
                fieldTotalPrice = totalPrice;                         // 场地完整价格

                logger.warn("⚠️ [价格策略] 前端价格无效，使用后端计算价格:");
                logger.warn("   - 每队支付: ¥{} (存储到Order表)", finalPricePerTeam);
                logger.warn("   - 场地总价: ¥{} (仅用于SharingOrder表)", fieldTotalPrice);
                logger.warn("   - 价格来源: 后端计算");
                logger.warn("   - 前端价格值: {}", frontendPrice);
            }

            // ===== 创建主订单（Order表）=====
            // 🔑 重要说明：拼场订单的Order表价格存储规则
            // Order.total_price = 场地总金额的一半（每队支付金额）
            // 原因：每个Order记录代表一个队伍的订单，存储该队伍实际需要支付的金额
            // 例如：场地总价200元，Order表存储100元（每队支付金额）
            Order order = Order.createSharedOrder(
                    username, venueId, venue.getName(), bookingTime, endDateTime, finalPricePerTeam,
                    teamName, contactInfo, maxParticipants, description
            );

            logger.info("📋 [Order表] total_price设置为: ¥{} (场地总金额的一半，每队支付金额)", finalPricePerTeam);
            logger.info("📋 [Order表] 存储规则: Order.total_price = 每队支付金额 (总金额÷2)");

            // 保存订单
            savedOrder = orderRepository.save(order);
            logger.info("拼场订单保存成功: ID={}, 订单号={}, 整场总价={}, 每队价格={}",
                savedOrder.getId(), savedOrder.getOrderNo(), totalPrice, pricePerTeam);
            
            // 🔧 修复：先处理时间段，再创建SharingOrder记录（使用正确的时间和价格）
            
            // 更新时间段状态为已预约
            List<TimeSlot> bookedSlots = new ArrayList<>();
            
            // 检查是否有传入slotIds数组
            if (request.containsKey("slotIds") && request.get("slotIds") != null) {
                // 使用之前已经处理过的slotIdList
                logger.info("🔍 [调试] 进入多时间段处理分支");
                logger.info("🔍 [调试] slotIdList大小: {}", slotIdList.size());
                logger.info("🔍 [调试] slotIdList内容: {}", slotIdList);

                // 🔧 修复：使用相同的ID解析逻辑查询时间段
                List<TimeSlot> timeSlots = new ArrayList<>();

                // 解析前端ID，查询对应的数据库时间段
                for (String slotIdStr : slotIdList) {
                    logger.info("🔍 [多时间段] 处理ID: {}", slotIdStr);

                    // 尝试解析前端格式的ID: frontend_venueId_date_hour_minute
                    if (slotIdStr.startsWith("frontend_")) {
                        String[] parts = slotIdStr.split("_");
                        if (parts.length >= 5) {
                            try {
                                int hour = Integer.parseInt(parts[3]);
                                int minute = Integer.parseInt(parts[4]);
                                LocalTime slotStartTime = LocalTime.of(hour, minute);
                                LocalTime slotEndTime = slotStartTime.plusMinutes(30);

                                // 通过时间查询数据库中的时间段
                                List<TimeSlot> foundSlots = timeSlotRepository.findByVenueIdAndDateAndStartTimeAndEndTime(
                                    venueId, bookingDate, slotStartTime, slotEndTime);

                                if (!foundSlots.isEmpty()) {
                                    timeSlots.add(foundSlots.get(0));
                                    logger.info("🔍 [多时间段] 找到时间段: {}-{}", slotStartTime, slotEndTime);
                                }
                            } catch (Exception e) {
                                logger.error("❌ [多时间段] 解析ID失败: {}", slotIdStr);
                            }
                        }
                    } else {
                        // 如果是数字ID，直接查询
                        try {
                            Long numericId = Long.parseLong(slotIdStr);
                            Optional<TimeSlot> slot = timeSlotRepository.findById(numericId);
                            if (slot.isPresent()) {
                                timeSlots.add(slot.get());
                                logger.info("🔍 [多时间段] 通过数字ID找到时间段: {}", numericId);
                            }
                        } catch (NumberFormatException e) {
                            logger.error("❌ [多时间段] 无效的ID格式: {}", slotIdStr);
                        }
                    }
                }

                logger.info("🔍 [多时间段] 总共找到 {} 个时间段", timeSlots.size());

                // 🔧 修复：计算实际的开始时间和结束时间
                LocalTime actualStartTime = null;
                LocalTime actualEndTime = null;
                double totalSlotPrice = 0.0;

                // 按时间排序时间段
                timeSlots.sort((a, b) -> a.getStartTime().compareTo(b.getStartTime()));

                for (TimeSlot timeSlot : timeSlots) {
                    // 更新时间段状态和关联订单信息
                    timeSlot.setStatus(TimeSlot.SlotStatus.RESERVED);
                    timeSlot.setOrderId(savedOrder.getId());
                    timeSlot.setDate(bookingDate);
                    timeSlot.setPrice(hourlyRate / 2); // 每半小时的价格
                    timeSlot = timeSlotRepository.save(timeSlot);
                    bookedSlots.add(timeSlot);

                    // 计算总的时间范围
                    if (actualStartTime == null || timeSlot.getStartTime().isBefore(actualStartTime)) {
                        actualStartTime = timeSlot.getStartTime();
                    }
                    if (actualEndTime == null || timeSlot.getEndTime().isAfter(actualEndTime)) {
                        actualEndTime = timeSlot.getEndTime();
                    }

                    // 累计价格
                    totalSlotPrice += timeSlot.getPrice();

                    logger.info("已更新时间段: ID={}, 开始时间={}, 结束时间={}, 价格={}",
                        timeSlot.getId(), timeSlot.getStartTime(), timeSlot.getEndTime(), timeSlot.getPrice());
                }

                // 🔧 修复：更新主订单的实际时间和价格
                if (actualStartTime != null && actualEndTime != null) {
                    LocalDateTime actualBookingTime = LocalDateTime.of(bookingDate, actualStartTime);
                    LocalDateTime actualEndDateTime = LocalDateTime.of(bookingDate, actualEndTime);

                    logger.info("🔍 [调试] 更新前 - 订单时间: {}-{}, 价格: {}",
                        savedOrder.getBookingTime(), savedOrder.getEndTime(), savedOrder.getTotalPrice());

                    savedOrder.setBookingTime(actualBookingTime);
                    savedOrder.setEndTime(actualEndDateTime);

                    // 🔑 关键修复：拼场订单Order表应该存储每队价格，不是总价格
                    // totalSlotPrice是场地总价格，需要除以2得到每队价格
                    double orderPricePerTeam = totalSlotPrice / 2;
                    savedOrder.setTotalPrice(orderPricePerTeam);
                    savedOrder = orderRepository.save(savedOrder);

                    logger.info("🔍 [调试] 更新后 - 订单时间: {}-{}, 价格: {}",
                        savedOrder.getBookingTime(), savedOrder.getEndTime(), savedOrder.getTotalPrice());
                    logger.info("✅ 主订单时间和价格更新成功:");
                    logger.info("   - 开始时间: {}, 结束时间: {}", actualBookingTime, actualEndDateTime);
                    logger.info("   - 场地总价格: ¥{}", totalSlotPrice);
                    logger.info("   - Order表存储价格: ¥{} (每队价格，总价格÷2)", orderPricePerTeam);
                } else {
                    logger.error("❌ 无法更新主订单时间 - actualStartTime: {}, actualEndTime: {}",
                        actualStartTime, actualEndTime);
                }

                logger.info("成功更新了 {} 个时间段的状态", bookedSlots.size());

                // ===== 创建拼场订单（SharingOrder表）=====
                // 拼场订单用于管理拼场相关的业务逻辑，如申请、审批、支付等
                try {
                    // 重新获取更新后的主订单信息，确保使用最新的时间和价格数据
                    savedOrder = orderRepository.findById(savedOrder.getId()).orElse(savedOrder);

                    // 从主订单中提取拼场订单所需的数据
                    LocalTime sharingStartTime = savedOrder.getBookingTime().toLocalTime();  // 预约开始时间
                    LocalTime sharingEndTime = savedOrder.getEndTime();                      // 预约结束时间

                    // 🔑 重要说明：SharingOrder表价格存储规则
                    // SharingOrder.price_per_team = 每队支付金额（总金额的一半）
                    // SharingOrder.total_price = 场地总金额（完整费用）
                    Double sharingPricePerTeam = savedOrder.getTotalPrice();                 // 每队价格（从Order表获取，现在是正确的）
                    Double sharingTotalPrice = sharingPricePerTeam * 2;                      // 场地总价格 = 每队价格 × 2

                    logger.info("📋 [SharingOrder表] 价格设置:");
                    logger.info("   - price_per_team: ¥{} (每队支付金额，总金额的一半)", sharingPricePerTeam);
                    logger.info("   - total_price: ¥{} (场地总金额，完整费用)", sharingTotalPrice);
                    logger.info("📋 [存储规则] SharingOrder.total_price = 场地总金额, price_per_team = 总金额÷2");

                    // ===== 创建SharingOrder实体 =====
                    SharingOrder sharingOrder = new SharingOrder(
                        venueId,                    // 场馆ID
                        venue.getName(),            // 场馆名称
                        bookingDate,                // 预约日期
                        sharingStartTime,           // 开始时间
                        sharingEndTime,             // 结束时间
                        teamName,                   // 队伍名称
                        contactInfo,                // 联系方式
                        maxParticipants,            // 最大参与人数（拼场固定为2）
                        sharingPricePerTeam,        // 🔑 price_per_team字段：每队支付金额（总金额÷2）
                        sharingTotalPrice,          // 🔑 total_price字段：场地总金额（完整费用）
                        username                    // 创建者用户名
                    );

                    // 设置可选的描述信息
                    if (description != null && !description.trim().isEmpty()) {
                        sharingOrder.setDescription(description);
                    }

                    // 关联主订单ID，建立Order和SharingOrder的关联关系
                    sharingOrder.setOrderId(savedOrder.getId());

                    // ===== 保存到数据库 =====
                    sharingOrder = sharingOrderRepository.save(sharingOrder);

                    logger.info("✅ [拼场订单创建成功] ID: {}, 时间: {}-{}, 每队: ¥{}, 总价: ¥{}",
                        sharingOrder.getId(), sharingStartTime, sharingEndTime, sharingPricePerTeam, sharingTotalPrice);
                } catch (Exception e) {
                    logger.error("创建拼场订单记录失败: {}", e.getMessage(), e);
                }
            } else {
                // 处理单个时间段的情况
                logger.info("🔍 [调试] 进入单时间段处理分支");
                logger.info("🔍 [调试] 单时间段时间: {}-{}", bookingStartTime, bookingEndTime);
                bookedSlots = timeSlotService.bookTimeSlots(
                    venueId, bookingDate, bookingStartTime, bookingEndTime, savedOrder.getId()
                );
                logger.info("成功更新了 {} 个时间段的状态", bookedSlots.size());

                // 🔧 修复：单时间段也需要创建SharingOrder记录
                try {
                    // 🔑 重要说明：单时间段拼场订单的价格存储规则（与多时间段相同）
                    // SharingOrder.price_per_team = 每队支付金额（总金额的一半）
                    // SharingOrder.total_price = 场地总金额（完整费用）
                    Double singlePricePerTeam = finalPricePerTeam;  // 每队支付金额
                    Double singleTotalPrice = fieldTotalPrice;      // 场地总金额

                    logger.info("📋 [单时间段SharingOrder] 价格设置:");
                    logger.info("   - price_per_team: ¥{} (每队支付金额)", singlePricePerTeam);
                    logger.info("   - total_price: ¥{} (场地总金额)", singleTotalPrice);

                    SharingOrder sharingOrder = new SharingOrder(
                        venueId,                    // 场馆ID
                        venue.getName(),            // 场馆名称
                        bookingDate,                // 预约日期
                        bookingStartTime,           // 开始时间
                        bookingEndTime,             // 结束时间
                        teamName,                   // 队伍名称
                        contactInfo,                // 联系方式
                        maxParticipants,            // 最大参与人数（拼场固定为2）
                        singlePricePerTeam,         // 🔑 price_per_team字段：每队支付金额（总金额÷2）
                        singleTotalPrice,           // 🔑 total_price字段：场地总金额（完整费用）
                        username                    // 创建者用户名
                    );

                    if (description != null && !description.trim().isEmpty()) {
                        sharingOrder.setDescription(description);
                    }

                    sharingOrder.setOrderId(savedOrder.getId());
                    sharingOrder = sharingOrderRepository.save(sharingOrder);

                    logger.info("成功创建单时间段拼场订单记录 - ID: {}, 时间: {}-{}, 每队价格: {}, 总价格: {}",
                        sharingOrder.getId(), bookingStartTime, bookingEndTime, singlePricePerTeam, singleTotalPrice);
                } catch (Exception e) {
                    logger.error("创建单时间段拼场订单记录失败: {}", e.getMessage(), e);
                }
            }
            
            logger.info("=== 创建拼场预约请求处理完成 ===");
            Map<String, Object> response = new HashMap<>();
            response.put("code", 200);
            response.put("message", "拼场预约成功");
            response.put("data", savedOrder);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("code", 500);
            errorResponse.put("message", "创建拼场预约失败: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }
    
    /**
     * 获取可拼场的订单列表
     */
    @GetMapping("/shared/available")
    public ResponseEntity<Map<String, Object>> getAvailableSharedBookings(
            @RequestParam(required = false) String date,
            @RequestParam(required = false) String venueType,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int pageSize) {
        
        try {
            List<Order> orders = orderRepository.findAll();
            
            // 过滤拼场订单
            orders = orders.stream()
                    .filter(order -> order.getBookingType() == Order.BookingType.SHARED)
                    .filter(order -> order.getAllowSharing())
                    .filter(order -> order.getStatus() == Order.OrderStatus.CONFIRMED)
                    .filter(order -> order.getCurrentParticipants() < order.getMaxParticipants())
                    .collect(Collectors.toList());
            
            // 根据日期过滤
            if (date != null && !date.trim().isEmpty()) {
                java.time.LocalDate filterDate = java.time.LocalDate.parse(date);
                orders = orders.stream()
                        .filter(order -> order.getBookingTime().toLocalDate().equals(filterDate))
                        .collect(Collectors.toList());
            }
            
            // 根据场馆类型过滤
            if (venueType != null && !venueType.trim().isEmpty()) {
                orders = orders.stream()
                    .filter(order -> {
                        Optional<Venue> venue = venueRepository.findById(order.getVenueId());
                        return venue.isPresent() && venueType.equals(venue.get().getType());
                    })
                    .collect(Collectors.toList());
            }
            
            // 手动分页
            int total = orders.size();
            int start = (page - 1) * pageSize;
            int end = Math.min(start + pageSize, total);
            
            List<Order> pagedOrders = orders.subList(start, end);
            
            // 为每个订单添加场地信息和剩余名额
            List<Map<String, Object>> enrichedOrders = pagedOrders.stream()
                    .map(order -> {
                        Map<String, Object> orderMap = new HashMap<>();
                        orderMap.put("id", order.getId());
                        orderMap.put("venueId", order.getVenueId());
                        orderMap.put("venueName", order.getVenueName());
                        orderMap.put("teamName", order.getTeamName());
                        orderMap.put("bookingTime", order.getBookingTime());
                        orderMap.put("totalPrice", order.getTotalPrice());
                        orderMap.put("currentParticipants", order.getCurrentParticipants());
                        orderMap.put("maxParticipants", order.getMaxParticipants());
                        orderMap.put("remainingSlots", order.getMaxParticipants() - order.getCurrentParticipants());
                        orderMap.put("description", order.getDescription());
                        orderMap.put("contactInfo", order.getContactInfo());
                        
                        // 获取场馆信息
                        Optional<Venue> venue = venueRepository.findById(order.getVenueId());
                        if (venue.isPresent()) {
                            orderMap.put("venueType", venue.get().getType());
                            orderMap.put("venueLocation", venue.get().getLocation());
                        }
                        
                        return orderMap;
                    })
                    .collect(Collectors.toList());
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("data", enrichedOrders);
            response.put("total", total);
            response.put("page", page);
            response.put("pageSize", pageSize);
            response.put("totalPages", (int) Math.ceil((double) total / pageSize));
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "获取可拼场订单失败: " + e.getMessage());
            return ResponseEntity.badRequest().body(errorResponse);
        }
    }
    
    /**
     * 申请拼场
     */
    @PostMapping("/shared/{sharingOrderId}/apply")
    public ResponseEntity<Map<String, Object>> applyForSharing(
            @PathVariable Long sharingOrderId,
            @RequestBody Map<String, Object> request) {
        
        try {
            // 获取当前用户
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            String username = "guest";
            if (authentication != null && authentication.isAuthenticated() && 
                !"anonymousUser".equals(authentication.getPrincipal())) {
                UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
                username = userDetails.getUsername();
            }
            
            // 先通过sharing_orders的ID找到对应的order_id
            Optional<SharingOrder> sharingOrderOpt = sharingOrderRepository.findById(sharingOrderId);
            if (!sharingOrderOpt.isPresent()) {
                Map<String, Object> errorResponse = new HashMap<>();
                errorResponse.put("success", false);
                errorResponse.put("message", "拼场订单不存在");
                return ResponseEntity.badRequest().body(errorResponse);
            }
            
            SharingOrder sharingOrder = sharingOrderOpt.get();
            Long orderId = sharingOrder.getOrderId();
            
            // 检查关联的主订单是否存在
            Optional<Order> orderOpt = orderRepository.findById(orderId);
            if (!orderOpt.isPresent()) {
                Map<String, Object> errorResponse = new HashMap<>();
                errorResponse.put("success", false);
                errorResponse.put("message", "关联订单不存在");
                return ResponseEntity.badRequest().body(errorResponse);
            }
            
            Order order = orderOpt.get();
            if (order.getBookingType() != Order.BookingType.SHARED || !order.getAllowSharing()) {
                Map<String, Object> errorResponse = new HashMap<>();
                errorResponse.put("success", false);
                errorResponse.put("message", "该订单不支持拼场");
                return ResponseEntity.badRequest().body(errorResponse);
            }
            
            // 检查是否已经提交了有效的申请
            List<SharingRequest.RequestStatus> excludedStatuses = Arrays.asList(
                SharingRequest.RequestStatus.REJECTED,
                SharingRequest.RequestStatus.CANCELLED,
                SharingRequest.RequestStatus.TIMEOUT_CANCELLED
            );
            if (sharingRequestRepository.existsBySharingOrderIdAndApplicantUsernameAndStatusNotIn(sharingOrderId, username, excludedStatuses)) {
                Map<String, Object> errorResponse = new HashMap<>();
                errorResponse.put("success", false);
                errorResponse.put("message", "您已经申请过该拼场，且申请正在处理中或已批准");
                return ResponseEntity.badRequest().body(errorResponse);
            }
            
            // 检查是否已有另一支球队申请（拼场服务只允许两支球队）
            Integer approvedParticipants = sharingRequestRepository.countApprovedParticipantsBySharingOrderId(sharingOrderId);
            
            if (sharingOrder.getCurrentParticipants() + approvedParticipants >= 2) {
                Map<String, Object> errorResponse = new HashMap<>();
                errorResponse.put("success", false);
                errorResponse.put("message", "该拼场已满，只允许两支球队参与");
                return ResponseEntity.badRequest().body(errorResponse);
            }
            
            // 创建拼场申请（使用sharingOrderId）
            String applicantTeamName = request.getOrDefault("teamName", "").toString();
            String applicantContact = request.get("contactInfo").toString();
            String message = request.getOrDefault("message", "").toString();
            // 拼场服务中，每个申请代表1支球队
            Integer requestedParticipants = 1;

            SharingRequest sharingRequest = SharingRequest.createRequestForSharingOrder(
                sharingOrderId, username, applicantTeamName, applicantContact, requestedParticipants, message
            );
            sharingRequest.setOrderId(orderId);

            // ✅ 修复：设置支付金额为拼场订单的每队价格
            sharingRequest.setPaymentAmount(sharingOrder.getPricePerTeam());
            logger.info("设置拼场申请支付金额: {}", sharingOrder.getPricePerTeam());

            logger.info("创建拼场申请 - 申请者: {}, sharingOrderId: {}, orderId: {}, 状态: {}, 支付金额: {}",
                       username, sharingOrderId, orderId, sharingRequest.getStatus(), sharingRequest.getPaymentAmount());
            
            // 检查是否开启了自动同意申请
            if (sharingOrder.getAutoApprove()) {
                // 自动同意申请，但申请者需要支付
                sharingRequest.setStatus(SharingRequest.RequestStatus.APPROVED_PENDING_PAYMENT);
                sharingRequest.setResponseMessage("自动同意，请在30分钟内完成支付");

                // 设置支付截止时间（30分钟）
                sharingRequest.setPaymentDeadline(LocalDateTime.now().plusMinutes(30));

                // 设置申请者需要支付的金额（拼场费用）
                // ✅ 修复：使用拼场订单的每队价格
                sharingRequest.setPaymentAmount(sharingOrder.getPricePerTeam());
                logger.info("自动批准申请 - 设置支付金额: {}", sharingOrder.getPricePerTeam());

                // 生成支付订单号
                sharingRequest.setPaymentOrderNo("PAY_" + System.currentTimeMillis() + "_" + sharingRequest.getApplicantUsername());

                // 更新发起者订单状态为等待申请者支付
                order.setStatus(Order.OrderStatus.APPROVED_PENDING_PAYMENT);
                orderRepository.save(order);

                logger.info("自动批准拼场申请，申请者: {}, 需支付金额: {}, 支付截止时间: {}",
                           sharingRequest.getApplicantUsername(),
                           sharingRequest.getPaymentAmount(),
                           sharingRequest.getPaymentDeadline());
            }
            
            SharingRequest savedRequest = sharingRequestRepository.save(sharingRequest);

            logger.info("拼场申请保存成功 - ID: {}, 申请者: {}, orderId: {}, sharingOrderId: {}, 状态: {}",
                       savedRequest.getId(), savedRequest.getApplicantUsername(),
                       savedRequest.getOrderId(), savedRequest.getSharingOrderId(), savedRequest.getStatus());

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            String responseMessage = sharingOrder.getAutoApprove() ? "拼场申请已自动通过" : "拼场申请提交成功";
            response.put("message", responseMessage);
            response.put("data", savedRequest);
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "申请拼场失败: " + e.getMessage());
            return ResponseEntity.badRequest().body(errorResponse);
        }
    }
    
    /**
     * 处理拼场申请（同意/拒绝）
     */
    @PutMapping("/shared/requests/{requestId}")
    public ResponseEntity<Map<String, Object>> handleSharingRequest(
            @PathVariable Long requestId,
            @RequestBody Map<String, Object> request) {
        
        try {
            // 获取当前用户
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            String username = "guest";
            if (authentication != null && authentication.isAuthenticated() && 
                !"anonymousUser".equals(authentication.getPrincipal())) {
                UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
                username = userDetails.getUsername();
            }
            
            // 获取拼场申请
            Optional<SharingRequest> requestOpt = sharingRequestRepository.findById(requestId);
            if (!requestOpt.isPresent()) {
                Map<String, Object> errorResponse = new HashMap<>();
                errorResponse.put("success", false);
                errorResponse.put("message", "申请不存在");
                return ResponseEntity.badRequest().body(errorResponse);
            }
            
            SharingRequest sharingRequest = requestOpt.get();
            
            // 获取对应的订单
            Optional<Order> orderOpt = orderRepository.findById(sharingRequest.getOrderId());
            if (!orderOpt.isPresent()) {
                Map<String, Object> errorResponse = new HashMap<>();
                errorResponse.put("success", false);
                errorResponse.put("message", "订单不存在");
                return ResponseEntity.badRequest().body(errorResponse);
            }
            
            Order order = orderOpt.get();
            
            // 检查权限（只有订单创建者可以处理申请）
            if (!order.getUsername().equals(username)) {
                Map<String, Object> errorResponse = new HashMap<>();
                errorResponse.put("success", false);
                errorResponse.put("message", "无权限处理该申请");
                return ResponseEntity.badRequest().body(errorResponse);
            }
            
            String action = request.get("action").toString(); // "approve" 或 "reject"
            String responseMessage = request.getOrDefault("responseMessage", "").toString();
            
            if ("approve".equals(action)) {
                // 检查是否已有另一支球队（拼场服务只允许两支球队）
                Integer approvedParticipants = sharingRequestRepository.countApprovedParticipantsByOrderId(order.getId());
                if (order.getCurrentParticipants() + approvedParticipants >= 2) {
                    Map<String, Object> errorResponse = new HashMap<>();
                    errorResponse.put("success", false);
                    errorResponse.put("message", "该拼场已满，只允许两支球队参与");
                    return ResponseEntity.badRequest().body(errorResponse);
                }
                
                sharingRequest.setStatus(SharingRequest.RequestStatus.APPROVED);
                
                // 更新订单的当前参与人数（增加1支球队）
                order.setCurrentParticipants(order.getCurrentParticipants() + 1);
                orderRepository.save(order);
                
            } else if ("reject".equals(action)) {
                sharingRequest.setStatus(SharingRequest.RequestStatus.REJECTED);
            } else {
                Map<String, Object> errorResponse = new HashMap<>();
                errorResponse.put("success", false);
                errorResponse.put("message", "无效的操作");
                return ResponseEntity.badRequest().body(errorResponse);
            }
            
            sharingRequest.setResponseMessage(responseMessage);
            SharingRequest savedRequest = sharingRequestRepository.save(sharingRequest);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "approve".equals(action) ? "申请已同意" : "申请已拒绝");
            response.put("data", savedRequest);
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "处理申请失败: " + e.getMessage());
            return ResponseEntity.badRequest().body(errorResponse);
        }
    }
    
    /**
     * 获取我的拼场申请列表
     */
    @GetMapping("/shared/my-requests")
    public ResponseEntity<Map<String, Object>> getMyRequests(
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int pageSize) {
        try {
            // 获取当前用户
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            String username = "guest";
            if (authentication != null && authentication.isAuthenticated() && 
                !"anonymousUser".equals(authentication.getPrincipal())) {
                UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
                username = userDetails.getUsername();
            }
            
            List<SharingRequest> requests = sharingRequestRepository.findByApplicantUsername(username);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("data", requests);
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "获取申请列表失败: " + e.getMessage());
            return ResponseEntity.badRequest().body(errorResponse);
        }
    }
    
    /**
     * 获取我收到的拼场申请列表
     */
    @GetMapping("/shared/received-requests")
    public ResponseEntity<Map<String, Object>> getReceivedRequests() {
        try {
            // 获取当前用户
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            String username = "guest";
            if (authentication != null && authentication.isAuthenticated() && 
                !"anonymousUser".equals(authentication.getPrincipal())) {
                UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
                username = userDetails.getUsername();
            }
            
            // 获取用户的拼场订单
            List<Order> userSharedOrders = orderRepository.findByUsername(username).stream()
                    .filter(order -> order.getBookingType() == Order.BookingType.SHARED)
                    .collect(Collectors.toList());
            
            // 获取这些订单的所有申请，并构建详细信息
            List<Map<String, Object>> allRequestsWithDetails = new ArrayList<>();
            for (Order order : userSharedOrders) {
                List<SharingRequest> orderRequests = sharingRequestRepository.findByOrderId(order.getId());
                
                for (SharingRequest request : orderRequests) {
                    // 跳过申请人是自己的申请
                    if (request.getApplicantUsername().equals(username)) {
                        continue;
                    }
                    
                    Map<String, Object> requestDetail = new HashMap<>();
                    requestDetail.put("id", request.getId());
                    requestDetail.put("applicantUsername", request.getApplicantUsername());
                    requestDetail.put("applicantName", request.getApplicantUsername()); // 可以后续从用户表获取真实姓名
                    requestDetail.put("applicantTeamName", request.getApplicantTeamName());
                    requestDetail.put("applicantContact", request.getApplicantContact());
                    requestDetail.put("participantsCount", request.getParticipantsCount());
                    requestDetail.put("message", request.getMessage());
                    requestDetail.put("status", request.getStatus().name());
                    requestDetail.put("createdAt", request.getCreatedAt());
                    requestDetail.put("updatedAt", request.getUpdatedAt());
                    requestDetail.put("responseMessage", request.getResponseMessage());
                    
                    // 添加拼场订单信息
                    requestDetail.put("orderId", order.getId());
                    requestDetail.put("venueName", order.getVenueName());
                    requestDetail.put("teamName", order.getTeamName());
                    requestDetail.put("bookingDate", order.getBookingDate());
                    requestDetail.put("startTime", order.getStartTime());
                    requestDetail.put("endTime", order.getEndTime());
                    requestDetail.put("currentParticipants", order.getCurrentParticipants());
                    requestDetail.put("maxParticipants", order.getMaxParticipants());
                    requestDetail.put("pricePerPerson", order.getPricePerPerson());
                    
                    allRequestsWithDetails.add(requestDetail);
                }
            }
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("data", allRequestsWithDetails);
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "获取申请列表失败: " + e.getMessage());
            return ResponseEntity.badRequest().body(errorResponse);
        }
    }

    /**
     * 获取虚拟订单详情（用于订单详情页面）
     * 这个方法专门为BookingController的getBookingDetail方法处理虚拟订单
     */
    private ResponseEntity<Map<String, Object>> getVirtualOrderDetailForBookingAPI(Long requestId) {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            String currentUsername = null;

            // 检查认证状态
            if (authentication != null && authentication.isAuthenticated() &&
                !"anonymousUser".equals(authentication.getName())) {
                if (authentication.getPrincipal() instanceof UserDetailsImpl) {
                    UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
                    currentUsername = userDetails.getUsername();
                } else {
                    currentUsername = authentication.getName();
                }
            }

            logger.info("获取虚拟订单详情（订单详情页面），申请ID: {}, 用户: {}, 认证状态: {}",
                       requestId, currentUsername, authentication != null ? authentication.isAuthenticated() : "null");

            // 获取拼场申请
            Optional<SharingRequest> requestOpt = sharingRequestRepository.findById(requestId);
            if (!requestOpt.isPresent()) {
                logger.error("❌ 拼场申请不存在, ID: {}", requestId);

                // 返回一个表示申请不存在的响应，而不是抛出异常
                Map<String, Object> response = new HashMap<>();
                response.put("id", -requestId);
                response.put("orderNo", "REQ_" + requestId);
                response.put("status", "NOT_FOUND");
                response.put("isVirtualOrder", true);
                response.put("originalRequestId", requestId);
                response.put("cancelReason", "申请记录不存在或已被删除");
                response.put("totalPrice", 0.0);
                response.put("venueName", "未知场馆");
                response.put("bookingTime", LocalDateTime.now());
                response.put("endTime", LocalDateTime.now());

                Map<String, Object> result = new HashMap<>();
                result.put("code", 200);
                result.put("message", "success");
                result.put("data", response);

                return ResponseEntity.ok(result);
            }

            SharingRequest request = requestOpt.get();

            // 验证是否是申请者本人
            logger.info("🔍 权限验证: 申请者={}, 当前用户={}", request.getApplicantUsername(), currentUsername);

            // 如果用户未认证，返回认证错误
            if (currentUsername == null) {
                logger.error("❌ 用户未认证，无法访问虚拟订单详情");

                Map<String, Object> response = new HashMap<>();
                response.put("id", -requestId);
                response.put("orderNo", "REQ_" + requestId);
                response.put("status", "UNAUTHORIZED");
                response.put("isVirtualOrder", true);
                response.put("originalRequestId", requestId);
                response.put("cancelReason", "用户未认证");
                response.put("totalPrice", 0.0);
                response.put("venueName", "未知场馆");
                response.put("bookingTime", LocalDateTime.now());
                response.put("endTime", LocalDateTime.now());

                Map<String, Object> result = new HashMap<>();
                result.put("code", 401);
                result.put("message", "Unauthorized");
                result.put("data", response);

                return ResponseEntity.status(401).body(result);
            }

            // 验证是否是申请者本人
            if (!request.getApplicantUsername().equals(currentUsername)) {
                logger.error("❌ 无权访问此申请, 申请者: {}, 当前用户: {}", request.getApplicantUsername(), currentUsername);

                // 返回权限不足的响应，而不是抛出异常
                Map<String, Object> response = new HashMap<>();
                response.put("id", -requestId);
                response.put("orderNo", "REQ_" + requestId);
                response.put("status", "ACCESS_DENIED");
                response.put("isVirtualOrder", true);
                response.put("originalRequestId", requestId);
                response.put("cancelReason", "无权访问此申请");
                response.put("totalPrice", 0.0);
                response.put("venueName", "未知场馆");
                response.put("bookingTime", LocalDateTime.now());
                response.put("endTime", LocalDateTime.now());

                Map<String, Object> result = new HashMap<>();
                result.put("code", 200);
                result.put("message", "success");
                result.put("data", response);

                return ResponseEntity.ok(result);
            }

            // 获取原始订单
            Order originalOrder = null;
            if (request.getOrderId() != null) {
                originalOrder = orderRepository.findById(request.getOrderId()).orElse(null);
                logger.info("✅ 从orderId获取原始订单: ID={}, 场馆={}, 时间={}",
                           originalOrder != null ? originalOrder.getId() : "null",
                           originalOrder != null ? originalOrder.getVenueName() : "null",
                           originalOrder != null ? originalOrder.getBookingTime() : "null");
            } else if (request.getSharingOrderId() != null) {
                // 通过拼场订单ID查找原始订单
                originalOrder = findOrderBySharingOrderId(request.getSharingOrderId());
                logger.info("✅ 从sharingOrderId获取原始订单: ID={}, 场馆={}, 时间={}",
                           originalOrder != null ? originalOrder.getId() : "null",
                           originalOrder != null ? originalOrder.getVenueName() : "null",
                           originalOrder != null ? originalOrder.getBookingTime() : "null");
            }

            if (originalOrder == null) {
                logger.error("❌ 无法找到原始订单，返回默认值");

                // 如果找不到原始订单，设置默认值
                Map<String, Object> response = new HashMap<>();
                response.put("id", -requestId);
                response.put("orderNo", "REQ_" + requestId);
                response.put("status", "NOT_FOUND");
                response.put("isVirtualOrder", true);
                response.put("originalRequestId", requestId);
                response.put("venueName", "未知场馆");
                response.put("venueLocation", "--");
                response.put("bookingTime", LocalDateTime.now());
                response.put("endTime", LocalDateTime.now());
                response.put("totalPrice", 0.0);
                response.put("paymentAmount", 0.0);
                response.put("createdAt", LocalDateTime.now());
                response.put("cancelReason", "找不到原始订单");

                Map<String, Object> result = new HashMap<>();
                result.put("code", 200);
                result.put("message", "success");
                result.put("data", response);

                return ResponseEntity.ok(result);
            }

            // 使用与UserController相同的逻辑创建虚拟订单
            Order virtualOrder = createVirtualOrderFromRequest(request, originalOrder);

            // 构建响应数据（与UserController保持一致）
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
            response.put("endTime", virtualOrder.getEndDateTime()); // 使用完整的LocalDateTime
            response.put("createdAt", virtualOrder.getCreatedAt());
            response.put("updatedAt", virtualOrder.getUpdatedAt());
            response.put("teamName", virtualOrder.getTeamName());
            response.put("contactInfo", virtualOrder.getContactInfo());

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
            logger.error("❌ 获取虚拟订单详情失败: {}", e.getMessage(), e);
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "获取虚拟订单详情失败: " + e.getMessage());
            return ResponseEntity.status(500).body(errorResponse);
        }
    }

    /**
     * 将拼场申请状态转换为虚拟订单状态
     */
    @SuppressWarnings("unused")
    private String getVirtualOrderStatus(SharingRequest.RequestStatus requestStatus) {
        switch (requestStatus) {
            case PENDING:
                return "PENDING";
            case APPROVED_PENDING_PAYMENT:
                return "PENDING";
            case PAID:
                return "SHARING_SUCCESS"; // 只有已支付才是拼场成功
            case APPROVED:
                return "PENDING"; // 已批准但未支付，应该是待支付状态
            case REJECTED:
                return "CANCELLED";
            case TIMEOUT_CANCELLED:
                return "EXPIRED";  // 超时取消映射为过期状态
            case CANCELLED:
                return "CANCELLED";
            default:
                return "PENDING";
        }
    }

    /**
     * 从拼场申请创建虚拟订单对象，用于在前端显示
     * 与UserController中的方法保持一致
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

        logger.info("✅ 虚拟订单最终金额设置: totalPrice={}, paymentAmount={}", paymentAmount, paymentAmount);

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
