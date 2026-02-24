package com.example.gymbooking.controller;

import com.example.gymbooking.model.TimeSlot;
import com.example.gymbooking.scheduler.TimeSlotStatusScheduler;
import com.example.gymbooking.service.TimeSlotService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/timeslots")
@CrossOrigin(origins = "*")
public class TimeSlotController {

    private static final Logger logger = LoggerFactory.getLogger(TimeSlotController.class);

    @Autowired
    private TimeSlotService timeSlotService;
    
    @Autowired
    private TimeSlotStatusScheduler timeSlotStatusScheduler;
    
    /**
     * 获取场馆指定日期的所有时间段
     * 如果没有时间段，自动生成并返回
     */
    @GetMapping("/venue/{venueId}/date/{date}")
    public ResponseEntity<List<TimeSlot>> getTimeSlotsByVenueAndDate(
            @PathVariable Long venueId,
            @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        try {
            System.out.println("[DEBUG] Controller接收到请求 - venueId: " + venueId + ", date: " + date);
            logger.info("[DEBUG] Controller接收到请求 - venueId: {}, date: {}", venueId, date);
            List<TimeSlot> timeSlots = timeSlotService.getTimeSlotsByVenueAndDate(venueId, date);
            System.out.println("[DEBUG] Controller返回时间段数量: " + timeSlots.size());
            logger.info("[DEBUG] Controller返回时间段数量: {}", timeSlots.size());
            if (!timeSlots.isEmpty()) {
                logger.info("[DEBUG] 第一个时间段的日期: {}", timeSlots.get(0).getDate());
                logger.info("[DEBUG] 最后一个时间段的日期: {}", timeSlots.get(timeSlots.size() - 1).getDate());
            }
            return ResponseEntity.ok(timeSlots);
        } catch (Exception e) {
            System.err.println("获取时间段失败: venueId=" + venueId + ", date=" + date + ", error: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
    
    /**
     * 获取场馆指定日期的可用时间段
     */
    @GetMapping("/venue/{venueId}/date/{date}/available")
    public ResponseEntity<List<TimeSlot>> getAvailableTimeSlots(
            @PathVariable Long venueId,
            @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        
        List<TimeSlot> slots = timeSlotService.getAvailableTimeSlots(venueId, date);
        return ResponseEntity.ok(slots);
    }
    
    /**
     * 为场馆生成指定日期的时间段
     */
    @PostMapping("/venue/{venueId}/date/{date}/generate")
    public ResponseEntity<List<TimeSlot>> generateTimeSlotsForVenue(
            @PathVariable Long venueId,
            @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        
        try {
            List<TimeSlot> slots = timeSlotService.generateTimeSlotsForVenue(venueId, date);
            return ResponseEntity.status(HttpStatus.CREATED).body(slots);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        }
    }
    
    /**
     * 批量生成未来一周的时间段
     */
    @PostMapping("/venue/{venueId}/generate-week")
    public ResponseEntity<Map<String, String>> generateTimeSlotsForWeek(@PathVariable Long venueId) {
        try {
            timeSlotService.generateTimeSlotsForWeek(venueId);
            Map<String, String> response = new HashMap<>();
            response.put("message", "成功生成未来一周的时间段");
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
        }
    }
    
    /**
     * 更新时间段状态
     */
    @PatchMapping("/{id}/status")
    public ResponseEntity<TimeSlot> updateTimeSlotStatus(
            @PathVariable Long id,
            @RequestBody Map<String, String> statusMap) {
        
        try {
            TimeSlot.SlotStatus status = TimeSlot.SlotStatus.valueOf(statusMap.get("status"));
            TimeSlot updatedSlot = timeSlotService.updateTimeSlotStatus(id, status);
            return ResponseEntity.ok(updatedSlot);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        }
    }
    
    /**
     * 检查时间段是否可预约
     */
    @GetMapping("/check")
    public ResponseEntity<Map<String, Object>> checkTimeSlotAvailability(
            @RequestParam Long venueId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.TIME) LocalTime startTime,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.TIME) LocalTime endTime) {
        
        boolean hasConflict = timeSlotService.hasConflict(venueId, date, startTime, endTime);
        
        Map<String, Object> response = new HashMap<>();
        response.put("available", !hasConflict);
        
        return ResponseEntity.ok(response);
    }
    
    /**
     * 刷新时间段状态（获取最新状态）
     * 此端点用于强制刷新指定场馆和日期的时间段状态
     * 🔧 增强：在返回前先触发过期状态检查
     */
    @GetMapping("/venue/{venueId}/date/{date}/refresh")
    public ResponseEntity<Map<String, Object>> refreshTimeSlotStatus(
            @PathVariable Long venueId,
            @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {

        LocalDate today = LocalDate.now();
        logger.info("[TimeSlotController] 🔄 刷新时间段状态 - venueId: {}, date: {}", venueId, date);
        logger.info("[DEBUG] 接收到的日期参数类型: {}, 值: {}", date.getClass().getSimpleName(), date);
        logger.info("[DEBUG] 当前系统日期: {}", today);
        logger.info("[DEBUG] 日期比较结果: date.equals(today) = {}, date.isAfter(today) = {}, date.isBefore(today) = {}",
                   date.equals(today), date.isAfter(today), date.isBefore(today));

        try {
            // 🔧 修复：如果是今日，先触发过期状态检查
            if (date.equals(today)) {
                logger.info("[TimeSlotController] 🔧 今日时间段，先触发过期状态检查");
                try {
                    timeSlotStatusScheduler.manualMarkTodayExpiredTimeSlots();
                    logger.info("[TimeSlotController] ✅ 过期状态检查完成");
                } catch (Exception scheduleError) {
                    logger.warn("[TimeSlotController] ⚠️ 过期状态检查失败: {}", scheduleError.getMessage());
                }
            }
            // 🔧 修复：如果是未来日期，检查是否有错误的EXPIRED状态
            else if (date.isAfter(today)) {
                logger.info("[TimeSlotController] 🔧 未来日期，检查错误的EXPIRED状态");
                try {
                    timeSlotStatusScheduler.manualResetFutureExpiredTimeSlots();
                    logger.info("[TimeSlotController] ✅ 未来日期EXPIRED状态重置完成");
                } catch (Exception scheduleError) {
                    logger.warn("[TimeSlotController] ⚠️ 未来日期EXPIRED状态重置失败: {}", scheduleError.getMessage());
                }
            }

            // 强制从数据库获取最新状态
            List<TimeSlot> slots = timeSlotService.getTimeSlotsByVenueAndDate(venueId, date);

            logger.info("[TimeSlotController] 📊 获取到 {} 个时间段", slots.size());

            // 🔧 增强：记录时间段状态分布
            Map<String, Long> statusCount = slots.stream()
                .collect(Collectors.groupingBy(
                    slot -> slot.getStatus().toString(),
                    Collectors.counting()
                ));
            logger.info("[TimeSlotController] 📊 时间段状态分布: {}", statusCount);

            // 构建响应
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "时间段状态刷新成功");
            response.put("timestamp", System.currentTimeMillis());
            response.put("count", slots.size());
            response.put("data", slots);
            response.put("statusDistribution", statusCount);

            // 返回成功响应
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            logger.error("[TimeSlotController] ❌ 刷新时间段状态失败", e);

            // 构建错误响应
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "刷新时间段状态失败: " + e.getMessage());
            errorResponse.put("timestamp", System.currentTimeMillis());

            // 返回错误响应
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }
    
    /**
     * 手动触发今日过期时间段检查（管理员功能）
     */
    @PostMapping("/admin/mark-expired")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> manualMarkExpiredTimeSlots() {
        try {
            logger.info("管理员手动触发今日过期时间段检查");
            timeSlotStatusScheduler.manualMarkTodayExpiredTimeSlots();
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "成功触发今日过期时间段检查");
            response.put("timestamp", System.currentTimeMillis());
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            logger.error("手动触发今日过期时间段检查失败", e);
            
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "触发今日过期时间段检查失败: " + e.getMessage());
            errorResponse.put("timestamp", System.currentTimeMillis());
            
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }
    
    /**
     * 手动触发未来日期EXPIRED状态重置（管理员功能）
     */
    @PostMapping("/admin/reset-future-expired")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> manualResetFutureExpiredTimeSlots() {
        try {
            logger.info("管理员手动触发未来日期EXPIRED状态重置");
            timeSlotStatusScheduler.manualResetFutureExpiredTimeSlots();
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "成功触发未来日期EXPIRED状态重置");
            response.put("timestamp", System.currentTimeMillis());
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            logger.error("手动触发未来日期EXPIRED状态重置失败", e);
            
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "触发未来日期EXPIRED状态重置失败: " + e.getMessage());
            errorResponse.put("timestamp", System.currentTimeMillis());
            
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }
}