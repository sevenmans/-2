package com.example.gymbooking.controller;

import com.example.gymbooking.model.Order;
import com.example.gymbooking.model.SharingOrder;
import com.example.gymbooking.model.SharingRequest;
import com.example.gymbooking.repository.OrderRepository;
import com.example.gymbooking.repository.SharingOrderRepository;
import com.example.gymbooking.repository.SharingRequestRepository;
import com.example.gymbooking.service.OrderStatusService;
import com.example.gymbooking.security.services.UserDetailsImpl;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/order")
@CrossOrigin(origins = "*")
public class OrderController {
    @Autowired
    private OrderRepository repository;
    
    @Autowired
    private OrderStatusService orderStatusService;

    @Autowired
    private SharingRequestRepository sharingRequestRepository;

    @Autowired
    private SharingOrderRepository sharingOrderRepository;

    @PostMapping
    public Order submitOrder(@RequestBody Order order) {
        return repository.save(order);
    }

    @GetMapping("/{id}")
    public Order getOrder(@PathVariable Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Order not found"));
    }

    @GetMapping
    public List<Order> getOrdersByUser(@RequestParam String username) {
        return repository.findByUsername(username);
    }

    @GetMapping("/all")
    public List<Order> getAllOrders() {
        return repository.findAll();
    }

    @PutMapping("/{id}/cancel")
    public Order cancelOrder(@PathVariable Long id) {
        Order order = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Order not found"));

        if (order.getStatus() != Order.OrderStatus.CANCELLED && 
            order.getStatus() != Order.OrderStatus.COMPLETED && 
            order.getStatus() != Order.OrderStatus.EXPIRED) {
            order.setStatus(Order.OrderStatus.CANCELLED);
            return repository.save(order);
        }
        return order;
    }
    
    @PostMapping("/{id}/expire")
    public ResponseEntity<?> expireOrder(@PathVariable Long id) {
        try {
            boolean success = orderStatusService.transitionOrderStatus(id, Order.OrderStatus.EXPIRED, "手动过期测试");
            if (success) {
                return ResponseEntity.ok().body("{\"message\": \"订单已过期\", \"success\": true}");
            } else {
                return ResponseEntity.badRequest().body("{\"message\": \"订单过期失败\", \"success\": false}");
            }
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("{\"message\": \"" + e.getMessage() + "\", \"success\": false}");
        }
    }

    /**
     * 用户完成订单
     * 用户可以将自己已核销(VERIFIED)的订单标记为已完成(COMPLETED)
     */
    @PostMapping("/{id}/complete")
    public ResponseEntity<?> completeOrder(@PathVariable Long id) {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            String currentUsername = null;
            if (authentication != null && authentication.getPrincipal() instanceof UserDetailsImpl) {
                currentUsername = ((UserDetailsImpl) authentication.getPrincipal()).getUsername();
            }
            if (currentUsername == null || currentUsername.trim().isEmpty()) {
                return ResponseEntity.status(401).body(Map.of(
                    "success", false,
                    "message", "用户未登录或登录信息无效"
                ));
            }

            Order order;
            if (id < 0) {
                SharingRequest request = sharingRequestRepository.findById(-id)
                        .orElseThrow(() -> new RuntimeException("虚拟订单对应申请不存在"));
                if (!currentUsername.equals(request.getApplicantUsername())) {
                    return ResponseEntity.status(403).body(Map.of(
                        "success", false,
                        "message", "无权限完成该虚拟订单"
                    ));
                }
                if (request.getStatus() == SharingRequest.RequestStatus.PENDING
                        || request.getStatus() == SharingRequest.RequestStatus.REJECTED
                        || request.getStatus() == SharingRequest.RequestStatus.CANCELLED
                        || request.getStatus() == SharingRequest.RequestStatus.TIMEOUT_CANCELLED) {
                    return ResponseEntity.badRequest().body(Map.of(
                        "success", false,
                        "message", "该虚拟订单当前状态不允许完成"
                    ));
                }
                order = resolveMainOrderByRequest(request);
            } else {
                order = repository.findById(id)
                        .orElseThrow(() -> new RuntimeException("订单不存在"));
                if (!currentUsername.equals(order.getUsername())) {
                    return ResponseEntity.status(403).body(Map.of(
                        "success", false,
                        "message", "无权限完成该订单"
                    ));
                }
            }

            if (order.getStatus() != Order.OrderStatus.VERIFIED) {
                return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", "订单状态不是已核销，无法完成订单"
                ));
            }

            order.setStatus(Order.OrderStatus.COMPLETED);
            Order updatedOrder = repository.save(order);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "订单已完成");
            response.put("order", updatedOrder);
            response.put("completionTime", LocalDateTime.now());

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "message", "完成订单失败: " + e.getMessage()
            ));
        }
    }

    private Order resolveMainOrderByRequest(SharingRequest request) {
        Long orderId = request.getOrderId();
        if (orderId == null && request.getSharingOrderId() != null) {
            SharingOrder sharingOrder = sharingOrderRepository.findById(request.getSharingOrderId())
                    .orElseThrow(() -> new RuntimeException("拼场订单不存在"));
            orderId = sharingOrder.getOrderId();
        }
        if (orderId == null) {
            throw new RuntimeException("虚拟订单未关联主订单");
        }
        return repository.findById(orderId)
                .orElseThrow(() -> new RuntimeException("虚拟订单关联主订单不存在"));
    }
}
