package com.example.gymbooking.service;

import com.example.gymbooking.model.Order;
import com.example.gymbooking.model.SharingOrder;
import com.example.gymbooking.repository.OrderRepository;
import com.example.gymbooking.repository.SharingOrderRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * 订单状态转换服务
 * 实现订单状态流程设计文档中定义的业务规则和自动转换逻辑
 */
@Service
public class OrderStatusService {
    
    private static final Logger logger = LoggerFactory.getLogger(OrderStatusService.class);
    
    @Autowired
    private OrderRepository orderRepository;
    
    @Autowired
    private SharingOrderRepository sharingOrderRepository;
    
    @Autowired
    private TimeSlotService timeSlotService;
    
    @Autowired
    private WebSocketNotificationService webSocketNotificationService;
    
    /**
     * 安全的状态转换方法
     * @param orderId 订单ID
     * @param targetStatus 目标状态
     * @param reason 转换原因
     * @return 是否转换成功
     */
    @Transactional
    public boolean transitionOrderStatus(Long orderId, Order.OrderStatus targetStatus, String reason) {
        Optional<Order> orderOpt = orderRepository.findById(orderId);
        if (!orderOpt.isPresent()) {
            logger.error("订单不存在: {}", orderId);
            return false;
        }
        
        Order order = orderOpt.get();
        Order.OrderStatus currentStatus = order.getStatus();
        
        // 检查是否可以转换
        if (!order.canTransitionTo(targetStatus)) {
            logger.warn("订单状态转换被拒绝: {} -> {}, 订单ID: {}, 原因: 不允许的转换", 
                       currentStatus, targetStatus, orderId);
            return false;
        }
        
        // 执行状态转换
        if (order.updateStatus(targetStatus)) {
            orderRepository.save(order);
            logger.info("订单状态转换成功: {} -> {}, 订单ID: {}, 原因: {}", 
                       currentStatus, targetStatus, orderId, reason);
            
            // 处理状态转换的副作用
            handleStatusTransitionSideEffects(order, currentStatus, targetStatus);
            
            return true;
        } else {
            logger.error("订单状态转换失败: {} -> {}, 订单ID: {}", 
                        currentStatus, targetStatus, orderId);
            return false;
        }
    }
    
    /**
     * 处理状态转换的副作用
     */
    private void handleStatusTransitionSideEffects(Order order, Order.OrderStatus fromStatus, Order.OrderStatus toStatus) {
        // 如果是拼场订单，需要同步更新SharingOrder状态
        if (order.getBookingType() == Order.BookingType.SHARED) {
            updateSharingOrderStatus(order, toStatus);
        }
        
        // 如果订单被取消或过期，需要释放时间段
        if (toStatus == Order.OrderStatus.CANCELLED || toStatus == Order.OrderStatus.EXPIRED) {
            releaseTimeSlots(order);
        }
        
        // 记录状态变更日志
        logStatusChange(order.getId(), fromStatus, toStatus);
    }
    
    /**
     * 更新拼场订单状态
     */
    private void updateSharingOrderStatus(Order order, Order.OrderStatus orderStatus) {
        SharingOrder sharingOrder = sharingOrderRepository.findByOrderId(order.getId());
        if (sharingOrder != null) {
            SharingOrder.SharingOrderStatus newSharingStatus = mapOrderStatusToSharingStatus(orderStatus);
            if (newSharingStatus != null) {
                sharingOrder.setStatus(newSharingStatus);
                sharingOrderRepository.save(sharingOrder);
                logger.info("同步更新拼场订单状态: {}, 拼场订单ID: {}", newSharingStatus, sharingOrder.getId());
            }
        }
    }
    
    /**
     * 将订单状态映射到拼场订单状态
     */
    private SharingOrder.SharingOrderStatus mapOrderStatusToSharingStatus(Order.OrderStatus orderStatus) {
        switch (orderStatus) {
            case OPEN:
                return SharingOrder.SharingOrderStatus.OPEN;
            case APPROVED_PENDING_PAYMENT:
                return SharingOrder.SharingOrderStatus.OPEN;  // 等待支付时保持开放状态
            case SHARING_SUCCESS:
            case FULL:
                return SharingOrder.SharingOrderStatus.CONFIRMED;
            case CONFIRMED:
                return SharingOrder.SharingOrderStatus.CONFIRMED;
            case CANCELLED:
                return SharingOrder.SharingOrderStatus.CANCELLED;
            default:
                return null;
        }
    }
    
    /**
     * 释放订单相关的时间段
     */
    private void releaseTimeSlots(Order order) {
        try {
            // 通过订单ID查找相关的时间段并释放
            List<Long> releasedTimeSlotIds = timeSlotService.cancelBooking(order.getId());
            logger.info("成功释放订单相关时间段: 订单ID={}, 场馆ID={}, 预约时间={}, 释放的时间段ID={}", 
                       order.getId(), order.getVenueId(), order.getBookingTime(), releasedTimeSlotIds);
            
            // 发送WebSocket通知
            if (releasedTimeSlotIds != null && !releasedTimeSlotIds.isEmpty()) {
                String date = order.getBookingTime().toLocalDate().toString();
                
                // 根据订单状态发送不同类型的通知
                if (order.getStatus() == Order.OrderStatus.EXPIRED) {
                    webSocketNotificationService.sendOrderExpiredNotification(
                        order.getId(), order.getVenueId(), date, releasedTimeSlotIds);
                } else if (order.getStatus() == Order.OrderStatus.CANCELLED) {
                    webSocketNotificationService.sendOrderCancelledNotification(
                        order.getId(), order.getVenueId(), date, releasedTimeSlotIds);
                }
                
                // 发送时间段状态更新通知
                webSocketNotificationService.sendTimeslotStatusUpdateNotification(
                    order.getVenueId(), date, releasedTimeSlotIds);
            }
        } catch (Exception e) {
            logger.error("释放时间段失败: 订单ID={}, 错误信息={}", order.getId(), e.getMessage());
        }
    }
    
    /**
     * 记录状态变更日志
     */
    private void logStatusChange(Long orderId, Order.OrderStatus fromStatus, Order.OrderStatus toStatus) {
        // 这里可以扩展为保存到状态变更记录表
        logger.info("订单状态变更记录: 订单ID={}, 从状态={}, 到状态={}, 时间={}", 
                   orderId, fromStatus.getDescription(), toStatus.getDescription(), LocalDateTime.now());
    }
    
    /**
     * 检查并处理超时未支付的订单
     * 根据设计文档：创建后24小时内未支付的订单自动过期
     */
    @Transactional
    public int processExpiredPaymentOrders() {
        LocalDateTime expireTime = LocalDateTime.now().minusHours(24);
        List<Order> expiredOrders = orderRepository.findByStatusAndCreatedAtBefore(
            Order.OrderStatus.PENDING, expireTime);
        
        int processedCount = 0;
        for (Order order : expiredOrders) {
            if (transitionOrderStatus(order.getId(), Order.OrderStatus.EXPIRED, "支付超时自动过期")) {
                processedCount++;
            }
        }
        
        if (processedCount > 0) {
            logger.info("处理了 {} 个超时未支付的订单", processedCount);
        }
        
        return processedCount;
    }
    
    /**
     * 检查并处理拼场超时订单
     * 根据设计文档：开场前2小时未拼满的订单自动取消
     */
    @Transactional
    public int processSharingTimeoutOrders() {
        LocalDateTime timeoutThreshold = LocalDateTime.now().plusHours(2);
        
        // 查找所有开放中的拼场订单
        List<Order> openSharingOrders = orderRepository.findByStatusInAndBookingTimeBefore(
            List.of(Order.OrderStatus.OPEN, Order.OrderStatus.APPROVED_PENDING_PAYMENT, Order.OrderStatus.PENDING_FULL),
            timeoutThreshold);
        
        int processedCount = 0;
        for (Order order : openSharingOrders) {
            // 检查是否已满员
            SharingOrder sharingOrder = sharingOrderRepository.findByOrderId(order.getId());
            if (sharingOrder != null && 
                sharingOrder.getCurrentParticipants() < sharingOrder.getMaxParticipants()) {
                
                if (transitionOrderStatus(order.getId(), Order.OrderStatus.CANCELLED, "拼场超时自动取消")) {
                    processedCount++;
                }
            }
        }
        
        if (processedCount > 0) {
            logger.info("处理了 {} 个拼场超时订单", processedCount);
        }
        
        return processedCount;
    }
    
    /**
     * 检查并处理预约过期订单
     * 根据设计文档：预约时间过期未使用的订单自动过期
     */
    @Transactional
    public int processBookingExpiredOrders() {
        LocalDateTime now = LocalDateTime.now();
        
        // 查找所有已确认但预约时间已过期的订单
        List<Order> expiredBookings = orderRepository.findByStatusAndBookingTimeBefore(
            Order.OrderStatus.CONFIRMED, now);
        
        int processedCount = 0;
        for (Order order : expiredBookings) {
            if (transitionOrderStatus(order.getId(), Order.OrderStatus.EXPIRED, "预约时间过期")) {
                processedCount++;
            }
        }
        
        if (processedCount > 0) {
            logger.info("处理了 {} 个预约过期订单", processedCount);
        }
        
        return processedCount;
    }
    
    /**
     * 获取订单的可执行操作
     */
    public List<String> getAvailableActions(Long orderId) {
        Optional<Order> orderOpt = orderRepository.findById(orderId);
        if (!orderOpt.isPresent()) {
            return List.of();
        }
        
        Order order = orderOpt.get();
        Order.OrderStatus status = order.getStatus();
        
        // 根据当前状态返回可执行的操作
        switch (status) {
            case PENDING:
                return List.of("pay", "cancel");
            case PAID:
                if (order.getBookingType() == Order.BookingType.SHARED) {
                    return List.of("cancel");
                } else {
                    return List.of("cancel");
                }
            case OPEN:
            case APPROVED_PENDING_PAYMENT:
                return List.of("cancel", "view_participants");
            case CONFIRMED:
                return List.of("cancel", "checkin");
            case VERIFIED:
                return List.of("complete");
            default:
                return List.of();
        }
    }
}
