package com.example.gymbooking.repository;

import com.example.gymbooking.model.SharingOrder;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

@Repository
public interface SharingOrderRepository extends JpaRepository<SharingOrder, Long> {
    
    // 根据场馆ID查询拼场订单
    List<SharingOrder> findByVenueId(Long venueId);
    
    // 根据创建者用户名查询拼场订单
    List<SharingOrder> findByCreatorUsername(String creatorUsername);
    
    // 根据状态查询拼场订单
    List<SharingOrder> findByStatus(SharingOrder.SharingOrderStatus status);
    
    // 根据场馆ID和状态查询拼场订单
    List<SharingOrder> findByVenueIdAndStatus(Long venueId, SharingOrder.SharingOrderStatus status);
    
    // 根据创建者用户名和状态查询拼场订单
    List<SharingOrder> findByCreatorUsernameAndStatus(String creatorUsername, SharingOrder.SharingOrderStatus status);
    
    // 根据订单号查询拼场订单
    SharingOrder findByOrderNo(String orderNo);
    
    // 根据关联的主订单ID查询拼场订单
    SharingOrder findByOrderId(Long orderId);
    
    // 查询指定日期和场馆的拼场订单
    List<SharingOrder> findByVenueIdAndBookingDate(Long venueId, LocalDate bookingDate);
    
    // 查询指定日期、场馆和状态的拼场订单
    List<SharingOrder> findByVenueIdAndBookingDateAndStatus(
            Long venueId, LocalDate bookingDate, SharingOrder.SharingOrderStatus status);
    
    // 查询指定日期范围内的拼场订单
    List<SharingOrder> findByBookingDateBetween(LocalDate startDate, LocalDate endDate);
    
    // 查询指定日期、时间范围内的拼场订单
    @Query("SELECT s FROM SharingOrder s WHERE s.venueId = :venueId AND s.bookingDate = :date " +
           "AND ((s.startTime <= :startTime AND s.endTime > :startTime) OR " +
           "(s.startTime < :endTime AND s.endTime >= :endTime) OR " +
           "(s.startTime >= :startTime AND s.endTime <= :endTime))")
    List<SharingOrder> findOverlappingOrders(
            @Param("venueId") Long venueId,
            @Param("date") LocalDate date,
            @Param("startTime") LocalTime startTime,
            @Param("endTime") LocalTime endTime);
    
    // 查询可加入的拼场订单（状态为OPEN且未满，或者没有人数限制）
    @Query("SELECT s FROM SharingOrder s WHERE s.status = 'OPEN' AND (s.maxParticipants IS NULL OR s.currentParticipants < s.maxParticipants) ORDER BY s.createdAt DESC")
    List<SharingOrder> findJoinableSharingOrders();
    
    // 查询指定场馆可加入的拼场订单
    @Query("SELECT s FROM SharingOrder s WHERE s.venueId = :venueId AND s.status = 'OPEN' AND (s.maxParticipants IS NULL OR s.currentParticipants < s.maxParticipants) ORDER BY s.createdAt DESC")
    List<SharingOrder> findJoinableSharingOrdersByVenueId(@Param("venueId") Long venueId);
    
    // 查询指定日期可加入的拼场订单
    @Query("SELECT s FROM SharingOrder s WHERE s.bookingDate = :date AND s.status = 'OPEN' AND (s.maxParticipants IS NULL OR s.currentParticipants < s.maxParticipants) ORDER BY s.createdAt DESC")
    List<SharingOrder> findJoinableSharingOrdersByDate(@Param("date") LocalDate date);
    
    // 查询指定场馆和日期可加入的拼场订单
    @Query("SELECT s FROM SharingOrder s WHERE s.venueId = :venueId AND s.bookingDate = :date " +
           "AND s.status = 'OPEN' AND (s.maxParticipants IS NULL OR s.currentParticipants < s.maxParticipants) ORDER BY s.createdAt DESC")
    List<SharingOrder> findJoinableSharingOrdersByVenueIdAndDate(
            @Param("venueId") Long venueId, @Param("date") LocalDate date);
    
    // 查询即将过期的拼场订单（用于定时任务）
    @Query("SELECT s FROM SharingOrder s WHERE s.bookingDate < :today AND " +
           "(s.status = 'OPEN' OR s.status = 'FULL')")
    List<SharingOrder> findExpiringSharingOrders(@Param("today") LocalDate today);
    
    // 查询开场前2小时内的开放状态拼场订单（用于自动取消）
    @Query("SELECT s FROM SharingOrder s WHERE s.status = 'OPEN' AND " +
           "FUNCTION('TIMESTAMP', s.bookingDate, s.startTime) <= :twoHoursLater")
    List<SharingOrder> findOpenOrdersWithinTwoHours(@Param("twoHoursLater") LocalDateTime twoHoursLater);
    
    // 查询已过期但状态仍为开放的拼场订单
    @Query("SELECT s FROM SharingOrder s WHERE s.status = 'OPEN' AND " +
           "FUNCTION('TIMESTAMP', s.bookingDate, s.startTime) < :now")
    List<SharingOrder> findExpiredOpenOrders(@Param("now") LocalDateTime now);}
