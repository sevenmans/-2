package com.example.gymbooking.controller;

import com.example.gymbooking.model.Order;
import com.example.gymbooking.model.SharingRequest;
import com.example.gymbooking.model.SharingOrder;
import com.example.gymbooking.repository.OrderRepository;
import com.example.gymbooking.repository.SharingRequestRepository;
import com.example.gymbooking.repository.SharingOrderRepository;
import com.example.gymbooking.security.services.UserDetailsImpl;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/shared")
@CrossOrigin(origins = "*")
public class SharingController {

    private static final Logger logger = LoggerFactory.getLogger(SharingController.class);
    
    @Autowired
    private SharingRequestRepository sharingRequestRepository;
    
    @Autowired
    private OrderRepository orderRepository;
    
    @Autowired
    private SharingOrderRepository sharingOrderRepository;
    
    /**
     * 处理拼场申请（同意/拒绝）
     */
    @PutMapping("/requests/{requestId}")
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
            
            // 安全获取action参数
            Object actionObj = request.get("action");
            if (actionObj == null) {
                Map<String, Object> errorResponse = new HashMap<>();
                errorResponse.put("success", false);
                errorResponse.put("message", "缺少action参数");
                return ResponseEntity.badRequest().body(errorResponse);
            }
            String action = actionObj.toString(); // "approve" 或 "reject"
            
            Object responseMessageObj = request.getOrDefault("responseMessage", "");
            String responseMessage = responseMessageObj != null ? responseMessageObj.toString() : "";
            
            if ("approve".equals(action)) {
                // 首先检查发起者是否已经支付
                if (order.getStatus() != Order.OrderStatus.OPEN) {
                    Map<String, Object> errorResponse = new HashMap<>();
                    errorResponse.put("success", false);
                    errorResponse.put("message", "发起者尚未支付，无法批准申请。请先完成支付后再处理申请。");
                    errorResponse.put("needPayment", true);  // 标识需要支付
                    errorResponse.put("orderId", order.getId());  // 提供订单ID用于跳转
                    errorResponse.put("orderStatus", order.getStatus().name());  // 提供订单状态
                    return ResponseEntity.badRequest().body(errorResponse);
                }

                // 检查是否已有其他待支付的申请
                List<SharingRequest> pendingPaymentRequests = sharingRequestRepository
                    .findByOrderIdAndStatus(order.getId(), SharingRequest.RequestStatus.APPROVED_PENDING_PAYMENT);
                if (!pendingPaymentRequests.isEmpty()) {
                    Map<String, Object> errorResponse = new HashMap<>();
                    errorResponse.put("success", false);
                    errorResponse.put("message", "已有其他申请正在等待支付，请等待处理完成");
                    return ResponseEntity.badRequest().body(errorResponse);
                }

                // 批准申请，但申请者需要支付
                sharingRequest.setStatus(SharingRequest.RequestStatus.APPROVED_PENDING_PAYMENT);

                // 设置支付截止时间（30分钟）
                sharingRequest.setPaymentDeadline(LocalDateTime.now().plusMinutes(30));

                // ✅ 修复：获取对应的拼场订单，使用正确的每队价格
                SharingOrder sharingOrder = sharingOrderRepository.findByOrderId(order.getId());
                Double paymentAmount;
                if (sharingOrder != null) {
                    paymentAmount = sharingOrder.getPricePerTeam();
                    logger.info("使用拼场订单每队价格: {}", paymentAmount);
                } else {
                    // ✅ 修复：如果找不到拼场订单，使用原订单总价（原订单总价已经是每队价格）
                    paymentAmount = order.getTotalPrice();
                    logger.warn("未找到拼场订单，使用原订单总价（每队价格）: {}", paymentAmount);
                }
                sharingRequest.setPaymentAmount(paymentAmount);

                // 生成支付订单号
                sharingRequest.setPaymentOrderNo("PAY_" + System.currentTimeMillis() + "_" + sharingRequest.getApplicantUsername());

                // 更新发起者订单状态为等待申请者支付
                order.setStatus(Order.OrderStatus.APPROVED_PENDING_PAYMENT);

                logger.info("拼场申请被批准，申请者: {}, 需支付金额: {}, 支付截止时间: {}, 支付订单号: {}",
                           sharingRequest.getApplicantUsername(),
                           sharingRequest.getPaymentAmount(),
                           sharingRequest.getPaymentDeadline(),
                           sharingRequest.getPaymentOrderNo());

                logger.info("拼场申请被批准，发起者订单ID: {}, 等待申请者支付，支付截止时间: {}",
                           order.getId(), sharingRequest.getPaymentDeadline());

                // SharingOrder保持开放状态，等待申请者支付
                if (sharingOrder != null) {
                    // 保持OPEN状态，等待申请者支付
                    logger.info("拼场申请已批准，等待申请者在30分钟内完成支付");
                }
                
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
    @GetMapping("/my-requests")
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
            
            // 获取用户的申请列表
            List<SharingRequest> requests;
            if (status != null && !status.trim().isEmpty()) {
                try {
                    SharingRequest.RequestStatus requestStatus = SharingRequest.RequestStatus.valueOf(status.toUpperCase());
                    requests = sharingRequestRepository.findByApplicantUsernameAndStatus(username, requestStatus);
                } catch (IllegalArgumentException e) {
                    requests = sharingRequestRepository.findByApplicantUsername(username);
                }
            } else {
                requests = sharingRequestRepository.findByApplicantUsername(username);
            }
            
            // 组装完整的申请信息
            List<Map<String, Object>> requestsWithOrderInfo = new ArrayList<>();
            for (SharingRequest request : requests) {
                Map<String, Object> requestData = new HashMap<>();
                
                // 申请基本信息
                requestData.put("id", request.getId());
                requestData.put("status", request.getStatus().name());
                requestData.put("createdAt", request.getCreatedAt());
                requestData.put("updatedAt", request.getUpdatedAt());
                requestData.put("responseMessage", request.getResponseMessage());

                // 暂时设置拼场订单ID，稍后会更新
                requestData.put("sharingOrderId", request.getSharingOrderId());
                
                // 申请人信息
                requestData.put("applicantName", request.getApplicantUsername());
                requestData.put("applicantTeamName", request.getApplicantTeamName());
                requestData.put("applicantContact", request.getApplicantContact());
                requestData.put("participantsCount", request.getParticipantsCount());
                requestData.put("message", request.getMessage());
                
                // 支付相关信息
                requestData.put("paymentAmount", request.getPaymentAmount());
                requestData.put("isPaid", request.getIsPaid());
                requestData.put("paidAt", request.getPaidAt());
                requestData.put("paymentDeadline", request.getPaymentDeadline());

                // 获取对应的订单信息
                Long orderId = request.getOrderId();

                // 更新拼场订单ID，用于跳转详情页面
                Long sharingOrderId = request.getSharingOrderId();
                if (sharingOrderId == null && orderId != null) {
                    // 如果申请记录中没有拼场订单ID，通过原始订单ID查找
                    SharingOrder sharingOrder = sharingOrderRepository.findByOrderId(orderId);
                    if (sharingOrder != null) {
                        sharingOrderId = sharingOrder.getId();
                    }
                }
                requestData.put("sharingOrderId", sharingOrderId);

                if (orderId != null) {
                    Order order = orderRepository.findById(orderId).orElse(null);
                    if (order != null) {
                        requestData.put("orderId", order.getId());
                        requestData.put("venueName", order.getVenueName());
                        requestData.put("venueId", order.getVenueId());
                        requestData.put("teamName", order.getTeamName());
                        requestData.put("contactInfo", order.getContactInfo());
                        requestData.put("description", order.getDescription());
                        requestData.put("bookingTime", order.getBookingTime());
                        requestData.put("totalPrice", order.getTotalPrice());

                        // 拼场订单的参与人数逻辑：总是2个队伍
                        requestData.put("maxParticipants", 2);

                        // 计算当前参与队伍数：创建者(1) + 已支付的申请者数量
                        long paidApplicants = sharingRequestRepository.findByOrderIdAndStatus(
                            order.getId(), SharingRequest.RequestStatus.PAID).size();

                        // 对于当前申请记录，如果是PAID状态，则显示2/2，否则显示1/2
                        if (request.getStatus() == SharingRequest.RequestStatus.PAID) {
                            requestData.put("currentParticipants", 2); // 拼场成功
                        } else {
                            requestData.put("currentParticipants", 1 + (int)paidApplicants); // 实际参与人数
                        }

                        // 添加前端需要的时间字段
                        requestData.put("bookingDate", order.getBookingDate());
                        if (order.getBookingTime() != null) {
                            requestData.put("startTime", order.getBookingTime().toLocalTime().toString());

                            // 如果没有结束时间，默认+2小时
                            if (order.getEndDateTime() != null) {
                                requestData.put("endTime", order.getEndDateTime().toLocalTime().toString());
                            } else {
                                // 默认结束时间为开始时间+2小时
                                requestData.put("endTime", order.getBookingTime().toLocalTime().plusHours(2).toString());
                            }
                        }

                        // 添加场馆位置信息
                        if (order.getVenueId() != null) {
                            // 这里可以添加获取场馆位置的逻辑
                            requestData.put("venueLocation", "位置信息"); // 暂时使用默认值
                        }

                        // 计算人均价格
                        if (order.getMaxParticipants() != null && order.getMaxParticipants() > 0) {
                            double pricePerPerson = order.getTotalPrice() / order.getMaxParticipants();
                            requestData.put("pricePerPerson", Math.round(pricePerPerson * 100.0) / 100.0);
                        } else {
                            requestData.put("pricePerPerson", order.getTotalPrice());
                        }
                    }
                }
                
                requestsWithOrderInfo.add(requestData);
            }
            
            // 按创建时间倒序排序
            requestsWithOrderInfo.sort((a, b) -> {
                LocalDateTime timeA = (LocalDateTime) a.get("createdAt");
                LocalDateTime timeB = (LocalDateTime) b.get("createdAt");
                return timeB.compareTo(timeA);
            });
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("data", requestsWithOrderInfo);
            response.put("total", requestsWithOrderInfo.size());
            response.put("page", page);
            response.put("pageSize", pageSize);
            response.put("totalBookings", requestsWithOrderInfo.size()); // 添加totalBookings字段
            
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
    @GetMapping("/received-requests")
    public ResponseEntity<Map<String, Object>> getReceivedRequests(
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
            
            // 获取当前用户创建的所有订单
            List<Order> userOrders = orderRepository.findByUsername(username);
            List<Long> orderIds = userOrders.stream().map(Order::getId).collect(Collectors.toList());
            
            // 获取这些订单的所有申请，并组装完整信息
            List<Map<String, Object>> allRequests = new ArrayList<>();
            for (Long orderId : orderIds) {
                List<SharingRequest> orderRequests = sharingRequestRepository.findByOrderId(orderId);
                Order order = userOrders.stream().filter(o -> o.getId().equals(orderId)).findFirst().orElse(null);
                
                if (order != null) {
                    for (SharingRequest request : orderRequests) {
                        Map<String, Object> requestData = new HashMap<>();
                        
                        // 申请基本信息
                        requestData.put("id", request.getId());
                        requestData.put("status", request.getStatus().name());
                        requestData.put("createdAt", request.getCreatedAt());
                        requestData.put("updatedAt", request.getUpdatedAt());
                        requestData.put("responseMessage", request.getResponseMessage());

                        // 添加拼场订单ID，用于跳转详情页面
                        Long sharingOrderId = request.getSharingOrderId();
                        if (sharingOrderId == null) {
                            // 如果申请记录中没有拼场订单ID，通过原始订单ID查找
                            SharingOrder sharingOrder = sharingOrderRepository.findByOrderId(orderId);
                            if (sharingOrder != null) {
                                sharingOrderId = sharingOrder.getId();
                            }
                        }
                        requestData.put("sharingOrderId", sharingOrderId);
                        
                        // 申请人信息
                        requestData.put("applicantName", request.getApplicantUsername());
                        requestData.put("applicantTeamName", request.getApplicantTeamName());
                        requestData.put("applicantContact", request.getApplicantContact());
                        requestData.put("participantsCount", request.getParticipantsCount());
                        requestData.put("message", request.getMessage());

                        // 支付相关信息
                        requestData.put("paymentAmount", request.getPaymentAmount());
                        requestData.put("isPaid", request.getIsPaid());
                        requestData.put("paidAt", request.getPaidAt());
                        requestData.put("paymentDeadline", request.getPaymentDeadline());

                        // 订单信息
                        requestData.put("orderId", order.getId());
                        requestData.put("venueName", order.getVenueName());
                        requestData.put("venueId", order.getVenueId());
                        requestData.put("teamName", order.getTeamName());
                        requestData.put("contactInfo", order.getContactInfo());
                        requestData.put("description", order.getDescription());
                        requestData.put("bookingTime", order.getBookingTime());
                        requestData.put("totalPrice", order.getTotalPrice());

                        // 拼场订单的参与人数逻辑：总是2个队伍
                        requestData.put("maxParticipants", 2);

                        // 计算当前参与队伍数：创建者(1) + 已支付的申请者数量
                        long paidApplicants = sharingRequestRepository.findByOrderIdAndStatus(
                            order.getId(), SharingRequest.RequestStatus.PAID).size();

                        // 对于当前申请记录，如果是PAID状态，则显示2/2，否则显示实际人数
                        if (request.getStatus() == SharingRequest.RequestStatus.PAID) {
                            requestData.put("currentParticipants", 2); // 拼场成功
                        } else {
                            requestData.put("currentParticipants", 1 + (int)paidApplicants); // 实际参与人数
                        }

                        // 添加前端需要的时间字段
                        requestData.put("bookingDate", order.getBookingDate());
                        if (order.getBookingTime() != null) {
                            requestData.put("startTime", order.getBookingTime().toLocalTime().toString());

                            // 如果没有结束时间，默认+2小时
                            if (order.getEndDateTime() != null) {
                                requestData.put("endTime", order.getEndDateTime().toLocalTime().toString());
                            } else {
                                // 默认结束时间为开始时间+2小时
                                requestData.put("endTime", order.getBookingTime().toLocalTime().plusHours(2).toString());
                            }
                        }

                        // 添加场馆位置信息
                        if (order.getVenueId() != null) {
                            requestData.put("venueLocation", "位置信息"); // 暂时使用默认值
                        }

                        // 计算人均价格
                        if (order.getMaxParticipants() != null && order.getMaxParticipants() > 0) {
                            double pricePerPerson = order.getTotalPrice() / order.getMaxParticipants();
                            requestData.put("pricePerPerson", Math.round(pricePerPerson * 100.0) / 100.0);
                        } else {
                            requestData.put("pricePerPerson", order.getTotalPrice());
                        }
                        
                        allRequests.add(requestData);
                    }
                }
            }
            
            // 根据状态过滤
            if (status != null && !status.isEmpty()) {
                String targetStatus = status.toUpperCase();
                allRequests = allRequests.stream()
                    .filter(request -> targetStatus.equals(request.get("status")))
                    .collect(Collectors.toList());
            }
            
            // 按创建时间倒序排序
            allRequests.sort((a, b) -> {
                LocalDateTime timeA = (LocalDateTime) a.get("createdAt");
                LocalDateTime timeB = (LocalDateTime) b.get("createdAt");
                return timeB.compareTo(timeA);
            });
            
            // 分页处理
            int total = allRequests.size();
            int startIndex = (page - 1) * pageSize;
            int endIndex = Math.min(startIndex + pageSize, total);
            
            List<Map<String, Object>> pagedRequests = startIndex < total ? 
                allRequests.subList(startIndex, endIndex) : new ArrayList<>();
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("data", pagedRequests);
            response.put("total", total);
            response.put("page", page);
            response.put("pageSize", pageSize);
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "获取收到的申请列表失败: " + e.getMessage());
            return ResponseEntity.badRequest().body(errorResponse);
        }
    }
    
    /**
     * 取消拼场申请
     */
    @DeleteMapping("/requests/{requestId}/cancel")
    public ResponseEntity<Map<String, Object>> cancelSharingRequest(@PathVariable Long requestId) {
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
            
            // 检查权限（只有申请人可以取消申请）
            if (!sharingRequest.getApplicantUsername().equals(username)) {
                Map<String, Object> errorResponse = new HashMap<>();
                errorResponse.put("success", false);
                errorResponse.put("message", "无权限取消该申请");
                return ResponseEntity.badRequest().body(errorResponse);
            }
            
            // 检查申请状态（待处理、已同意待支付且未支付的申请可以取消）
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
            
            // 更新申请状态为已取消
            sharingRequest.setStatus(SharingRequest.RequestStatus.CANCELLED);
            SharingRequest savedRequest = sharingRequestRepository.save(sharingRequest);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "申请已取消");
            response.put("data", savedRequest);
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "取消申请失败: " + e.getMessage());
            return ResponseEntity.badRequest().body(errorResponse);
        }
    }

}
