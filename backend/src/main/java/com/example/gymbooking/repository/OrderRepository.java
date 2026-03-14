package com.example.gymbooking.repository;

import com.example.gymbooking.model.Order;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

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
     * 根据订单号查询订单（用于核销码 ORD...）
     */
    Optional<Order> findByOrderNo(String orderNo);

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

    /**
     * 管理员工作台统计：根据多个场馆ID和预约时间范围统计订单数量
     */
    long countByVenueIdInAndBookingTimeBetween(List<Long> venueIds, LocalDateTime startTime, LocalDateTime endTime);

    /**
     * 管理员工作台统计：根据多个场馆ID、状态集合和时间范围统计订单数量
     */
    long countByVenueIdInAndStatusInAndBookingTimeBetween(
            List<Long> venueIds,
            List<Order.OrderStatus> statuses,
            LocalDateTime startTime,
            LocalDateTime endTime
    );

    /**
     * 管理员工作台统计：根据多个场馆ID、状态集合和时间范围统计总金额
     */
    @Query("SELECT COALESCE(SUM(o.totalPrice), 0) FROM Order o WHERE o.venueId IN :venueIds AND o.status IN :statuses AND o.bookingTime BETWEEN :startTime AND :endTime")
    Double sumTotalPriceByVenueIdInAndStatusInAndBookingTimeBetween(
            @Param("venueIds") List<Long> venueIds,
            @Param("statuses") List<Order.OrderStatus> statuses,
            @Param("startTime") LocalDateTime startTime,
            @Param("endTime") LocalDateTime endTime
    );
}
