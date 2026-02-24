package com.example.gymbooking.scheduler;

import com.example.gymbooking.model.TimeSlot;
import com.example.gymbooking.repository.TimeSlotRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.stream.Collectors;

/**
 * 时间段状态定时任务调度器
 * 负责检查和更新过期时间段的状态，确保数据一致性
 */
@Component
public class TimeSlotStatusScheduler {
    
    private static final Logger logger = LoggerFactory.getLogger(TimeSlotStatusScheduler.class);
    
    @Autowired
    private TimeSlotRepository timeSlotRepository;
    
    /**
     * 每小时检查并标记今日已过期的时间段
     * 🔧 修复：只有当前时间超过时间段结束时间才标记为过期
     * 只对今日的时间段进行过期检查，未来日期的时间段不应被标记为EXPIRED
     */
    @Scheduled(cron = "0 0 * * * ?") // 每小时执行一次
    @Transactional
    public void markTodayExpiredTimeSlots() {
        try {
            LocalDate today = LocalDate.now();
            LocalTime currentTime = LocalTime.now();

            logger.info("🔍 开始检查今日过期时间段，当前日期: {}, 当前时间: {}", today, currentTime);

            // 🔧 修复：查找今日已过期但状态不是EXPIRED的时间段
            // 过期条件：当前时间 > 时间段结束时间
            List<TimeSlot> expiredSlots = timeSlotRepository.findTodayExpiredSlots(today, currentTime);

            logger.info("🔍 查询到 {} 个可能过期的时间段", expiredSlots.size());

            // 🔧 二次验证：确保只有真正过期的时间段被标记
            List<TimeSlot> actuallyExpiredSlots = expiredSlots.stream()
                .filter(slot -> {
                    // 只有当前时间超过结束时间才算过期
                    boolean isExpired = currentTime.isAfter(slot.getEndTime());
                    if (!isExpired) {
                        logger.warn("⚠️ 时间段未过期但被查询出来: ID={}, 时间={}-{}, 当前时间={}",
                            slot.getId(), slot.getStartTime(), slot.getEndTime(), currentTime);
                    }
                    return isExpired;
                })
                .collect(Collectors.toList());

            if (!actuallyExpiredSlots.isEmpty()) {
                List<Long> expiredSlotIds = actuallyExpiredSlots.stream()
                        .map(TimeSlot::getId)
                        .collect(Collectors.toList());

                // 批量更新状态为EXPIRED
                timeSlotRepository.batchUpdateStatus(expiredSlotIds, TimeSlot.SlotStatus.EXPIRED);

                logger.info("✅ 成功标记 {} 个今日过期时间段为EXPIRED状态", actuallyExpiredSlots.size());

                // 记录详细信息
                for (TimeSlot slot : actuallyExpiredSlots) {
                    logger.info("📋 标记过期时间段: ID={}, 场馆ID={}, 日期={}, 时间={}-{}, 原状态={}, 当前时间={}",
                            slot.getId(), slot.getVenueId(), slot.getDate(),
                            slot.getStartTime(), slot.getEndTime(), slot.getStatus(), currentTime);
                }
            } else {
                logger.info("✅ 今日没有需要标记为过期的时间段");
            }

        } catch (Exception e) {
            logger.error("❌ 标记今日过期时间段时发生错误", e);
        }
    }
    
    /**
     * 每天凌晨2点重置未来日期被错误标记为EXPIRED的时间段
     * 将未来日期的EXPIRED状态重置为AVAILABLE
     */
    @Scheduled(cron = "0 0 2 * * ?") // 每天凌晨2点执行
    @Transactional
    public void resetFutureExpiredTimeSlots() {
        try {
            LocalDate today = LocalDate.now();
            
            logger.info("开始重置未来日期错误的EXPIRED状态，当前日期: {}", today);
            
            // 查找未来日期被错误标记为EXPIRED的时间段
            List<TimeSlot> futureExpiredSlots = timeSlotRepository.findFutureExpiredSlots(today);
            
            if (!futureExpiredSlots.isEmpty()) {
                List<Long> slotIds = futureExpiredSlots.stream()
                        .map(TimeSlot::getId)
                        .collect(Collectors.toList());
                
                // 批量更新状态为AVAILABLE
                timeSlotRepository.batchUpdateStatus(slotIds, TimeSlot.SlotStatus.AVAILABLE);
                
                logger.info("成功重置 {} 个未来日期错误EXPIRED状态的时间段为AVAILABLE状态", futureExpiredSlots.size());
                
                // 记录详细信息
                for (TimeSlot slot : futureExpiredSlots) {
                    logger.warn("重置未来日期错误EXPIRED状态: ID={}, 场馆ID={}, 日期={}, 时间={}-{}", 
                            slot.getId(), slot.getVenueId(), slot.getDate(), 
                            slot.getStartTime(), slot.getEndTime());
                }
            } else {
                logger.debug("没有发现未来日期被错误标记为EXPIRED的时间段");
            }
            
        } catch (Exception e) {
            logger.error("重置未来日期EXPIRED状态时发生错误", e);
        }
    }


    
    /**
     * 每天凌晨3点进行数据一致性检查
     * 检查时间段状态的合理性
     */
    @Scheduled(cron = "0 0 3 * * ?") // 每天凌晨3点执行
    @Transactional(readOnly = true)
    public void performDataConsistencyCheck() {
        try {
            LocalDate today = LocalDate.now();
            LocalDate futureDate = today.plusDays(30); // 检查未来30天的数据
            
            logger.info("开始进行时间段数据一致性检查，检查范围: {} 到 {}", today, futureDate);
            
            // 查找指定日期范围内的所有时间段
            List<TimeSlot> allSlots = timeSlotRepository.findByDateRange(today, futureDate);
            
            int totalSlots = allSlots.size();
            int todaySlots = 0;
            int futureSlots = 0;
            int todayExpiredSlots = 0;
            int futureExpiredSlots = 0;
            int availableSlots = 0;
            int bookedSlots = 0;
            int otherStatusSlots = 0;
            
            LocalTime currentTime = LocalTime.now();
            
            for (TimeSlot slot : allSlots) {
                if (slot.getDate().equals(today)) {
                    todaySlots++;
                    if (slot.getStatus() == TimeSlot.SlotStatus.EXPIRED) {
                        todayExpiredSlots++;
                    }
                } else if (slot.getDate().isAfter(today)) {
                    futureSlots++;
                    if (slot.getStatus() == TimeSlot.SlotStatus.EXPIRED) {
                        futureExpiredSlots++;
                        logger.warn("发现未来日期的EXPIRED状态时间段: ID={}, 日期={}, 时间={}-{}", 
                                slot.getId(), slot.getDate(), slot.getStartTime(), slot.getEndTime());
                    }
                }
                
                switch (slot.getStatus()) {
                    case AVAILABLE:
                        availableSlots++;
                        break;
                    case BOOKED:
                    case OCCUPIED:
                    case RESERVED:
                        bookedSlots++;
                        break;
                    case EXPIRED:
                        // 已在上面统计
                        break;
                    default:
                        otherStatusSlots++;
                        break;
                }
            }
            
            logger.info("数据一致性检查结果:");
            logger.info("总时间段数: {}", totalSlots);
            logger.info("今日时间段数: {}, 其中过期: {}", todaySlots, todayExpiredSlots);
            logger.info("未来时间段数: {}, 其中错误过期: {}", futureSlots, futureExpiredSlots);
            logger.info("可用时间段: {}, 已预订时间段: {}, 其他状态: {}", availableSlots, bookedSlots, otherStatusSlots);
            
            if (futureExpiredSlots > 0) {
                logger.warn("发现 {} 个未来日期被错误标记为EXPIRED的时间段，将在下次重置任务中修复", futureExpiredSlots);
            }
            
        } catch (Exception e) {
            logger.error("数据一致性检查时发生错误", e);
        }
    }
    
    /**
     * 手动触发今日过期时间段检查（用于测试或紧急修复）
     */
    public void manualMarkTodayExpiredTimeSlots() {
        logger.info("手动触发今日过期时间段检查");
        markTodayExpiredTimeSlots();
    }
    
    /**
     * 手动触发未来日期EXPIRED状态重置（用于测试或紧急修复）
     */
    public void manualResetFutureExpiredTimeSlots() {
        logger.info("手动触发未来日期EXPIRED状态重置");
        resetFutureExpiredTimeSlots();
    }
}