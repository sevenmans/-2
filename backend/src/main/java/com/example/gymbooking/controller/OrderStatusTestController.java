package com.example.gymbooking.controller;

import com.example.gymbooking.model.Order;
import com.example.gymbooking.service.OrderStatusService;
import com.example.gymbooking.repository.OrderRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

/**
 * 订单状态测试控制器
 * 提供订单状态转换测试的API端点
 */
@RestController
@RequestMapping("/api/test/order-status")
@CrossOrigin(origins = "*")
public class OrderStatusTestController {
    
    private static final Logger logger = LoggerFactory.getLogger(OrderStatusTestController.class);
    
    @Autowired
    private OrderStatusService orderStatusService;
    
    @Autowired
    private OrderRepository orderRepository;
    
    /**
     * 手动转换订单状态（仅用于测试）
     */
    @PostMapping("/{orderId}/transition")
    public ResponseEntity<Map<String, Object>> transitionOrderStatus(
            @PathVariable Long orderId,
            @RequestParam String targetStatus,
            @RequestParam(required = false, defaultValue = "测试转换") String reason) {
        
        Map<String, Object> response = new HashMap<>();
        
        try {
            logger.info("测试订单状态转换: 订单ID={}, 目标状态={}, 原因={}", orderId, targetStatus, reason);
            
            // 验证目标状态
            Order.OrderStatus target;
            try {
                target = Order.OrderStatus.valueOf(targetStatus.toUpperCase());
            } catch (IllegalArgumentException e) {
                response.put("success", false);
                response.put("message", "无效的订单状态: " + targetStatus);
                return ResponseEntity.badRequest().body(response);
            }
            
            // 执行状态转换
            boolean success = orderStatusService.transitionOrderStatus(orderId, target, reason);
            
            if (success) {
                // 获取更新后的订单信息
                Optional<Order> orderOpt = orderRepository.findById(orderId);
                if (orderOpt.isPresent()) {
                    Order order = orderOpt.get();
                    response.put("success", true);
                    response.put("message", "状态转换成功");
                    response.put("orderId", orderId);
                    response.put("newStatus", order.getStatus().name());
                    response.put("statusDescription", order.getStatus().getDescription());
                } else {
                    response.put("success", false);
                    response.put("message", "订单不存在");
                }
            } else {
                response.put("success", false);
                response.put("message", "状态转换失败，请检查转换规则");
            }
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            logger.error("订单状态转换测试失败", e);
            response.put("success", false);
            response.put("message", "状态转换异常: " + e.getMessage());
            return ResponseEntity.status(500).body(response);
        }
    }
    
    /**
     * 获取订单的可用操作
     */
    @GetMapping("/{orderId}/available-actions")
    public ResponseEntity<Map<String, Object>> getAvailableActions(@PathVariable Long orderId) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            Optional<Order> orderOpt = orderRepository.findById(orderId);
            if (!orderOpt.isPresent()) {
                response.put("success", false);
                response.put("message", "订单不存在");
                return ResponseEntity.notFound().build();
            }
            
            Order order = orderOpt.get();
            var availableActions = orderStatusService.getAvailableActions(orderId);
            
            response.put("success", true);
            response.put("orderId", orderId);
            response.put("currentStatus", order.getStatus().name());
            response.put("statusDescription", order.getStatus().getDescription());
            response.put("availableActions", availableActions);
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            logger.error("获取可用操作失败", e);
            response.put("success", false);
            response.put("message", "获取可用操作异常: " + e.getMessage());
            return ResponseEntity.status(500).body(response);
        }
    }
    
    /**
     * 模拟拼场成功
     */
    @PostMapping("/{orderId}/simulate-sharing-success")
    public ResponseEntity<Map<String, Object>> simulateSharingSuccess(@PathVariable Long orderId) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            logger.info("模拟拼场成功: 订单ID={}", orderId);
            
            boolean success = orderStatusService.transitionOrderStatus(
                orderId, Order.OrderStatus.SHARING_SUCCESS, "测试模拟拼场成功");
            
            if (success) {
                response.put("success", true);
                response.put("message", "拼场成功模拟完成");
                response.put("orderId", orderId);
            } else {
                response.put("success", false);
                response.put("message", "拼场成功模拟失败");
            }
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            logger.error("模拟拼场成功失败", e);
            response.put("success", false);
            response.put("message", "模拟拼场成功异常: " + e.getMessage());
            return ResponseEntity.status(500).body(response);
        }
    }
    
    /**
     * 模拟订单超时
     */
    @PostMapping("/{orderId}/simulate-timeout")
    public ResponseEntity<Map<String, Object>> simulateTimeout(@PathVariable Long orderId) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            logger.info("模拟订单超时: 订单ID={}", orderId);
            
            boolean success = orderStatusService.transitionOrderStatus(
                orderId, Order.OrderStatus.EXPIRED, "测试模拟订单超时");
            
            if (success) {
                response.put("success", true);
                response.put("message", "订单超时模拟完成");
                response.put("orderId", orderId);
            } else {
                response.put("success", false);
                response.put("message", "订单超时模拟失败");
            }
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            logger.error("模拟订单超时失败", e);
            response.put("success", false);
            response.put("message", "模拟订单超时异常: " + e.getMessage());
            return ResponseEntity.status(500).body(response);
        }
    }
    
    /**
     * 手动触发定时任务（仅用于测试）
     */
    @PostMapping("/trigger-scheduled-tasks")
    public ResponseEntity<Map<String, Object>> triggerScheduledTasks(@RequestParam String taskType) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            logger.info("手动触发定时任务: {}", taskType);
            
            int processedCount = 0;
            switch (taskType.toLowerCase()) {
                case "payment-timeout":
                    processedCount = orderStatusService.processExpiredPaymentOrders();
                    response.put("message", "支付超时检查完成，处理了 " + processedCount + " 个订单");
                    break;
                case "sharing-timeout":
                    processedCount = orderStatusService.processSharingTimeoutOrders();
                    response.put("message", "拼场超时检查完成，处理了 " + processedCount + " 个订单");
                    break;
                case "booking-expired":
                    processedCount = orderStatusService.processBookingExpiredOrders();
                    response.put("message", "预约过期检查完成，处理了 " + processedCount + " 个订单");
                    break;
                default:
                    response.put("success", false);
                    response.put("message", "未知的任务类型: " + taskType);
                    return ResponseEntity.badRequest().body(response);
            }
            
            response.put("success", true);
            response.put("taskType", taskType);
            response.put("processedCount", processedCount);
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            logger.error("触发定时任务失败", e);
            response.put("success", false);
            response.put("message", "触发定时任务异常: " + e.getMessage());
            return ResponseEntity.status(500).body(response);
        }
    }
}
