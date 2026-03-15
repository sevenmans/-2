package com.example.gymbooking.service;

import com.example.gymbooking.model.Order;
import com.example.gymbooking.model.TimeSlot;
import com.example.gymbooking.model.Venue;
import com.example.gymbooking.repository.OrderRepository;
import com.example.gymbooking.repository.TimeSlotRepository;
import com.example.gymbooking.repository.VenueRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
public class TimeSlotService {

    private static final Logger logger = LoggerFactory.getLogger(TimeSlotService.class);

    @Autowired
    private TimeSlotRepository timeSlotRepository;
    
    @Autowired
    private VenueRepository venueRepository;
    
    @Autowired
    private OrderRepository orderRepository;
    
    /**
     * 获取场馆指定日期的所有时间段
     * 每次调用都会从数据库获取最新数据
     */
    @Transactional
    public List<TimeSlot> getTimeSlotsByVenueAndDate(Long venueId, LocalDate date) {
        logger.info("[DEBUG] Service.getTimeSlotsByVenueAndDate - venueId: {}, date: {}", venueId, date);
        logger.info("[DEBUG] 查询参数类型 - venueId类型: {}, date类型: {}", venueId.getClass().getName(), date.getClass().getName());
        
        // 首先尝试获取现有时间段
        List<TimeSlot> slots = timeSlotRepository.findByVenueIdAndDateOrderByStartTime(venueId, date);
        logger.info("[DEBUG] 从数据库查询到 {} 个时间段", slots.size());
        
        // 详细打印每个时间段的信息
        for (int i = 0; i < Math.min(slots.size(), 3); i++) {
            TimeSlot slot = slots.get(i);
            logger.info("[DEBUG] 时间段[{}] - ID: {}, venueId: {}, date: {}, startTime: {}, endTime: {}, status: {}", 
                       i, slot.getId(), slot.getVenueId(), slot.getDate(), slot.getStartTime(), slot.getEndTime(), slot.getStatus());
        }
        
        // 如果没有时间段，自动生成
        if (slots == null || slots.isEmpty()) {
            logger.info("[DEBUG] 未找到时间段，自动生成...");
            try {
                // 检查日期是否为过去的日期，如果是则不生成时间段
                LocalDate today = LocalDate.now();
                logger.info("[DEBUG] 日期比较 - 请求日期: {}, 今天: {}", date, today);
                if (date.isBefore(today)) {
                    logger.info("[DEBUG] 日期 {} 是过去的日期，不生成时间段", date);
                    slots = List.of();
                } else {
                    logger.info("[DEBUG] 日期 {} 是今天或未来日期，开始生成时间段", date);
                    slots = generateTimeSlotsForVenue(venueId, date);
                    logger.info("[DEBUG] 成功生成 {} 个时间段", (slots != null ? slots.size() : 0));
                }
            } catch (Exception e) {
                logger.error("[DEBUG] 生成时间段失败: {}", e.getMessage(), e);
                // 即使生成失败，也返回空列表而不是错误
                slots = List.of();
            }
        } else {
            logger.info("[DEBUG] 找到 {} 个现有时间段", slots.size());
            if (!slots.isEmpty()) {
                logger.info("[DEBUG] 第一个时间段的日期: {}", slots.get(0).getDate());
                logger.info("[DEBUG] 最后一个时间段的日期: {}", slots.get(slots.size() - 1).getDate());
            }
        }
        
        return slots;
    }
    
    /**
     * 获取场馆指定日期的可用时间段
     */
    public List<TimeSlot> getAvailableTimeSlots(Long venueId, LocalDate date) {
        return timeSlotRepository.findByVenueIdAndDateAndStatus(venueId, date, TimeSlot.SlotStatus.AVAILABLE);
    }
    
    /**
     * 获取指定时间段
     */
    public Optional<TimeSlot> getTimeSlotById(Long id) {
        return timeSlotRepository.findById(id);
    }
    
    /**
     * 为场馆生成指定日期的时间段
     * 按照半小时为单位生成时间段
     */
    @Transactional
    public List<TimeSlot> generateTimeSlotsForVenue(Long venueId, LocalDate date) {
        logger.info("[DEBUG] generateTimeSlotsForVenue - venueId: {}, date: {}", venueId, date);
        
        // 检查场馆是否存在
        Optional<Venue> venueOpt = venueRepository.findById(venueId);
        if (!venueOpt.isPresent()) {
            logger.error("[TimeSlotService] 场馆不存在，ID: {}", venueId);
            throw new RuntimeException("场馆不存在，ID: " + venueId);
        }
        
        Venue venue = venueOpt.get();
        LocalTime openTime = venue.getOpenTime() != null ? venue.getOpenTime() : LocalTime.of(9, 0);
        LocalTime closeTime = venue.getCloseTime() != null ? venue.getCloseTime() : LocalTime.of(22, 0);
        Double hourlyPrice = venue.getPrice();
        
        logger.info("[TimeSlotService] 场馆信息 - 名称: {}, 开放时间: {}-{}, 价格: {}", 
                   venue.getName(), openTime, closeTime, hourlyPrice);
        
        // 检查是否已经生成了时间段
        List<TimeSlot> existingSlots = timeSlotRepository.findByVenueIdAndDate(venueId, date);
        if (!existingSlots.isEmpty()) {
            logger.info("[DEBUG] 已存在 {} 个时间段，直接返回", existingSlots.size());
            return existingSlots; // 已经生成过，直接返回
        }
        
        logger.info("[DEBUG] 开始生成新的时间段...");
        // 生成半小时为单位的时间段
        List<TimeSlot> slots = new ArrayList<>();
        LocalTime currentTime = openTime;
        
        logger.info("[TimeSlotService] 开始生成时间段，从 {} 到 {}", openTime, closeTime);
        
        while (currentTime.isBefore(closeTime)) {
            LocalTime endTime = currentTime.plusMinutes(30);
            if (endTime.isAfter(closeTime)) {
                break;
            }
            
            // 计算半小时的价格
            Double slotPrice = hourlyPrice != null ? hourlyPrice / 2 : 50.0; // 默认价格50元/半小时
            
            TimeSlot slot = new TimeSlot(venueId, date, currentTime, endTime, slotPrice);
            logger.info("[DEBUG] 创建时间段 - date: {}, startTime: {}, endTime: {}", slot.getDate(), slot.getStartTime(), slot.getEndTime());
            slots.add(slot);
            
            currentTime = endTime;
        }
        
        logger.info("[DEBUG] 准备保存 {} 个时间段到数据库", slots.size());
        
        // 保存所有生成的时间段
        List<TimeSlot> savedSlots = timeSlotRepository.saveAll(slots);
        logger.info("[DEBUG] 成功保存 {} 个时间段", savedSlots.size());
        if (!savedSlots.isEmpty()) {
            logger.info("[DEBUG] 保存后第一个时间段的日期: {}", savedSlots.get(0).getDate());
        }
        
        return savedSlots;
    }
    
    /**
     * 预约时间段
     */
    @Transactional
    public List<TimeSlot> bookTimeSlots(Long venueId, LocalDate date, LocalTime startTime, LocalTime endTime, Long orderId) {
        // 检查时间段是否有冲突
        boolean hasConflict = timeSlotRepository.hasConflict(venueId, date, startTime, endTime);
        if (hasConflict) {
            throw new RuntimeException("所选时间段已被预约");
        }
        
        // 获取所有符合条件的时间段
        List<TimeSlot> slots = timeSlotRepository.findAvailableSlots(venueId, date, startTime, endTime);
        if (slots.isEmpty()) {
            // 如果没有找到时间段，尝试生成时间段
            logger.info("没有找到可用时间段，尝试生成时间段...");
            try {
                generateTimeSlotsForVenue(venueId, date);
                // 重新查询
                slots = timeSlotRepository.findAvailableSlots(venueId, date, startTime, endTime);
                if (slots.isEmpty()) {
                    throw new RuntimeException("没有找到可用的时间段");
                }
            } catch (Exception e) {
                logger.error("生成时间段失败: {}", e.getMessage(), e);
                throw new RuntimeException("没有找到可用的时间段");
            }
        }
        
        // 更新时间段状态为已预约
        for (TimeSlot slot : slots) {
            slot.setStatus(TimeSlot.SlotStatus.RESERVED);
            slot.setOrderId(orderId);
        }
        
        return timeSlotRepository.saveAll(slots);
    }
    
    /**
     * 取消预约时间段
     * @param orderId 订单ID
     * @return 被释放的时间段ID列表
     */
    @Transactional
    public List<Long> cancelBooking(Long orderId) {
        List<TimeSlot> slots = timeSlotRepository.findByOrderId(orderId);
        List<Long> releasedTimeSlotIds = new ArrayList<>();
        
        for (TimeSlot slot : slots) {
            slot.setStatus(TimeSlot.SlotStatus.AVAILABLE);
            slot.setOrderId(null);
            releasedTimeSlotIds.add(slot.getId());
        }
        
        timeSlotRepository.saveAll(slots);
        logger.info("成功释放 {} 个时间段，订单ID: {}, 时间段ID: {}", 
                   slots.size(), orderId, releasedTimeSlotIds);
        
        return releasedTimeSlotIds;
    }
    
    /**
     * 更新时间段状态
     */
    @Transactional
    public TimeSlot updateTimeSlotStatus(Long id, TimeSlot.SlotStatus status) {
        return timeSlotRepository.findById(id)
                .map(slot -> {
                    slot.setStatus(status);
                    return timeSlotRepository.save(slot);
                })
                .orElseThrow(() -> new RuntimeException("时间段不存在，ID: " + id));
    }
    
    /**
     * 批量生成未来一周的时间段
     */
    @Transactional
    public void generateTimeSlotsForWeek(Long venueId) {
        LocalDate today = LocalDate.now();
        for (int i = 0; i < 7; i++) {
            LocalDate date = today.plusDays(i);
            generateTimeSlotsForVenue(venueId, date);
        }
    }
    
    /**
     * 计算预约时间段的总价格
     * 返回所有时间段价格的总和
     */
    public Double calculateTotalPrice(List<TimeSlot> slots) {
        if (slots.isEmpty()) {
            return 0.0;
        }
        // 计算所有时间段价格的总和
        return slots.stream()
                .mapToDouble(slot -> slot.getPrice() != null ? slot.getPrice() : 0.0)
                .sum();
    }
    
    /**
     * 检查用户在指定时间是否已有预约
     */
    public boolean hasUserBookingAtTime(String username, LocalDate date, LocalTime startTime, LocalTime endTime) {
        // 构造查询的开始和结束时间
        LocalDateTime queryStartTime = LocalDateTime.of(date, startTime);
        LocalDateTime queryEndTime = LocalDateTime.of(date, endTime);
        
        // 查询用户在该时间段是否有预约
        List<Order> userOrders = orderRepository.findByUsernameAndBookingTimeBetween(
            username, queryStartTime, queryEndTime);
        
        // 检查是否有有效的预约（非取消状态）
        return userOrders.stream()
            .anyMatch(order -> order.getStatus() != Order.OrderStatus.CANCELLED);
    }
    
    /**
     * 检查时间段是否有冲突
     */
    public boolean hasConflict(Long venueId, LocalDate date, LocalTime startTime, LocalTime endTime) {
        return timeSlotRepository.hasConflict(venueId, date, startTime, endTime);
    }
    
    /**
     * 释放时间段，将状态设置为可用
     * 用于拼场订单取消时释放时间段
     */
    @Transactional
    public void releaseTimeSlot(Long venueId, LocalDate date, LocalTime startTime, LocalTime endTime) {
        // 查找指定时间范围内的时间段
        List<TimeSlot> slots = timeSlotRepository.findByVenueIdAndDateAndTimeRange(
            venueId, date, startTime, endTime);

        // 将状态设置为可用
        for (TimeSlot slot : slots) {
            if (slot.getStatus() == TimeSlot.SlotStatus.BOOKED ||
                slot.getStatus() == TimeSlot.SlotStatus.SHARING) {
                slot.setStatus(TimeSlot.SlotStatus.AVAILABLE);
                slot.setOrderId(null); // 清除订单ID
                timeSlotRepository.save(slot);
            }
        }
    }

    /**
     * 获取场馆已生成时间段的日期列表（从指定日期开始）
     * 用于排期管理日期选择限制和营业时间变更同步
     */
    public List<LocalDate> getGeneratedDatesForVenue(Long venueId, LocalDate startDate) {
        return timeSlotRepository.findDistinctDatesByVenueId(venueId, startDate);
    }

    /**
     * 获取场馆所有已生成时间段的日期列表
     * 用于排期管理页面显示可选日期
     */
    public List<LocalDate> getAllGeneratedDatesForVenue(Long venueId) {
        return timeSlotRepository.findAllDistinctDatesByVenueId(venueId);
    }

    /**
     * 检查指定日期是否有被预约的时间段
     * 用于判断是否可以修改该天的时间段
     */
    public boolean hasBookedSlotsOnDate(Long venueId, LocalDate date) {
        return timeSlotRepository.hasBookedSlotsOnDate(venueId, date);
    }

    /**
     * 重新生成指定日期的时间段
     * 删除旧的可用时间段，按照新的营业时间和价格重新生成
     */
    @Transactional
    public void regenerateTimeSlotsForDate(Long venueId, LocalDate date, LocalTime openTime, LocalTime closeTime, Double hourlyPrice) {
        logger.info("[TimeSlotService] 重新生成时间段 - venueId: {}, date: {}, openTime: {}, closeTime: {}, price: {}",
                   venueId, date, openTime, closeTime, hourlyPrice);

        // 删除该天的所有可用时间段（状态为 AVAILABLE、EXPIRED、MAINTENANCE）
        timeSlotRepository.deleteAvailableSlotsOnDate(venueId, date);

        // 生成新的时间段（半小时为单位）
        List<TimeSlot> newSlots = new ArrayList<>();
        LocalTime currentTime = openTime;

        while (currentTime.isBefore(closeTime)) {
            LocalTime endTime = currentTime.plusMinutes(30);
            if (endTime.isAfter(closeTime)) {
                break;
            }

            // 计算半小时的价格
            Double slotPrice = hourlyPrice != null ? hourlyPrice / 2 : 50.0;

            TimeSlot slot = new TimeSlot(venueId, date, currentTime, endTime, slotPrice);
            newSlots.add(slot);

            currentTime = endTime;
        }

        // 保存新生成的时间段
        List<TimeSlot> savedSlots = timeSlotRepository.saveAll(newSlots);
        logger.info("[TimeSlotService] 重新生成完成，共 {} 个时间段", savedSlots.size());
    }

    /**
     * 删除场馆的所有时间段（用于删除场馆时）
     */
    @Transactional
    public void deleteAllByVenueId(Long venueId) {
        logger.info("[TimeSlotService] 删除场馆 {} 的所有时间段", venueId);
        timeSlotRepository.deleteByVenueId(venueId);
        logger.info("[TimeSlotService] 场馆 {} 的时间段删除完成", venueId);
    }
}