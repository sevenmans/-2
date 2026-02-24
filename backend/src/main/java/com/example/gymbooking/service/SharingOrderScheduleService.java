package com.example.gymbooking.service;

import com.example.gymbooking.model.Order;
import com.example.gymbooking.model.SharingOrder;
import com.example.gymbooking.model.SharingRequest;
import com.example.gymbooking.repository.OrderRepository;
import com.example.gymbooking.repository.SharingOrderRepository;
import com.example.gymbooking.repository.SharingRequestRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;
import com.example.gymbooking.model.TimeSlot;
import com.example.gymbooking.repository.TimeSlotRepository;
import java.util.ArrayList;

@Service
public class SharingOrderScheduleService {

    private static final Logger logger = LoggerFactory.getLogger(SharingOrderScheduleService.class);

    @Autowired
    private SharingOrderRepository sharingOrderRepository;

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private TimeSlotService timeSlotService;

    @Autowired
    private SharingRequestRepository sharingRequestRepository;

    @Autowired
    private WebSocketNotificationService webSocketNotificationService;
    
    @Autowired
    private TimeSlotRepository timeSlotRepository;

    /**
     * 定时检查并取消未满员的拼场订单
     * 每分钟执行一次，检查开场前2小时未满员的拼场订单
     */
    @Scheduled(fixedRate = 60000) // 每分钟执行一次
    @Transactional
    public void cancelUnfilledSharingOrders() {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime twoHoursLater = now.plusHours(2);
        
        // 查找所有开放状态且开场时间在2小时内的拼场订单
        List<SharingOrder> ordersToCheck = sharingOrderRepository.findOpenOrdersWithinTwoHours(twoHoursLater);
        
        for (SharingOrder order : ordersToCheck) {
            LocalDateTime orderDateTime = LocalDateTime.of(order.getBookingDate(), order.getStartTime());
            
            // 如果订单开场时间在2小时内且未满员，则取消订单
            if (orderDateTime.isBefore(twoHoursLater) && 
                order.getCurrentParticipants() < order.getMaxParticipants() &&
                order.getStatus() == SharingOrder.SharingOrderStatus.OPEN) {
                
                // 取消拼场订单
                order.setStatus(SharingOrder.SharingOrderStatus.CANCELLED);
                sharingOrderRepository.save(order);
                
                // 释放时间段状态为可预约
                try {
                    // 需要通过订单ID来释放时间段，但拼场订单可能没有直接的订单ID关联
                    // 这里需要使用releaseTimeSlot方法来按时间范围释放
                    timeSlotService.releaseTimeSlot(
                        order.getVenueId(),
                        order.getBookingDate(),
                        order.getStartTime(),
                        order.getEndTime()
                    );
                    
                    // 由于releaseTimeSlot方法不返回ID列表，我们需要查询释放的时间段
                    List<TimeSlot> releasedSlots = timeSlotRepository.findByVenueIdAndDateAndTimeRange(
                        order.getVenueId(), order.getBookingDate(), order.getStartTime(), order.getEndTime());
                    List<Long> releasedTimeSlotIds = releasedSlots.stream()
                        .map(TimeSlot::getId)
                        .collect(Collectors.toList());
                    
                    // 发送WebSocket通知
                    if (releasedTimeSlotIds != null && !releasedTimeSlotIds.isEmpty()) {
                        String date = order.getBookingDate().toString();
                        webSocketNotificationService.sendOrderCancelledNotification(
                            order.getId(), order.getVenueId(), date, releasedTimeSlotIds);
                        webSocketNotificationService.sendTimeslotStatusUpdateNotification(
                            order.getVenueId(), date, releasedTimeSlotIds);
                    }
                } catch (Exception e) {
                    // 记录日志但不影响订单取消
                    logger.error("释放时间段失败: {}", e.getMessage());
                }
                
                logger.info("自动取消拼场订单: {}, 原因: 开场前2小时未满员", order.getOrderNo());
            }
        }
    }

    /**
     * 处理超时未支付的订单
     * 每5分钟执行一次，取消超过30分钟未支付的订单
     */
    @Scheduled(fixedRate = 5 * 60 * 1000) // 5分钟
    public void processExpiredPaymentOrders() {
        logger.info("开始处理超时未支付的订单");

        LocalDateTime thirtyMinutesAgo = LocalDateTime.now().minusMinutes(30);

        // 查找超过30分钟未支付的订单
        List<Order> expiredOrders = orderRepository.findByStatusAndCreatedAtBefore(
            Order.OrderStatus.PENDING, thirtyMinutesAgo);

        int canceledCount = 0;
        for (Order order : expiredOrders) {
            try {
                // 取消订单
                order.setStatus(Order.OrderStatus.EXPIRED);
                orderRepository.save(order);

                // 释放时间段
                try {
                    List<Long> releasedTimeSlotIds = timeSlotService.cancelBooking(order.getId());
                    
                    // 发送WebSocket通知
                    if (releasedTimeSlotIds != null && !releasedTimeSlotIds.isEmpty()) {
                        String date = order.getBookingTime().toLocalDate().toString();
                        webSocketNotificationService.sendOrderExpiredNotification(
                            order.getId(), order.getVenueId(), date, releasedTimeSlotIds);
                        webSocketNotificationService.sendTimeslotStatusUpdateNotification(
                            order.getVenueId(), date, releasedTimeSlotIds);
                    }
                } catch (Exception e) {
                    logger.error("释放时间段失败: {}", e.getMessage());
                }

                canceledCount++;
                logger.info("自动取消超时订单: {}, 创建时间: {}",
                    order.getOrderNo(), order.getCreatedAt());

            } catch (Exception e) {
                logger.error("处理超时订单失败: {}, 错误: {}", order.getOrderNo(), e.getMessage());
            }
        }

        if (canceledCount > 0) {
            logger.info("本次处理完成，共取消 {} 个超时订单", canceledCount);
        }
    }
    
    /**
     * 定时检查并标记过期的拼场订单
     * 每小时执行一次
     */
    @Scheduled(fixedRate = 3600000) // 每小时执行一次
    @Transactional
    public void markExpiredSharingOrders() {
        LocalDateTime now = LocalDateTime.now();
        
        // 查找所有已过期但状态仍为开放的拼场订单
        List<SharingOrder> expiredOrders = sharingOrderRepository.findExpiredOpenOrders(now);
        
        for (SharingOrder order : expiredOrders) {
            order.setStatus(SharingOrder.SharingOrderStatus.EXPIRED);
            sharingOrderRepository.save(order);
            
            // 释放时间段并发送WebSocket通知
            try {
                timeSlotService.releaseTimeSlot(
                    order.getVenueId(),
                    order.getBookingDate(),
                    order.getStartTime(),
                    order.getEndTime()
                );
                
                // 查询释放的时间段ID
                List<TimeSlot> releasedSlots = timeSlotRepository.findByVenueIdAndDateAndTimeRange(
                    order.getVenueId(), order.getBookingDate(), order.getStartTime(), order.getEndTime());
                List<Long> releasedTimeSlotIds = releasedSlots.stream()
                    .map(TimeSlot::getId)
                    .collect(Collectors.toList());
                
                // 发送WebSocket通知
                if (releasedTimeSlotIds != null && !releasedTimeSlotIds.isEmpty()) {
                    String date = order.getBookingDate().toString();
                    webSocketNotificationService.sendOrderExpiredNotification(
                        order.getId(), order.getVenueId(), date, releasedTimeSlotIds);
                    webSocketNotificationService.sendTimeslotStatusUpdateNotification(
                        order.getVenueId(), date, releasedTimeSlotIds);
                }
            } catch (Exception e) {
                logger.error("释放时间段失败: {}", e.getMessage());
            }
            
            logger.info("标记过期拼场订单: {}", order.getOrderNo());
        }
    }

    /**
     * 处理过期的拼场申请支付
     * 每5分钟执行一次，检查并取消超过支付截止时间的申请
     */
    @Scheduled(fixedRate = 5 * 60 * 1000) // 5分钟
    @Transactional
    public void processExpiredSharingRequestPayments() {
        LocalDateTime now = LocalDateTime.now();

        // 查找所有已批准但支付超时的申请
        List<SharingRequest> expiredRequests = sharingRequestRepository.findByStatusAndPaymentDeadlineBefore(
            SharingRequest.RequestStatus.APPROVED_PENDING_PAYMENT, now);

        int canceledCount = 0;
        for (SharingRequest request : expiredRequests) {
            try {
                // 取消申请
                request.setStatus(SharingRequest.RequestStatus.TIMEOUT_CANCELLED);
                request.setResponseMessage("支付超时自动取消");
                sharingRequestRepository.save(request);

                // 恢复发起者订单状态为开放中
                Order creatorOrder = orderRepository.findById(request.getOrderId()).orElse(null);
                if (creatorOrder != null) {
                    creatorOrder.setStatus(Order.OrderStatus.OPEN);
                    orderRepository.save(creatorOrder);
                    logger.info("恢复发起者订单状态为开放中，订单ID: {}", creatorOrder.getId());
                }

                canceledCount++;
                logger.info("自动取消超时支付申请: 申请ID={}, 申请者={}, 支付截止时间={}",
                    request.getId(), request.getApplicantUsername(), request.getPaymentDeadline());

            } catch (Exception e) {
                logger.error("处理超时支付申请失败: 申请ID={}, 错误: {}", request.getId(), e.getMessage());
            }
        }

        if (canceledCount > 0) {
            logger.info("本次处理完成，共取消 {} 个超时支付申请", canceledCount);
        }
    }
}