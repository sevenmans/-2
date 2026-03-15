package com.example.gymbooking.controller;

import com.example.gymbooking.model.TimeSlot;
import com.example.gymbooking.model.Venue;
import com.example.gymbooking.repository.VenueRepository;
import com.example.gymbooking.scheduler.TimeSlotStatusScheduler;
import com.example.gymbooking.security.services.UserDetailsImpl;
import com.example.gymbooking.service.TimeSlotService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
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

    @Autowired
    private VenueRepository venueRepository;

    /**
     * 获取场馆指定日期的所有时间段
     * 如果没有时间段，自动生成并返回
     */
    @GetMapping("/venue/{venueId}/date/{date}")
    public ResponseEntity<List<TimeSlot>> getTimeSlotsByVenueAndDate(
            @PathVariable("venueId") Long venueId,
            @PathVariable("date") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        try {
            logger.info("[TimeSlotController] 接收到请求 - venueId: {}, date: {}", venueId, date);
            List<TimeSlot> timeSlots = timeSlotService.getTimeSlotsByVenueAndDate(venueId, date);
            logger.info("[TimeSlotController] 返回时间段数量: {}", timeSlots.size());
            if (!timeSlots.isEmpty()) {
                logger.info("[TimeSlotController] 第一个时间段的日期: {}", timeSlots.get(0).getDate());
                logger.info("[TimeSlotController] 最后一个时间段的日期: {}", timeSlots.get(timeSlots.size() - 1).getDate());
            }
            return ResponseEntity.ok(timeSlots);
        } catch (Exception e) {
            logger.error("获取时间段失败: venueId={}, date={}, error={}", venueId, date, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * 获取场馆指定日期的可用时间段
     */
    @GetMapping("/venue/{venueId}/date/{date}/available")
    public ResponseEntity<List<TimeSlot>> getAvailableTimeSlots(
            @PathVariable("venueId") Long venueId,
            @PathVariable("date") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {

        List<TimeSlot> slots = timeSlotService.getAvailableTimeSlots(venueId, date);
        return ResponseEntity.ok(slots);
    }

    /**
     * 为场馆生成指定日期的时间段
     */
    @PostMapping("/venue/{venueId}/date/{date}/generate")
    public ResponseEntity<List<TimeSlot>> generateTimeSlotsForVenue(
            @PathVariable("venueId") Long venueId,
            @PathVariable("date") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {

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
    public ResponseEntity<Map<String, String>> generateTimeSlotsForWeek(@PathVariable("venueId") Long venueId) {
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
     * 更新时间段状态（管理员端）
     */
    @PatchMapping("/{id}/status")
    @PreAuthorize("hasRole('ROLE_VENUE_ADMIN') or hasRole('ROLE_SUPER_ADMIN')")
    public ResponseEntity<?> updateTimeSlotStatus(
            @PathVariable("id") Long id,
            @RequestBody Map<String, String> statusMap) {

        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            if (authentication == null || !(authentication.getPrincipal() instanceof UserDetailsImpl)) {
                Map<String, Object> error = new HashMap<>();
                error.put("success", false);
                error.put("message", "未获取到有效登录信息");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(error);
            }
            UserDetailsImpl currentUser = (UserDetailsImpl) authentication.getPrincipal();

            TimeSlot slot = timeSlotService.getTimeSlotById(id)
                    .orElseThrow(() -> new RuntimeException("时间段不存在，ID: " + id));

            Optional<Venue> venueOpt = venueRepository.findById(slot.getVenueId());
            if (!venueOpt.isPresent() || !Objects.equals(venueOpt.get().getManagerId(), currentUser.getId())) {
                Map<String, Object> error = new HashMap<>();
                error.put("success", false);
                error.put("message", "无权限操作该时间段");
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(error);
            }

            TimeSlot.SlotStatus status = TimeSlot.SlotStatus.valueOf(statusMap.get("status"));
            if (status == TimeSlot.SlotStatus.MAINTENANCE) {
                boolean hasConflictOrder = slot.getOrderId() != null
                        || slot.getStatus() == TimeSlot.SlotStatus.RESERVED
                        || slot.getStatus() == TimeSlot.SlotStatus.BOOKED
                        || slot.getStatus() == TimeSlot.SlotStatus.SHARING
                        || slot.getStatus() == TimeSlot.SlotStatus.OCCUPIED;
                if (hasConflictOrder) {
                    Map<String, Object> error = new HashMap<>();
                    error.put("success", false);
                    error.put("message", "存在冲突订单，无法设为维护中，请先处理订单");
                    error.put("timeSlotId", slot.getId());
                    return ResponseEntity.status(HttpStatus.CONFLICT).body(error);
                }
            }

            TimeSlot updatedSlot = timeSlotService.updateTimeSlotStatus(id, status);
            return ResponseEntity.ok(updatedSlot);
        } catch (Exception e) {
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("message", "更新时间段状态失败: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
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
     */
    @GetMapping("/venue/{venueId}/date/{date}/refresh")
    public ResponseEntity<Map<String, Object>> refreshTimeSlotStatus(
            @PathVariable Long venueId,
            @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {

        LocalDate today = LocalDate.now();
        logger.info("[TimeSlotController] 刷新时间段状态 - venueId: {}, date: {}", venueId, date);
        logger.info("[DEBUG] 接收到的日期参数类型: {}, 值: {}", date.getClass().getSimpleName(), date);
        logger.info("[DEBUG] 当前系统日期: {}", today);

        try {
            if (date.equals(today)) {
                logger.info("[TimeSlotController] 今日时间段，先触发过期状态检查");
                try {
                    timeSlotStatusScheduler.manualMarkTodayExpiredTimeSlots();
                    logger.info("[TimeSlotController] 过期状态检查完成");
                } catch (Exception scheduleError) {
                    logger.warn("[TimeSlotController] 过期状态检查失败: {}", scheduleError.getMessage());
                }
            } else if (date.isAfter(today)) {
                logger.info("[TimeSlotController] 未来日期，检查错误的EXPIRED状态");
                try {
                    timeSlotStatusScheduler.manualResetFutureExpiredTimeSlots();
                    logger.info("[TimeSlotController] 未来日期EXPIRED状态重置完成");
                } catch (Exception scheduleError) {
                    logger.warn("[TimeSlotController] 未来日期EXPIRED状态重置失败: {}", scheduleError.getMessage());
                }
            }

            List<TimeSlot> slots = timeSlotService.getTimeSlotsByVenueAndDate(venueId, date);

            logger.info("[TimeSlotController] 获取到 {} 个时间段", slots.size());

            Map<String, Long> statusCount = slots.stream()
                    .collect(Collectors.groupingBy(
                            slot -> slot.getStatus().toString(),
                            Collectors.counting()
                    ));
            logger.info("[TimeSlotController] 时间段状态分布: {}", statusCount);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "时间段状态刷新成功");
            response.put("timestamp", System.currentTimeMillis());
            response.put("count", slots.size());
            response.put("data", slots);
            response.put("statusDistribution", statusCount);

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            logger.error("[TimeSlotController] 刷新时间段状态失败", e);

            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "刷新时间段状态失败: " + e.getMessage());
            errorResponse.put("timestamp", System.currentTimeMillis());

            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }

    /**
     * 手动触发今日过期时间段检查（管理员功能）
     */
    @PostMapping("/admin/mark-expired")
    @PreAuthorize("hasRole('ROLE_VENUE_ADMIN') or hasRole('ROLE_SUPER_ADMIN')")
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
    @PreAuthorize("hasRole('ROLE_VENUE_ADMIN') or hasRole('ROLE_SUPER_ADMIN')")
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

    /**
     * 获取场馆已生成时间段的日期列表（用于排期管理日期选择限制）
     * 返回从今天开始的所有已生成时间段的日期
     */
    @GetMapping("/venue/{venueId}/generated-dates")
    @PreAuthorize("hasRole('ROLE_VENUE_ADMIN') or hasRole('ROLE_SUPER_ADMIN')")
    public ResponseEntity<Map<String, Object>> getGeneratedDatesForVenue(@PathVariable("venueId") Long venueId) {
        try {
            logger.info("[TimeSlotController] 获取场馆已生成时间段的日期列表 - venueId: {}", venueId);

            // 获取从今天开始的所有已生成时间段的日期
            LocalDate today = LocalDate.now();
            List<LocalDate> dates = timeSlotService.getGeneratedDatesForVenue(venueId, today);

            // 转换为字符串格式返回（yyyy-MM-dd）
            List<String> dateStrings = dates.stream()
                    .map(LocalDate::toString)
                    .collect(Collectors.toList());

            logger.info("[TimeSlotController] 返回 {} 个可选日期", dateStrings.size());

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("data", dateStrings);
            response.put("count", dateStrings.size());
            response.put("timestamp", System.currentTimeMillis());

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            logger.error("[TimeSlotController] 获取已生成日期列表失败", e);

            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "获取已生成日期列表失败: " + e.getMessage());
            errorResponse.put("timestamp", System.currentTimeMillis());

            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }
}
