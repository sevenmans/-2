package com.example.gymbooking.service;

import com.example.gymbooking.model.Order;
import com.example.gymbooking.repository.OrderRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
public class OrderService {
    
    private static final Logger logger = LoggerFactory.getLogger(OrderService.class);
    
    @Autowired
    private OrderRepository orderRepository;
    
    /**
     * 更新订单状态为拼场成功
     * @param orderId 订单ID
     */
    public void updateOrderStatusToSharingSuccess(Long orderId) {
        Optional<Order> orderOpt = orderRepository.findById(orderId);
        if (orderOpt.isPresent()) {
            Order order = orderOpt.get();
            order.setStatus(Order.OrderStatus.SHARING_SUCCESS);
            orderRepository.save(order);
            logger.info("订单状态已更新为拼场成功: {}", orderId);
        } else {
            logger.warn("未找到订单: {}", orderId);
        }
    }
    
    /**
     * 根据ID获取订单
     * @param orderId 订单ID
     * @return 订单对象
     */
    public Optional<Order> getOrderById(Long orderId) {
        return orderRepository.findById(orderId);
    }
    
    /**
     * 保存订单
     * @param order 订单对象
     * @return 保存后的订单
     */
    public Order saveOrder(Order order) {
        return orderRepository.save(order);
    }
}