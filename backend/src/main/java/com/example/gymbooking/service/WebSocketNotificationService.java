package com.example.gymbooking.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;

/**
 * WebSocket通知服务
 * 用于向前端发送实时通知消息
 */
@Service
public class WebSocketNotificationService {

    private static final Logger logger = LoggerFactory.getLogger(WebSocketNotificationService.class);

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @Autowired
    private ObjectMapper objectMapper;

    /**
     * 发送订单过期通知
     * @param orderId 订单ID
     * @param venueId 场馆ID
     * @param date 日期
     * @param timeSlotIds 时间段ID列表
     */
    public void sendOrderExpiredNotification(Long orderId, Long venueId, String date, java.util.List<Long> timeSlotIds) {
        try {
            Map<String, Object> notification = new HashMap<>();
            notification.put("type", "order-expired");
            notification.put("orderId", orderId);
            notification.put("venueId", venueId);
            notification.put("date", date);
            notification.put("timeSlotIds", timeSlotIds);
            notification.put("timestamp", System.currentTimeMillis());

            // 发送到全局主题，所有连接的客户端都会收到
            messagingTemplate.convertAndSend("/topic/order-events", notification);
            
            logger.info("发送订单过期通知: orderId={}, venueId={}, date={}, timeSlotIds={}", 
                       orderId, venueId, date, timeSlotIds);
        } catch (Exception e) {
            logger.error("发送订单过期通知失败: orderId={}, error={}", orderId, e.getMessage(), e);
        }
    }

    /**
     * 发送订单取消通知
     * @param orderId 订单ID
     * @param venueId 场馆ID
     * @param date 日期
     * @param timeSlotIds 时间段ID列表
     */
    public void sendOrderCancelledNotification(Long orderId, Long venueId, String date, java.util.List<Long> timeSlotIds) {
        try {
            Map<String, Object> notification = new HashMap<>();
            notification.put("type", "order-cancelled");
            notification.put("orderId", orderId);
            notification.put("venueId", venueId);
            notification.put("date", date);
            notification.put("timeSlotIds", timeSlotIds);
            notification.put("timestamp", System.currentTimeMillis());

            messagingTemplate.convertAndSend("/topic/order-events", notification);
            
            logger.info("发送订单取消通知: orderId={}, venueId={}, date={}, timeSlotIds={}", 
                       orderId, venueId, date, timeSlotIds);
        } catch (Exception e) {
            logger.error("发送订单取消通知失败: orderId={}, error={}", orderId, e.getMessage(), e);
        }
    }

    /**
     * 发送预约成功通知
     * @param orderId 订单ID
     * @param venueId 场馆ID
     * @param date 日期
     * @param timeSlotIds 时间段ID列表
     */
    public void sendBookingSuccessNotification(Long orderId, Long venueId, String date, java.util.List<Long> timeSlotIds) {
        try {
            Map<String, Object> notification = new HashMap<>();
            notification.put("type", "booking-success");
            notification.put("orderId", orderId);
            notification.put("venueId", venueId);
            notification.put("date", date);
            notification.put("timeSlotIds", timeSlotIds);
            notification.put("timestamp", System.currentTimeMillis());

            messagingTemplate.convertAndSend("/topic/order-events", notification);
            
            logger.info("发送预约成功通知: orderId={}, venueId={}, date={}, timeSlotIds={}", 
                       orderId, venueId, date, timeSlotIds);
        } catch (Exception e) {
            logger.error("发送预约成功通知失败: orderId={}, error={}", orderId, e.getMessage(), e);
        }
    }

    /**
     * 发送时间段状态更新通知
     * @param venueId 场馆ID
     * @param date 日期
     * @param timeSlotIds 时间段ID列表
     */
    public void sendTimeslotStatusUpdateNotification(Long venueId, String date, java.util.List<Long> timeSlotIds) {
        try {
            Map<String, Object> notification = new HashMap<>();
            notification.put("type", "timeslot-status-updated");
            notification.put("venueId", venueId);
            notification.put("date", date);
            notification.put("timeSlotIds", timeSlotIds);
            notification.put("timestamp", System.currentTimeMillis());

            messagingTemplate.convertAndSend("/topic/timeslot-events", notification);
            
            logger.info("发送时间段状态更新通知: venueId={}, date={}, timeSlotIds={}", 
                       venueId, date, timeSlotIds);
        } catch (Exception e) {
            logger.error("发送时间段状态更新通知失败: venueId={}, error={}", venueId, e.getMessage(), e);
        }
    }
}