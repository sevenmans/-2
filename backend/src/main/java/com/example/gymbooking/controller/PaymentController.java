package com.example.gymbooking.controller;

import com.example.gymbooking.model.Order;
import com.example.gymbooking.model.SharingOrder;
import com.example.gymbooking.model.SharingRequest;
import com.example.gymbooking.repository.OrderRepository;
import com.example.gymbooking.repository.SharingOrderRepository;
import com.example.gymbooking.repository.SharingRequestRepository;
import com.example.gymbooking.service.OrderService;
import com.example.gymbooking.payload.response.MessageResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/payments")
@CrossOrigin(origins = "*")
public class PaymentController {

    private static final Logger logger = LoggerFactory.getLogger(PaymentController.class);

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private SharingOrderRepository sharingOrderRepository;

    @Autowired
    private SharingRequestRepository sharingRequestRepository;

    @Autowired
    private OrderService orderService;
    
    /**
     * 支付订单（模拟）
     * 将订单状态从PENDING更新为PAID，并处理拼场订单的状态转换
     */
    @PostMapping("/orders/{id}/pay")
    public ResponseEntity<?> payOrder(@PathVariable Long id) {
        try {
            logger.info("开始处理订单支付，订单ID: {}", id);

            // 检查是否为申请者的虚拟订单（负数ID）
            if (id < 0) {
                // 这是申请者的虚拟订单，实际支付的是SharingRequest
                Long requestId = -id; // 转换为正数获取申请ID
                logger.info("处理虚拟订单支付，申请ID: {}", requestId);

                SharingRequest sharingRequest = sharingRequestRepository.findById(requestId).orElse(null);

                if (sharingRequest == null) {
                    throw new RuntimeException("找不到对应的拼场申请");
                }

                // 检查申请是否已被批准且在支付期限内
                if (sharingRequest.getStatus() != SharingRequest.RequestStatus.APPROVED_PENDING_PAYMENT) {
                    throw new RuntimeException("申请尚未被批准或已过期，无法支付");
                }

                // 检查支付是否超时
                if (sharingRequest.getPaymentDeadline() != null &&
                    LocalDateTime.now().isAfter(sharingRequest.getPaymentDeadline())) {
                    throw new RuntimeException("支付已超时，申请已自动取消");
                }

                // 申请者支付成功
                logger.info("申请者支付成功，申请ID: {}, 虚拟订单ID: {}", sharingRequest.getId(), id);

                // 更新申请状态和支付信息
                sharingRequest.setStatus(SharingRequest.RequestStatus.PAID);
                sharingRequest.setIsPaid(true);
                sharingRequest.setPaidAt(LocalDateTime.now());
                sharingRequestRepository.save(sharingRequest);

                // 申请者支付成功，更新发起者的订单状态为拼场成功
                Order creatorOrder = orderRepository.findById(sharingRequest.getOrderId()).orElse(null);
                if (creatorOrder != null) {
                    creatorOrder.setStatus(Order.OrderStatus.SHARING_SUCCESS);
                    orderRepository.save(creatorOrder);
                    logger.info("发起者订单状态更新为拼场成功，订单ID: {}", creatorOrder.getId());
                }

                // 更新拼场订单状态为已确认
                SharingOrder sharingOrder = sharingOrderRepository.findByOrderId(sharingRequest.getOrderId());
                if (sharingOrder != null) {
                    sharingOrder.setStatus(SharingOrder.SharingOrderStatus.CONFIRMED);
                    sharingOrder.setCurrentParticipants(2); // 设置为2人满员
                    sharingOrderRepository.save(sharingOrder);
                    logger.info("拼场订单状态更新为已确认，参与人数: 2");
                }

                // 申请者的虚拟订单不需要更新状态，直接返回成功
                Map<String, Object> response = new HashMap<>();
                response.put("success", true);
                response.put("message", "申请者支付成功，拼场已确认");
                response.put("requestId", sharingRequest.getId());
                response.put("paymentTime", LocalDateTime.now());
                response.put("paymentAmount", sharingRequest.getPaymentAmount());
                return ResponseEntity.ok(response);
            }

            // 处理真实订单
            Order order = orderRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("订单不存在"));

            // 检查订单状态是否为待支付
            if (!order.getStatus().isPayable()) {
                logger.warn("订单状态不允许支付，当前状态: {}", order.getStatus());
                return ResponseEntity.badRequest()
                        .body(new MessageResponse("订单状态不允许支付，当前状态: " + order.getStatus().getDescription()));
            }

            // 使用新的状态转换逻辑
            Order.OrderStatus targetStatus;

            if (order.getBookingType() == Order.BookingType.SHARED) {
                logger.info("处理拼场订单支付，订单ID: {}", id);

                // 发起者支付
                SharingOrder sharingOrder = sharingOrderRepository.findByOrderId(id);
                if (sharingOrder != null) {
                    // 发起者支付后进入开放中状态等待申请者
                    targetStatus = Order.OrderStatus.OPEN;
                    sharingOrder.setStatus(SharingOrder.SharingOrderStatus.OPEN);
                    sharingOrder.setCurrentParticipants(1); // 发起者1人
                    sharingOrderRepository.save(sharingOrder);
                    logger.info("发起者支付成功，进入开放中状态等待申请者加入（当前1人，需要2人）");
                } else {
                    // 没有找到关联的拼场订单，设置为开放中状态
                    targetStatus = Order.OrderStatus.OPEN;
                    logger.info("拼场创建者支付成功，进入开放中状态");
                }
            } else {
                // 普通订单支付后设置为已支付状态
                targetStatus = Order.OrderStatus.PAID;
                logger.info("普通订单支付成功，订单ID: {}", id);
            }

            // 使用安全的状态转换方法
            if (!order.updateStatus(targetStatus)) {
                logger.error("状态转换失败: {} -> {}", order.getStatus(), targetStatus);
                return ResponseEntity.badRequest()
                        .body(new MessageResponse("无法将订单状态从 " + order.getStatus().getDescription() +
                                                " 转换为 " + targetStatus.getDescription()));
            }

            Order updatedOrder = orderRepository.save(order);
            logger.info("订单支付成功，订单ID: {}, 最终状态: {}", id, updatedOrder.getStatus());

            // 构建响应数据
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "支付成功");
            response.put("order", updatedOrder);
            response.put("paymentTime", LocalDateTime.now());
            response.put("paymentAmount", updatedOrder.getTotalPrice());

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            logger.error("支付失败，订单ID: {}, 错误: {}", id, e.getMessage(), e);
            return ResponseEntity.badRequest()
                    .body(new MessageResponse("支付失败: " + e.getMessage()));
        }
    }
    
    /**
     * 获取订单支付状态
     */
    @GetMapping("/orders/{id}/status")
    public ResponseEntity<?> getPaymentStatus(@PathVariable Long id) {
        try {
            Order order = orderRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("订单不存在"));

            Map<String, Object> response = new HashMap<>();
            response.put("orderId", order.getId());
            response.put("orderNo", order.getOrderNo());
            response.put("status", order.getStatus());
            response.put("statusDescription", order.getStatus().getDescription());
            response.put("amount", order.getTotalPrice());
            response.put("isPaid", order.getStatus() == Order.OrderStatus.PAID ||
                               order.getStatus() == Order.OrderStatus.CONFIRMED ||
                               order.getStatus() == Order.OrderStatus.VERIFIED ||
                               order.getStatus() == Order.OrderStatus.COMPLETED);

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(new MessageResponse("获取支付状态失败: " + e.getMessage()));
        }
    }

    /**
     * 模拟支付回调接口
     */
    @PostMapping("/orders/{id}/callback")
    public ResponseEntity<?> mockPaymentCallback(@PathVariable Long id, @RequestBody Map<String, Object> callbackData) {
        try {
            logger.info("收到支付回调，订单ID: {}, 回调数据: {}", id, callbackData);

            Boolean success = (Boolean) callbackData.get("success");
            // Long timestamp = (Long) callbackData.get("timestamp"); // 暂时不使用

            Order order = orderRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("订单不存在"));

            Map<String, Object> response = new HashMap<>();

            if (success != null && success) {
                // 模拟支付成功回调
                order.setStatus(Order.OrderStatus.PAID);
                orderRepository.save(order);

                response.put("success", true);
                response.put("message", "支付回调处理成功");
                response.put("orderId", id);
                response.put("status", "PAID");

                logger.info("支付回调处理成功，订单ID: {}", id);
            } else {
                // 模拟支付失败回调
                response.put("success", false);
                response.put("message", "支付失败");
                response.put("orderId", id);
                response.put("status", order.getStatus());

                logger.warn("支付回调显示支付失败，订单ID: {}", id);
            }

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            logger.error("支付回调处理失败，订单ID: {}, 错误: {}", id, e.getMessage(), e);
            return ResponseEntity.badRequest()
                    .body(new MessageResponse("支付回调处理失败: " + e.getMessage()));
        }
    }
}