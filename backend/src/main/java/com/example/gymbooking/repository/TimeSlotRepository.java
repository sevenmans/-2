package com.example.gymbooking.repository;

import com.example.gymbooking.model.TimeSlot;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

@Repository
public interface TimeSlotRepository extends JpaRepository<TimeSlot, Long> {
    
    // 根据场馆ID和日期查询时间段
    List<TimeSlot> findByVenueIdAndDate(Long venueId, LocalDate date);
    
    // 根据场馆ID、日期和状态查询时间段
    List<TimeSlot> findByVenueIdAndDateAndStatus(Long venueId, LocalDate date, TimeSlot.SlotStatus status);
    
    // 根据场馆ID和日期范围查询时间段
    List<TimeSlot> findByVenueIdAndDateBetween(Long venueId, LocalDate startDate, LocalDate endDate);
    
    // 根据订单ID查询时间段
    List<TimeSlot> findByOrderId(Long orderId);
    
    // 根据场馆ID、日期和开始时间查询时间段
    List<TimeSlot> findByVenueIdAndDateAndStartTime(Long venueId, LocalDate date, LocalTime startTime);

    // 根据场馆ID、日期、开始时间和结束时间精确查询时间段
    List<TimeSlot> findByVenueIdAndDateAndStartTimeAndEndTime(Long venueId, LocalDate date, LocalTime startTime, LocalTime endTime);
    
    // 查询指定日期和时间范围内的可用时间段（查找与预约时间有重叠的时间段）
    @Query("SELECT t FROM TimeSlot t WHERE t.venueId = :venueId AND t.date = :date " +
           "AND t.status = 'AVAILABLE' AND t.startTime < :endTime AND t.endTime > :startTime")
    List<TimeSlot> findAvailableSlots(
            @Param("venueId") Long venueId,
            @Param("date") LocalDate date,
            @Param("startTime") LocalTime startTime,
            @Param("endTime") LocalTime endTime);
    
    // 查询指定日期的所有时间段，按开始时间排序
    @Query("SELECT t FROM TimeSlot t WHERE t.venueId = :venueId AND t.date = :date ORDER BY t.startTime")
    List<TimeSlot> findByVenueIdAndDateOrderByStartTime(
            @Param("venueId") Long venueId,
            @Param("date") LocalDate date);
    
    // 检查指定时间段是否有冲突（用于预约前检查）
    @Query("SELECT COUNT(t) > 0 FROM TimeSlot t WHERE t.venueId = :venueId AND t.date = :date " +
           "AND t.status <> 'AVAILABLE' AND " +
           "((t.startTime <= :startTime AND t.endTime > :startTime) OR " +
           "(t.startTime < :endTime AND t.endTime >= :endTime) OR " +
           "(t.startTime >= :startTime AND t.endTime <= :endTime))")
    boolean hasConflict(
            @Param("venueId") Long venueId,
            @Param("date") LocalDate date,
            @Param("startTime") LocalTime startTime,
            @Param("endTime") LocalTime endTime);
    
    // 更新时间段状态
    @Query("UPDATE TimeSlot t SET t.status = :status, t.orderId = :orderId WHERE t.id = :id")
    void updateStatus(
            @Param("id") Long id,
            @Param("status") TimeSlot.SlotStatus status,
            @Param("orderId") Long orderId);
    
    // 根据场馆ID删除所有时间段（用于删除场馆时）
    void deleteByVenueId(Long venueId);
    
    // 查询指定时间范围内的时间段（用于释放时间段）
    @Query("SELECT t FROM TimeSlot t WHERE t.venueId = :venueId AND t.date = :date " +
           "AND t.startTime >= :startTime AND t.endTime <= :endTime")
    List<TimeSlot> findByVenueIdAndDateAndTimeRange(
            @Param("venueId") Long venueId,
            @Param("date") LocalDate date,
            @Param("startTime") LocalTime startTime,
            @Param("endTime") LocalTime endTime);
    
    // 查找今日已过期但状态不是EXPIRED的时间段（用于定时任务标记过期）
    @Query("SELECT t FROM TimeSlot t WHERE t.date = :today " +
           "AND t.endTime < :currentTime AND t.status != 'EXPIRED'")
    List<TimeSlot> findTodayExpiredSlots(
            @Param("today") LocalDate today,
            @Param("currentTime") LocalTime currentTime);
    
    // 查找未来日期被错误标记为EXPIRED的时间段（用于定时任务重置状态）
    @Query("SELECT t FROM TimeSlot t WHERE t.date > :today AND t.status = 'EXPIRED'")
    List<TimeSlot> findFutureExpiredSlots(@Param("today") LocalDate today);
    
    // 批量更新时间段状态（用于定时任务）
    @Modifying
    @Query("UPDATE TimeSlot t SET t.status = :newStatus WHERE t.id IN :ids")
    void batchUpdateStatus(
            @Param("ids") List<Long> ids,
            @Param("newStatus") TimeSlot.SlotStatus newStatus);
    
    // 查找指定日期范围内的所有时间段（用于数据一致性检查）
    @Query("SELECT t FROM TimeSlot t WHERE t.date BETWEEN :startDate AND :endDate ORDER BY t.date, t.startTime")
    List<TimeSlot> findByDateRange(
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate);
}