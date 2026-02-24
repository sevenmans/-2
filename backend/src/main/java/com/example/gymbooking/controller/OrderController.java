package com.example.gymbooking.controller;

import com.example.gymbooking.model.Order;
import com.example.gymbooking.repository.OrderRepository;
import com.example.gymbooking.service.OrderStatusService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/order")
@CrossOrigin(origins = "*")
public class OrderController {
    @Autowired
    private OrderRepository repository;
    
    @Autowired
    private OrderStatusService orderStatusService;

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
}
