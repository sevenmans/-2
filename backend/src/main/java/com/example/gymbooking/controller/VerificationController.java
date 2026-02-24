package com.example.gymbooking.controller;

import com.example.gymbooking.model.Order;
import com.example.gymbooking.repository.OrderRepository;
import com.example.gymbooking.payload.response.MessageResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/verification")
@CrossOrigin(origins = "*")
public class VerificationController {
    
    @Autowired
    private OrderRepository orderRepository;
    
    /**
     * 核销订单
     * 将订单状态从CONFIRMED更新为VERIFIED
     */
    @PostMapping("/orders/{id}/verify")
    @PreAuthorize("hasRole('ROLE_VENUE_ADMIN') or hasRole('ROLE_SUPER_ADMIN')")
    public ResponseEntity<?> verifyOrder(@PathVariable Long id) {
        try {
            Order order = orderRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("订单不存在"));
            
            // 检查订单状态是否为已确认
            if (order.getStatus() != Order.OrderStatus.CONFIRMED && 
                order.getStatus() != Order.OrderStatus.PAID) {
                return ResponseEntity.badRequest()
                        .body(new MessageResponse("订单状态不是已确认或已支付，无法进行核销操作"));
            }
            
            // 更新订单状态为已核销
            order.setStatus(Order.OrderStatus.VERIFIED);
            Order updatedOrder = orderRepository.save(order);
            
            // 构建响应数据
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
            Order order = orderRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("订单不存在"));
            
            // 检查订单状态是否为已核销
            if (order.getStatus() != Order.OrderStatus.VERIFIED) {
                return ResponseEntity.badRequest()
                        .body(new MessageResponse("订单状态不是已核销，无法完成订单"));
            }
            
            // 更新订单状态为已完成
            order.setStatus(Order.OrderStatus.COMPLETED);
            Order updatedOrder = orderRepository.save(order);
            
            // 构建响应数据
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
            response.put("isVerified", order.getStatus() == Order.OrderStatus.VERIFIED || 
                               order.getStatus() == Order.OrderStatus.COMPLETED);
            response.put("isCompleted", order.getStatus() == Order.OrderStatus.COMPLETED);
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(new MessageResponse("获取核销状态失败: " + e.getMessage()));
        }
    }
}