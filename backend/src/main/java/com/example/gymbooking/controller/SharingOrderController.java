package com.example.gymbooking.controller;

import com.example.gymbooking.model.SharingOrder;
import com.example.gymbooking.model.SharingRequest;
import com.example.gymbooking.model.Order;
import com.example.gymbooking.model.User;
import com.example.gymbooking.model.Venue;
import com.example.gymbooking.payload.response.MessageResponse;
import com.example.gymbooking.repository.OrderRepository;
import com.example.gymbooking.repository.SharingOrderRepository;
import com.example.gymbooking.repository.SharingRequestRepository;
import com.example.gymbooking.repository.UserRepository;
import com.example.gymbooking.repository.VenueRepository;
import com.example.gymbooking.service.SharingOrderService;
import com.example.gymbooking.service.TimeSlotService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Map;
import java.util.Optional;
import java.util.HashMap;
import java.util.List;
import java.util.stream.Collectors;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/sharing-orders")
public class SharingOrderController {
    private static final Logger logger = LoggerFactory.getLogger(SharingOrderController.class);
    
    @Autowired
    private SharingOrderService sharingOrderService;
    
    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private VenueRepository venueRepository;

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private SharingRequestRepository sharingRequestRepository;

    @Autowired
    private SharingOrderRepository sharingOrderRepository;

    @Autowired
    private TimeSlotService timeSlotService;
    
    /**
     * 获取当前登录用户的用户名
     */
    private String getCurrentUsername() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        return authentication.getName();
    }
    
    /**
     * 为SharingOrder添加场馆位置信息
     */
    private SharingOrder enrichSharingOrderWithVenueInfo(SharingOrder order) {
        // 获取场馆位置信息
        try {
            Optional<Venue> venue = venueRepository.findById(order.getVenueId());
            if (venue.isPresent()) {
                order.setVenueLocation(venue.get().getLocation());
            } else {
                order.setVenueLocation("位置未知");
            }
        } catch (Exception e) {
            logger.error("获取场馆位置信息失败: {}", e.getMessage());
            order.setVenueLocation("位置未知");
        }

        return order;
    }

    /**
     * 为拼场订单Map添加场馆位置信息
     */
    private Map<String, Object> enrichSharingOrderMapWithVenueInfo(Map<String, Object> orderMap, Long venueId) {
        if (venueId != null) {
            try {
                Optional<Venue> venue = venueRepository.findById(venueId);
                if (venue.isPresent()) {
                    orderMap.put("venueLocation", venue.get().getLocation());
                } else {
                    orderMap.put("venueLocation", "位置未知");
                }
            } catch (Exception e) {
                logger.warn("获取场馆位置信息失败，场馆ID: {}, 错误: {}", venueId, e.getMessage());
                orderMap.put("venueLocation", "位置未知");
            }
        } else {
            orderMap.put("venueLocation", "位置未知");
        }
        return orderMap;
    }

    /**
     * 创建拼场订单
     */
    @PostMapping
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<?> createSharingOrder(@RequestBody SharingOrder sharingOrder) {
        try {
            logger.info("=== 开始处理创建拼场订单请求 ===");
            logger.info("请求参数: {}", sharingOrder);
            
            // 设置创建者用户名
            String username = getCurrentUsername();
            sharingOrder.setCreatorUsername(username);
            
            // 创建拼场订单
            SharingOrder createdOrder = sharingOrderService.createSharingOrder(sharingOrder);
            
            logger.info("拼场订单创建成功 - ID: {}, 订单号: {}", createdOrder.getId(), createdOrder.getOrderNo());
            return ResponseEntity.ok(createdOrder);
        } catch (Exception e) {
            logger.error("创建拼场订单失败: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new MessageResponse("创建拼场订单失败: " + e.getMessage()));
        } finally {
            logger.info("=== 创建拼场订单请求处理结束 ===");
        }
    }
    
    /**
     * 获取拼场订单详情
     */
    @GetMapping("/{id}")
    public ResponseEntity<?> getSharingOrderById(@PathVariable Long id) {
        try {
            logger.info("=== 获取拼场订单详情请求 ===");
            logger.info("请求的拼场订单ID: {}", id);

            Optional<SharingOrder> sharingOrder = sharingOrderService.getSharingOrderById(id);
            logger.info("数据库查询结果: {}", sharingOrder.isPresent() ? "找到订单" : "订单不存在");

            if (!sharingOrder.isPresent()) {
                // 查询失败，检查是否有相关的主订单
                logger.warn("拼场订单不存在，ID: {}", id);
                logger.info("尝试查找相关的主订单信息...");

                // 查找是否有以此ID为orderId的拼场订单
                SharingOrder orderByOrderId = sharingOrderRepository.findByOrderId(id);
                if (orderByOrderId != null) {
                    logger.info("找到以{}为主订单ID的拼场订单: {}", id, orderByOrderId.getId());
                } else {
                    logger.info("未找到以{}为主订单ID的拼场订单", id);
                }
            }

            if (sharingOrder.isPresent()) {
                SharingOrder enrichedOrder = enrichSharingOrderWithVenueInfo(sharingOrder.get());
                // 补充totalPrice字段，便于前端展示
Map<String, Object> result = new HashMap<>();
result.put("id", enrichedOrder.getId());
result.put("venueId", enrichedOrder.getVenueId());
result.put("venueName", enrichedOrder.getVenueName());
result.put("bookingDate", enrichedOrder.getBookingDate());
// 统一时间格式为 HH:mm
String startTimeStr = enrichedOrder.getStartTime() != null ? enrichedOrder.getStartTime().format(java.time.format.DateTimeFormatter.ofPattern("HH:mm")) : null;
                // 使用实际的结束时间
                String endTimeStr = null;
                if (enrichedOrder.getEndTime() != null) {
                    endTimeStr = enrichedOrder.getEndTime().format(java.time.format.DateTimeFormatter.ofPattern("HH:mm"));
                } else if (enrichedOrder.getStartTime() != null) {
                    // 如果没有结束时间，则使用开始时间加2小时作为默认值
                    endTimeStr = enrichedOrder.getStartTime().plusHours(2).format(java.time.format.DateTimeFormatter.ofPattern("HH:mm"));
                }
                result.put("startTime", startTimeStr);
                result.put("endTime", endTimeStr);
System.out.println("返回拼场订单时间 - 开始: " + startTimeStr + ", 结束: " + endTimeStr);
result.put("teamName", enrichedOrder.getTeamName());
result.put("contactInfo", enrichedOrder.getContactInfo());
result.put("maxParticipants", enrichedOrder.getMaxParticipants());
result.put("currentParticipants", enrichedOrder.getCurrentParticipants());
result.put("description", enrichedOrder.getDescription());
result.put("pricePerTeam", enrichedOrder.getPricePerTeam());
result.put("status", enrichedOrder.getStatus());
result.put("creatorUsername", enrichedOrder.getCreatorUsername());
result.put("orderNo", enrichedOrder.getOrderNo());
// 统一时间格式为 yyyy-MM-dd HH:mm:ss，兼容iOS
String createdAtStr = enrichedOrder.getCreatedAt() != null ? enrichedOrder.getCreatedAt().format(java.time.format.DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")) : null;
result.put("createdAt", createdAtStr);
result.put("updatedAt", enrichedOrder.getUpdatedAt());
result.put("orderId", enrichedOrder.getOrderId());

// 获取主订单状态，用于判断发起者是否已支付
if (enrichedOrder.getOrderId() != null) {
    Optional<Order> mainOrder = orderRepository.findById(enrichedOrder.getOrderId());
    if (mainOrder.isPresent()) {
        result.put("orderStatus", mainOrder.get().getStatus().name());
        result.put("orderStatusDescription", mainOrder.get().getStatus().getDescription());
    }
}

result.put("autoApprove", enrichedOrder.getAutoApprove());
result.put("allowExit", enrichedOrder.getAllowExit());
result.put("venueLocation", enrichedOrder.getVenueLocation());
// totalPrice = 拼场订单的总费用
// 使用SharingOrder模型中的getTotalPrice()方法，确保计算逻辑一致
Double totalPrice = enrichedOrder.getTotalPrice();
Double perTeamPrice = enrichedOrder.getPricePerTeam();
logger.info("=== 拼场订单价格调试信息 ===");
        logger.info("订单ID: {}", enrichedOrder.getId());
        logger.info("每队费用: {}", enrichedOrder.getPricePerTeam());
        logger.info("总费用: {}", enrichedOrder.getTotalPrice());
        logger.info("最大参与人数: {}", enrichedOrder.getMaxParticipants());
result.put("totalPrice", totalPrice);
result.put("perTeamPrice", perTeamPrice); // 添加每队费用字段，便于前端直接使用

logger.info("=== 返回拼场订单详情 ===");
logger.info("返回数据: {}", result);
logger.info("数据包含字段: {}", result.keySet());

return ResponseEntity.ok(result);
            } else {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(new MessageResponse("拼场订单不存在"));
            }
        } catch (Exception e) {
            logger.error("获取拼场订单详情失败: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new MessageResponse("获取拼场订单详情失败: " + e.getMessage()));
        }
    }

    /**
     * 通过主订单ID获取拼场订单详情
     */
    @GetMapping("/by-order/{orderId}")
    public ResponseEntity<?> getSharingOrderByMainOrderId(@PathVariable Long orderId) {
        try {
            logger.info("=== 通过主订单ID获取拼场订单详情 ===");
            logger.info("主订单ID: {}", orderId);

            SharingOrder sharingOrder = sharingOrderRepository.findByOrderId(orderId);
            logger.info("查询结果: {}", sharingOrder != null ? "找到拼场订单ID: " + sharingOrder.getId() : "未找到拼场订单");

            if (sharingOrder != null) {
                SharingOrder enrichedOrder = enrichSharingOrderWithVenueInfo(sharingOrder);

                // 构建响应数据（复用现有逻辑）
                Map<String, Object> result = new HashMap<>();
                result.put("id", enrichedOrder.getId());
                result.put("venueId", enrichedOrder.getVenueId());
                result.put("venueName", enrichedOrder.getVenueName());
                result.put("bookingDate", enrichedOrder.getBookingDate());

                // 统一时间格式为 HH:mm
                String startTimeStr = enrichedOrder.getStartTime() != null ? enrichedOrder.getStartTime().format(java.time.format.DateTimeFormatter.ofPattern("HH:mm")) : null;
                String endTimeStr = null;
                if (enrichedOrder.getEndTime() != null) {
                    endTimeStr = enrichedOrder.getEndTime().format(java.time.format.DateTimeFormatter.ofPattern("HH:mm"));
                } else if (enrichedOrder.getStartTime() != null) {
                    endTimeStr = enrichedOrder.getStartTime().plusHours(2).format(java.time.format.DateTimeFormatter.ofPattern("HH:mm"));
                }
                result.put("startTime", startTimeStr);
                result.put("endTime", endTimeStr);
                result.put("teamName", enrichedOrder.getTeamName());
                result.put("contactInfo", enrichedOrder.getContactInfo());
                result.put("maxParticipants", enrichedOrder.getMaxParticipants());
                result.put("currentParticipants", enrichedOrder.getCurrentParticipants());
                result.put("description", enrichedOrder.getDescription());
                result.put("pricePerTeam", enrichedOrder.getPricePerTeam());
                result.put("status", enrichedOrder.getStatus());
                result.put("creatorUsername", enrichedOrder.getCreatorUsername());
                result.put("orderNo", enrichedOrder.getOrderNo());

                String createdAtStr = enrichedOrder.getCreatedAt() != null ? enrichedOrder.getCreatedAt().format(java.time.format.DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")) : null;
                result.put("createdAt", createdAtStr);
                result.put("updatedAt", enrichedOrder.getUpdatedAt());
                result.put("orderId", enrichedOrder.getOrderId());

                // 获取主订单状态
                if (enrichedOrder.getOrderId() != null) {
                    Optional<Order> mainOrder = orderRepository.findById(enrichedOrder.getOrderId());
                    if (mainOrder.isPresent()) {
                        result.put("orderStatus", mainOrder.get().getStatus().name());
                        result.put("orderStatusDescription", mainOrder.get().getStatus().getDescription());
                    }
                }

                result.put("autoApprove", enrichedOrder.getAutoApprove());
                result.put("allowExit", enrichedOrder.getAllowExit());
                result.put("venueLocation", enrichedOrder.getVenueLocation());
                result.put("totalPrice", enrichedOrder.getTotalPrice());
                result.put("perTeamPrice", enrichedOrder.getPricePerTeam());

                logger.info("通过主订单ID找到拼场订单，返回拼场订单ID: {}", enrichedOrder.getId());
                return ResponseEntity.ok(result);
            } else {
                logger.warn("未找到主订单ID为{}的拼场订单", orderId);
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(new MessageResponse("未找到对应的拼场订单"));
            }
        } catch (Exception e) {
            logger.error("通过主订单ID获取拼场订单详情失败: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new MessageResponse("获取拼场订单详情失败: " + e.getMessage()));
        }
    }

    /**
     * 获取所有拼场订单列表
     */
    @GetMapping
    public ResponseEntity<?> getAllSharingOrders(
            @RequestParam(name = "page", defaultValue = "1") int page,
            @RequestParam(name = "pageSize", defaultValue = "10") int pageSize,
            @RequestParam(name = "all", defaultValue = "false") boolean all) {
        try {
            logger.info("获取所有拼场订单列表，页码: {}, 页大小: {}, 获取全部: {}", page, pageSize, all);
            
            // 参数验证
            if (page < 1) {
                page = 1;
            }
            if (pageSize < 1) {
                pageSize = 10;
            }
            List<SharingOrder> allOrders = sharingOrderService.getAllSharingOrders();
            
            // 为每个拼场订单添加场馆位置信息
            List<SharingOrder> enrichedOrders = allOrders.stream()
                .map(this::enrichSharingOrderWithVenueInfo)
                .collect(Collectors.toList());
            
            // 如果请求全部数据，则不分页
            if (all) {
                Map<String, Object> response = new HashMap<>();
                response.put("list", enrichedOrders);
                response.put("total", enrichedOrders.size());
                logger.info("返回所有拼场订单数量: {}", enrichedOrders.size());
                return ResponseEntity.ok(response);
            }
            
            // 手动分页
            int totalElements = enrichedOrders.size();
            int totalPages = (int) Math.ceil((double) totalElements / pageSize);
            int startIndex = (page - 1) * pageSize;
            int endIndex = Math.min(startIndex + pageSize, totalElements);
            
            List<SharingOrder> pagedOrders = startIndex < totalElements ? 
                enrichedOrders.subList(startIndex, endIndex) : new ArrayList<>();
            
            // 构建分页响应
            Map<String, Object> response = new HashMap<>();
            response.put("list", pagedOrders);
            
            Map<String, Object> pagination = new HashMap<>();
            pagination.put("currentPage", page);
            pagination.put("pageSize", pageSize);
            pagination.put("totalElements", totalElements);
            pagination.put("totalPages", totalPages);
            pagination.put("hasNext", page < totalPages);
            pagination.put("hasPrevious", page > 1);
            response.put("pagination", pagination);
            
            logger.info("返回所有拼场订单数量: {}, 总数: {}, 当前页: {}/{}", pagedOrders.size(), totalElements, page, totalPages);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            logger.error("获取所有拼场订单列表失败: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new MessageResponse("获取所有拼场订单列表失败: " + e.getMessage()));
        }
    }
    
    /**
     * 获取可加入的拼场订单列表
     */
    @GetMapping("/joinable")
    public ResponseEntity<?> getJoinableSharingOrders(
            @RequestParam(name = "page", defaultValue = "1") int page,
            @RequestParam(name = "pageSize", defaultValue = "10") int pageSize) {
        try {
            logger.info("获取可加入的拼场订单列表，页码: {}, 页大小: {}", page, pageSize);
            List<SharingOrder> allJoinableOrders = sharingOrderService.getJoinableSharingOrders();
            
            // 为每个拼场订单添加场馆位置信息
            List<SharingOrder> enrichedOrders = allJoinableOrders.stream()
                .map(this::enrichSharingOrderWithVenueInfo)
                .collect(Collectors.toList());
            
            // 手动分页
            int totalElements = enrichedOrders.size();
            int totalPages = (int) Math.ceil((double) totalElements / pageSize);
            int startIndex = (page - 1) * pageSize;
            int endIndex = Math.min(startIndex + pageSize, totalElements);
            
            List<SharingOrder> pagedOrders = startIndex < totalElements ? 
                enrichedOrders.subList(startIndex, endIndex) : new ArrayList<>();
            
            // 构建分页响应
            Map<String, Object> response = new HashMap<>();
            response.put("list", pagedOrders);
            
            Map<String, Object> pagination = new HashMap<>();
            pagination.put("currentPage", page);
            pagination.put("pageSize", pageSize);
            pagination.put("totalElements", totalElements);
            pagination.put("totalPages", totalPages);
            pagination.put("hasNext", page < totalPages);
            pagination.put("hasPrevious", page > 1);
            response.put("pagination", pagination);
            
            logger.info("返回拼场订单数量: {}, 总数: {}, 当前页: {}/{}", pagedOrders.size(), totalElements, page, totalPages);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            logger.error("获取可加入的拼场订单列表失败: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new MessageResponse("获取可加入的拼场订单列表失败: " + e.getMessage()));
        }
    }
    
    /**
     * 获取指定场馆可加入的拼场订单列表
     */
    @GetMapping("/joinable/venue/{venueId}")
    public ResponseEntity<?> getJoinableSharingOrdersByVenueId(@PathVariable Long venueId) {
        try {
            List<SharingOrder> joinableOrders = sharingOrderService.getJoinableSharingOrdersByVenueId(venueId);
            List<SharingOrder> enrichedOrders = joinableOrders.stream()
                .map(this::enrichSharingOrderWithVenueInfo)
                .collect(Collectors.toList());
            return ResponseEntity.ok(enrichedOrders);
        } catch (Exception e) {
            logger.error("获取指定场馆可加入的拼场订单列表失败: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new MessageResponse("获取指定场馆可加入的拼场订单列表失败: " + e.getMessage()));
        }
    }
    
    /**
     * 获取指定日期可加入的拼场订单列表
     */
    @GetMapping("/joinable/date/{date}")
    public ResponseEntity<?> getJoinableSharingOrdersByDate(
            @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        try {
            List<SharingOrder> joinableOrders = sharingOrderService.getJoinableSharingOrdersByDate(date);
            List<SharingOrder> enrichedOrders = joinableOrders.stream()
                .map(this::enrichSharingOrderWithVenueInfo)
                .collect(Collectors.toList());
            return ResponseEntity.ok(enrichedOrders);
        } catch (Exception e) {
            logger.error("获取指定日期可加入的拼场订单列表失败: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new MessageResponse("获取指定日期可加入的拼场订单列表失败: " + e.getMessage()));
        }
    }
    
    /**
     * 获取指定场馆和日期可加入的拼场订单列表
     */
    @GetMapping("/joinable/venue/{venueId}/date/{date}")
    public ResponseEntity<?> getJoinableSharingOrdersByVenueIdAndDate(
            @PathVariable Long venueId,
            @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        try {
            List<SharingOrder> joinableOrders = sharingOrderService.getJoinableSharingOrdersByVenueIdAndDate(venueId, date);
            List<SharingOrder> enrichedOrders = joinableOrders.stream()
                .map(this::enrichSharingOrderWithVenueInfo)
                .collect(Collectors.toList());
            return ResponseEntity.ok(enrichedOrders);
        } catch (Exception e) {
            logger.error("获取指定场馆和日期可加入的拼场订单列表失败: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new MessageResponse("获取指定场馆和日期可加入的拼场订单列表失败: " + e.getMessage()));
        }
    }
    
    /**
     * 获取当前用户创建的拼场订单列表
     */
    @GetMapping("/my-created")
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<?> getMyCreatedSharingOrders() {
        try {
            String username = getCurrentUsername();
            logger.info("获取用户 {} 创建的拼场订单", username);
            List<SharingOrder> myOrders = sharingOrderService.getSharingOrdersByCreator(username);
            logger.info("用户 {} 创建的拼场订单数量: {}", username, myOrders.size());

            // 转换为前端需要的格式，添加缺失的字段
            List<Map<String, Object>> enrichedOrders = myOrders.stream()
                .map(order -> {
                    Map<String, Object> orderMap = new HashMap<>();

                    // 基本信息
                    orderMap.put("id", order.getId());
                    orderMap.put("orderNo", order.getOrderNo());
                    orderMap.put("venueName", order.getVenueName());
                    orderMap.put("venueId", order.getVenueId());
                    orderMap.put("status", order.getStatus().name());
                    orderMap.put("createdAt", order.getCreatedAt());
                    orderMap.put("updatedAt", order.getUpdatedAt());

                    // 拼场相关信息
                    orderMap.put("teamName", order.getTeamName());
                    orderMap.put("contactInfo", order.getContactInfo());
                    orderMap.put("currentParticipants", order.getCurrentParticipants());
                    orderMap.put("maxParticipants", order.getMaxParticipants());
                    orderMap.put("description", order.getDescription());

                    // 价格信息 - 添加前端需要的字段
                    orderMap.put("totalPrice", order.getTotalPrice());
                    orderMap.put("pricePerTeam", order.getPricePerTeam());
                    orderMap.put("paymentAmount", order.getPricePerTeam()); // 前端需要的字段

                    // 时间信息 - 添加前端需要的字段
                    orderMap.put("bookingDate", order.getBookingDate());
                    if (order.getStartTime() != null) {
                        orderMap.put("startTime", order.getStartTime().toString());

                        // 如果没有结束时间，默认+2小时
                        if (order.getEndTime() != null) {
                            orderMap.put("endTime", order.getEndTime().toString());
                        } else {
                            orderMap.put("endTime", order.getStartTime().plusHours(2).toString());
                        }
                    }

                    // 场馆位置信息
                    orderMap = enrichSharingOrderMapWithVenueInfo(orderMap, order.getVenueId());

                    return orderMap;
                })
                .collect(Collectors.toList());

            return ResponseEntity.ok(enrichedOrders);
        } catch (Exception e) {
            logger.error("获取我创建的拼场订单列表失败: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new MessageResponse("获取我创建的拼场订单列表失败: " + e.getMessage()));
        }
    }
    
    /**
     * 加入拼场订单
     */
    @PostMapping("/{id}/join")
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<?> joinSharingOrder(@PathVariable Long id) {
        try {
            logger.info("=== 开始处理加入拼场订单请求 ===");
            logger.info("拼场订单ID: {}", id);
            
            String username = getCurrentUsername();
            SharingOrder updatedOrder = sharingOrderService.joinSharingOrder(id, username);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "加入拼场成功");
            response.put("order", updatedOrder);
            
            logger.info("加入拼场成功 - 订单ID: {}, 当前参与人数: {}/{}", 
                    updatedOrder.getId(), updatedOrder.getCurrentParticipants(), updatedOrder.getMaxParticipants());
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            logger.error("加入拼场订单失败: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new MessageResponse("加入拼场订单失败: " + e.getMessage()));
        } finally {
            logger.info("=== 加入拼场订单请求处理结束 ===");
        }
    }

    /**
     * 申请加入拼场订单（需要支付）
     * 规则：
     * - 非自动同意：仅创建拼场申请（PENDING），不创建支付订单；待发起者同意后再进入待支付。
     * - 自动同意：创建拼场申请并直接进入待支付（APPROVED_PENDING_PAYMENT）。
     */
    @PostMapping("/{id}/apply-join")
    public ResponseEntity<?> applyJoinSharingOrder(@PathVariable Long id) {
        try {
            logger.info("=== 开始处理申请加入拼场订单请求 ===");
            logger.info("拼场订单ID: {}", id);

            String username = getCurrentUsername();

            // 获取拼场订单信息
            Optional<SharingOrder> sharingOrderOpt = sharingOrderService.getSharingOrderById(id);
            if (!sharingOrderOpt.isPresent()) {
                return ResponseEntity.badRequest()
                        .body(new MessageResponse("拼场订单不存在"));
            }

            SharingOrder sharingOrder = sharingOrderOpt.get();

            // 检查是否可以加入
            if (sharingOrder.getStatus() != SharingOrder.SharingOrderStatus.OPEN) {
                return ResponseEntity.badRequest()
                        .body(new MessageResponse("该拼场订单不可加入"));
            }

            if (sharingOrder.getMaxParticipants() != null &&
                sharingOrder.getCurrentParticipants() >= sharingOrder.getMaxParticipants()) {
                return ResponseEntity.badRequest()
                        .body(new MessageResponse("该拼场订单已满"));
            }

            if (sharingRequestRepository.existsBySharingOrderIdAndApplicantUsernameAndStatusNotIn(
                id,
                username,
                Arrays.asList(
                    SharingRequest.RequestStatus.CANCELLED,
                    SharingRequest.RequestStatus.REJECTED,
                    SharingRequest.RequestStatus.TIMEOUT_CANCELLED
                )
            )) {
                return ResponseEntity.badRequest()
                    .body(new MessageResponse("您已提交过该拼场的申请，请勿重复申请"));
            }

            // 检查用户是否已有预约
            boolean hasBooking = timeSlotService.hasUserBookingAtTime(
                    username,
                    sharingOrder.getBookingDate(),
                    sharingOrder.getStartTime(),
                    sharingOrder.getEndTime());

            if (hasBooking) {
                return ResponseEntity.badRequest()
                        .body(new MessageResponse("您在该时间段已有预约"));
            }

            // 创建对应的拼场申请记录
            SharingRequest sharingRequest = SharingRequest.createRequestForSharingOrder(
                id, username, "加入拼场", "", 1, "申请加入拼场订单"
            );
            sharingRequest.setPaymentAmount(sharingOrder.getPricePerTeam());

            if (sharingOrder.getOrderId() == null) {
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new MessageResponse("拼场主订单缺失，无法提交申请"));
            }
            sharingRequest.setOrderId(sharingOrder.getOrderId());

            boolean autoApprove = Boolean.TRUE.equals(sharingOrder.getAutoApprove());
            if (autoApprove) {
                sharingRequest.setPaymentDeadline(LocalDateTime.now().plusHours(2));
                sharingRequest.setStatus(SharingRequest.RequestStatus.APPROVED_PENDING_PAYMENT);
            } else {
                sharingRequest.setStatus(SharingRequest.RequestStatus.PENDING);
            }

            SharingRequest savedRequest = sharingRequestRepository.save(sharingRequest);
            logger.info("创建拼场申请记录成功: ID={}, 状态={}",
                savedRequest.getId(), savedRequest.getStatus());

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", autoApprove ? "申请加入成功，请完成支付" : "申请已提交，等待对方同意");
            response.put("sharingOrder", sharingOrder);
            response.put("needPayment", autoApprove);
            response.put("requestId", savedRequest.getId());

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            logger.error("申请加入拼场订单失败: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new MessageResponse("申请加入失败: " + e.getMessage()));
        } finally {
            logger.info("=== 申请加入拼场订单请求处理结束 ===");
        }
    }

    /**
     * 取消加入拼场订单
     */
    @PostMapping("/{id}/cancel-join")
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<?> cancelJoinSharingOrder(@PathVariable Long id) {
        try {
            logger.info("=== 开始处理取消加入拼场订单请求 ===");
            logger.info("拼场订单ID: {}", id);
            
            String username = getCurrentUsername();
            SharingOrder updatedOrder = sharingOrderService.cancelJoinSharingOrder(id, username);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "取消加入拼场成功");
            response.put("order", updatedOrder);
            
            logger.info("取消加入拼场成功 - 订单ID: {}, 当前参与人数: {}/{}", 
                    updatedOrder.getId(), updatedOrder.getCurrentParticipants(), updatedOrder.getMaxParticipants());
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            logger.error("取消加入拼场订单失败: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new MessageResponse("取消加入拼场订单失败: " + e.getMessage()));
        } finally {
            logger.info("=== 取消加入拼场订单请求处理结束 ===");
        }
    }
    
    /**
     * 确认拼场订单
     */
    @PostMapping("/{id}/confirm")
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<?> confirmSharingOrder(@PathVariable Long id) {
        try {
            logger.info("=== 开始处理确认拼场订单请求 ===");
            logger.info("拼场订单ID: {}", id);
            
            // 检查当前用户是否为订单创建者
            String username = getCurrentUsername();
            Optional<SharingOrder> orderOpt = sharingOrderService.getSharingOrderById(id);
            
            if (!orderOpt.isPresent()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(new MessageResponse("拼场订单不存在"));
            }
            
            SharingOrder order = orderOpt.get();
            if (!order.getCreatorUsername().equals(username)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(new MessageResponse("只有订单创建者才能确认拼场订单"));
            }
            
            SharingOrder updatedOrder = sharingOrderService.confirmSharingOrder(id);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "确认拼场订单成功");
            response.put("order", updatedOrder);
            
            logger.info("确认拼场订单成功 - 订单ID: {}, 状态: {}", updatedOrder.getId(), updatedOrder.getStatus());
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            logger.error("确认拼场订单失败: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new MessageResponse("确认拼场订单失败: " + e.getMessage()));
        } finally {
            logger.info("=== 确认拼场订单请求处理结束 ===");
        }
    }
    
    /**
     * 取消拼场订单
     */
    @PostMapping("/{id}/cancel")
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<?> cancelSharingOrder(@PathVariable Long id) {
        try {
            logger.info("=== 开始处理取消拼场订单请求 ===");
            logger.info("拼场订单ID: {}", id);
            
            // 检查当前用户是否为订单创建者
            String username = getCurrentUsername();
            Optional<SharingOrder> orderOpt = sharingOrderService.getSharingOrderById(id);
            
            if (!orderOpt.isPresent()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(new MessageResponse("拼场订单不存在"));
            }
            
            SharingOrder order = orderOpt.get();
            if (!order.getCreatorUsername().equals(username)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(new MessageResponse("只有订单创建者才能取消拼场订单"));
            }
            
            SharingOrder updatedOrder = sharingOrderService.cancelSharingOrder(id);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "取消拼场订单成功");
            response.put("order", updatedOrder);
            
            logger.info("取消拼场订单成功 - 订单ID: {}, 状态: {}", updatedOrder.getId(), updatedOrder.getStatus());
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            logger.error("取消拼场订单失败: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new MessageResponse("取消拼场订单失败: " + e.getMessage()));
        } finally {
            logger.info("=== 取消拼场订单请求处理结束 ===");
        }
    }
    
    /**
     * 根据订单号查询拼场订单
     */
    @GetMapping("/order-no/{orderNo}")
    public ResponseEntity<?> getSharingOrderByOrderNo(@PathVariable String orderNo) {
        try {
            SharingOrder sharingOrder = sharingOrderService.getSharingOrderByOrderNo(orderNo);
            if (sharingOrder != null) {
                return ResponseEntity.ok(sharingOrder);
            } else {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(new MessageResponse("拼场订单不存在"));
            }
        } catch (Exception e) {
            logger.error("根据订单号查询拼场订单失败: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new MessageResponse("根据订单号查询拼场订单失败: " + e.getMessage()));
        }
    }
    
    /**
     * 更新拼场设置
     */
    @PutMapping("/{id}/settings")
    public ResponseEntity<?> updateSharingSettings(@PathVariable Long id, @RequestBody Map<String, Object> settings) {
        try {
            logger.info("=== 开始处理更新拼场设置请求 ===");
            logger.info("拼场订单ID: {}", id);
            logger.info("接收到的设置参数: {}", settings);
            
            String currentUsername = getCurrentUsername();
            logger.info("当前用户: {}", currentUsername);
            
            // 获取拼场订单
            Optional<SharingOrder> sharingOrderOpt = sharingOrderService.getSharingOrderById(id);
            if (!sharingOrderOpt.isPresent()) {
                logger.warn("拼场订单不存在: {}", id);
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(new MessageResponse("拼场订单不存在"));
            }
            
            SharingOrder sharingOrder = sharingOrderOpt.get();
            logger.info("找到拼场订单 - 创建者: {}, 当前状态: {}", 
                    sharingOrder.getCreatorUsername(), sharingOrder.getStatus());
            
            // 检查权限：只有创建者可以更新设置
            if (!sharingOrder.getCreatorUsername().equals(currentUsername)) {
                logger.warn("权限检查失败 - 创建者: {}, 当前用户: {}", 
                        sharingOrder.getCreatorUsername(), currentUsername);
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(new MessageResponse("无权限更新此拼场设置"));
            }
            
            logger.info("权限检查通过，开始更新设置");
            
            // 记录更新前的设置
            logger.info("更新前设置 - autoApprove: {}, allowExit: {}", 
                    sharingOrder.getAutoApprove(), sharingOrder.getAllowExit());
            
            // 更新设置
            if (settings.containsKey("autoApprove")) {
                Boolean autoApprove = (Boolean) settings.get("autoApprove");
                sharingOrder.setAutoApprove(autoApprove);
                logger.info("更新 autoApprove: {}", autoApprove);
            }
            if (settings.containsKey("allowExit")) {
                Boolean allowExit = (Boolean) settings.get("allowExit");
                sharingOrder.setAllowExit(allowExit);
                logger.info("更新 allowExit: {}", allowExit);
            }
            
            // 保存更新
            logger.info("开始保存更新到数据库");
            SharingOrder updatedOrder = sharingOrderService.updateSharingOrder(sharingOrder);
            
            // 记录更新后的设置
            logger.info("更新后设置 - autoApprove: {}, allowExit: {}", 
                    updatedOrder.getAutoApprove(), updatedOrder.getAllowExit());
            
            logger.info("拼场设置更新成功 - 订单ID: {}", updatedOrder.getId());
            return ResponseEntity.ok(updatedOrder);
            
        } catch (Exception e) {
            logger.error("更新拼场设置失败: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new MessageResponse("更新拼场设置失败: " + e.getMessage()));
        } finally {
            logger.info("=== 更新拼场设置请求处理结束 ===");
        }
    }
}
