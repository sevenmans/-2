package com.example.gymbooking.repository;

import com.example.gymbooking.model.Order;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface OrderRepository extends JpaRepository<Order, Long> {
    @Query("SELECT o FROM Order o WHERE o.username = :username ORDER BY o.createdAt DESC")
    List<Order> findByUsername(@Param("username") String username);
    
    @Query("SELECT o FROM Order o WHERE o.status != 'CANCELLED' AND o.status != 'COMPLETED' AND o.status != 'EXPIRED'")
    List<Order> findActiveOrders();
    
    /**
     * 根据场馆ID和预约时间范围查询订单
     */
    List<Order> findByVenueIdAndBookingTimeBetween(Long venueId, LocalDateTime startTime, LocalDateTime endTime);
    
    /**
     * 根据用户名和状态查询订单
     */
    List<Order> findByUsernameAndStatus(String username, Order.OrderStatus status);
    
    /**
     * 根据场馆ID查询订单
     */
    List<Order> findByVenueId(Long venueId);
    
    /**
     * 根据状态查询订单
     */
    List<Order> findByStatus(Order.OrderStatus status);
    
    /**
     * 根据预约时间范围查询订单
     */
    List<Order> findByBookingTimeBetween(LocalDateTime startTime, LocalDateTime endTime);
    
    /**
     * 根据用户名和预约时间范围查询订单
     */
    List<Order> findByUsernameAndBookingTimeBetween(String username, LocalDateTime startTime, LocalDateTime endTime);

    /**
     * 查找指定状态且创建时间早于指定时间的订单
     */
    List<Order> findByStatusAndCreatedAtBefore(Order.OrderStatus status, LocalDateTime createdAt);

    /**
     * 查找指定状态且预约时间早于指定时间的订单
     */
    List<Order> findByStatusAndBookingTimeBefore(Order.OrderStatus status, LocalDateTime bookingTime);

    /**
     * 查找多个状态且预约时间早于指定时间的订单
     */
    List<Order> findByStatusInAndBookingTimeBefore(List<Order.OrderStatus> statuses, LocalDateTime bookingTime);
}
