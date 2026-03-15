package com.example.gymbooking.service;

import com.example.gymbooking.model.Venue;
import com.example.gymbooking.repository.VenueRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class VenueService {

    @Autowired
    private VenueRepository venueRepository;
    
    @Autowired
    private TimeSlotService timeSlotService;
    
    /**
     * 获取所有场馆
     */
    public List<Venue> getAllVenues() {
        return venueRepository.findAll();
    }
    
    /**
     * 分页获取场馆
     */
    public Page<Venue> getVenues(Pageable pageable) {
        return venueRepository.findAll(pageable);
    }
    
    /**
     * 根据ID获取场馆
     */
    public Optional<Venue> getVenueById(Long id) {
        return venueRepository.findById(id);
    }
    
    /**
     * 创建新场馆
     */
    @Transactional
    public Venue createVenue(Venue venue) {
        // 使用前端传入的 supportSharing 值，如果未设置则根据场馆类型判断默认值
        if (venue.getSupportSharing() == null) {
            // 如果是足球或篮球场，默认支持拼场
            boolean defaultSharing = "足球".equals(venue.getType()) || "篮球".equals(venue.getType());
            venue.setSupportSharing(defaultSharing);
        }
        Venue savedVenue = venueRepository.save(venue);

        // 创建场馆后自动生成未来一周的时间段
        try {
            System.out.println("[VenueService] 场馆创建成功，开始自动生成时间段，场馆ID: " + savedVenue.getId());
            timeSlotService.generateTimeSlotsForWeek(savedVenue.getId());
            System.out.println("[VenueService] 自动生成时间段完成");
        } catch (Exception e) {
            System.err.println("[VenueService] 自动生成时间段失败: " + e.getMessage());
            // 不影响场馆创建，只记录日志
        }

        return savedVenue;
    }
    
    /**
     * 更新场馆信息
     */
    @Transactional
    public Venue updateVenue(Long id, Venue venueDetails) {
        return venueRepository.findById(id)
                .map(venue -> {
                    // 记录旧的营业时间，用于判断是否需要更新时间段
                    LocalTime oldOpenTime = venue.getOpenTime();
                    LocalTime oldCloseTime = venue.getCloseTime();
                    Double oldPrice = venue.getPrice();

                    venue.setName(venueDetails.getName());
                    venue.setType(venueDetails.getType());
                    venue.setLocation(venueDetails.getLocation());
                    venue.setDescription(venueDetails.getDescription());
                    venue.setFacilities(venueDetails.getFacilities());
                    venue.setPhotos(venueDetails.getPhotos());
                    venue.setPrice(venueDetails.getPrice());
                    venue.setStatus(venueDetails.getStatus());
                    venue.setOpenTime(venueDetails.getOpenTime());
                    venue.setCloseTime(venueDetails.getCloseTime());

                    // 使用前端传入的 supportSharing 值
                    venue.setSupportSharing(venueDetails.getSupportSharing() != null
                            ? venueDetails.getSupportSharing()
                            : false);

                    Venue savedVenue = venueRepository.save(venue);

                    // 检查营业时间或价格是否发生变化
                    boolean timeChanged = !java.util.Objects.equals(oldOpenTime, venueDetails.getOpenTime())
                            || !java.util.Objects.equals(oldCloseTime, venueDetails.getCloseTime());
                    boolean priceChanged = !java.util.Objects.equals(oldPrice, venueDetails.getPrice());

                    if (timeChanged || priceChanged) {
                        System.out.println("[VenueService] 检测到营业时间或价格变化，开始同步更新时间段...");
                        System.out.println("[VenueService] 旧时间: " + oldOpenTime + "-" + oldCloseTime + ", 新时间: " + venueDetails.getOpenTime() + "-" + venueDetails.getCloseTime());
                        System.out.println("[VenueService] 旧价格: " + oldPrice + ", 新价格: " + venueDetails.getPrice());

                        // 同步更新已生成的时间段（只更新没有预约的日期）
                        syncTimeSlotsAfterBusinessHoursChange(id, venueDetails.getOpenTime(),
                                venueDetails.getCloseTime(), venueDetails.getPrice());
                    }

                    return savedVenue;
                })
                .orElseThrow(() -> new RuntimeException("场馆不存在，ID: " + id));
    }

    /**
     * 营业时间变更后同步更新时间段
     * 只更新没有预约的日期，避免影响已预约订单
     */
    @Transactional
    public void syncTimeSlotsAfterBusinessHoursChange(Long venueId, LocalTime newOpenTime, LocalTime newCloseTime, Double newPrice) {
        LocalDate today = LocalDate.now();

        // 获取该场馆所有已生成时间段的日期（从今天开始）
        List<LocalDate> datesWithSlots = timeSlotService.getGeneratedDatesForVenue(venueId, today);

        int updatedDays = 0;
        int skippedDays = 0;

        for (LocalDate date : datesWithSlots) {
            // 检查该天是否有被预约的时间段
            boolean hasBookings = timeSlotService.hasBookedSlotsOnDate(venueId, date);

            if (hasBookings) {
                System.out.println("[VenueService] 日期 " + date + " 有预约，跳过更新");
                skippedDays++;
                continue;
            }

            // 删除该天的所有可用时间段，然后重新生成
            System.out.println("[VenueService] 日期 " + date + " 无预约，重新生成时间段");
            timeSlotService.regenerateTimeSlotsForDate(venueId, date, newOpenTime, newCloseTime, newPrice);
            updatedDays++;
        }

        System.out.println("[VenueService] 时间段同步完成: 更新了 " + updatedDays + " 天, 跳过了 " + skippedDays + " 天(有预约)");
    }
    
    /**
     * 删除场馆
     */
    @Transactional
    public void deleteVenue(Long id) {
        // 先删除关联的所有时间段
        System.out.println("[VenueService] 删除场馆 ID: " + id + "，开始清理关联时间段...");
        timeSlotService.deleteAllByVenueId(id);
        System.out.println("[VenueService] 关联时间段清理完成，删除场馆...");
        // 再删除场馆
        venueRepository.deleteById(id);
        System.out.println("[VenueService] 场馆删除完成");
    }
    
    /**
     * 批量更新场馆的拼场支持状态
     * 确保所有篮球和足球场都支持拼场
     */
    @Transactional
    public void updateSharingSupportForAllVenues() {
        List<Venue> allVenues = venueRepository.findAll();
        for (Venue venue : allVenues) {
            String type = venue.getType();
            if (type != null && (type.contains("足球") || type.contains("篮球"))) {
                venue.setSupportSharing(true);
            } else {
                venue.setSupportSharing(false);
            }
            venueRepository.save(venue);
        }
    }
    
    /**
     * 更新场馆状态
     */
    @Transactional
    public Venue updateVenueStatus(Long id, Venue.VenueStatus status) {
        return venueRepository.findById(id)
                .map(venue -> {
                    venue.setStatus(status);
                    return venueRepository.save(venue);
                })
                .orElseThrow(() -> new RuntimeException("场馆不存在，ID: " + id));
    }
    
    /**
     * 根据类型查询场馆
     */
    public List<Venue> getVenuesByType(String type) {
        return venueRepository.findByType(type);
    }
    
    /**
     * 根据状态查询场馆
     */
    public List<Venue> getVenuesByStatus(Venue.VenueStatus status) {
        return venueRepository.findByStatus(status);
    }
    
    /**
     * 根据类型和状态查询场馆
     */
    public List<Venue> getVenuesByTypeAndStatus(String type, Venue.VenueStatus status) {
        return venueRepository.findByTypeAndStatus(type, status);
    }
    
    /**
     * 根据管理员ID查询场馆
     */
    public List<Venue> getVenuesByManagerId(Long managerId) {
        return venueRepository.findByManagerId(managerId);
    }
    
    /**
     * 搜索场馆
     */
    public List<Venue> searchVenues(String keyword) {
        return venueRepository.findByNameOrLocationContaining(keyword);
    }
    
    /**
     * 获取所有场馆类型
     */
    public List<String> getAllVenueTypes() {
        return venueRepository.findDistinctTypes();
    }
    
    /**
     * 获取支持拼场的场馆
     */
    public List<Venue> getSharingVenues() {
        return venueRepository.findBySupportSharing(true);
    }
    
    /**
     * 获取场馆可用时间段
     * 查询实际的时间段数据和预约状态
     */
    public Map<String, Object> getAvailableTimeSlots(Long venueId, LocalDate date) {
        Optional<Venue> venueOpt = venueRepository.findById(venueId);
        if (!venueOpt.isPresent()) {
            throw new RuntimeException("场馆不存在，ID: " + venueId);
        }
        
        // 首先尝试从TimeSlot表获取已存在的时间段
        List<com.example.gymbooking.model.TimeSlot> existingSlots = 
            timeSlotService.getTimeSlotsByVenueAndDate(venueId, date);
        
        List<Map<String, Object>> slots = new ArrayList<>();
        
        if (!existingSlots.isEmpty()) {
            // 如果存在时间段数据，直接使用
            for (com.example.gymbooking.model.TimeSlot slot : existingSlots) {
                Map<String, Object> slotMap = new HashMap<>();
                slotMap.put("id", slot.getId());
                slotMap.put("startTime", slot.getStartTime().toString());
                slotMap.put("endTime", slot.getEndTime().toString());
                slotMap.put("price", slot.getPrice());
                slotMap.put("status", slot.getStatus().name());
                slots.add(slotMap);
            }
        } else {
            // 如果没有时间段数据，生成默认时间段
            Venue venue = venueOpt.get();
            LocalTime openTime = venue.getOpenTime() != null ? venue.getOpenTime() : LocalTime.of(9, 0);
            LocalTime closeTime = venue.getCloseTime() != null ? venue.getCloseTime() : LocalTime.of(22, 0);
            
            LocalTime currentTime = openTime;
            while (currentTime.isBefore(closeTime)) {
                LocalTime endTime = currentTime.plusMinutes(30);
                if (endTime.isAfter(closeTime)) {
                    break;
                }
                
                Map<String, Object> slot = new HashMap<>();
                slot.put("startTime", currentTime.toString());
                slot.put("endTime", endTime.toString());
                slot.put("price", venue.getPrice() / 2); // 半小时价格
                slot.put("status", "AVAILABLE"); // 默认可用状态
                
                slots.add(slot);
                currentTime = endTime;
            }
        }
        
        Map<String, Object> result = new HashMap<>();
        result.put("venueId", venueId);
        result.put("date", date.toString());
        result.put("slots", slots);
        
        return result;
    }
    
    /**
     * 分配管理员到场馆
     */
    @Transactional
    public Venue assignManager(Long venueId, Long managerId) {
        return venueRepository.findById(venueId)
                .map(venue -> {
                    venue.setManagerId(managerId);
                    return venueRepository.save(venue);
                })
                .orElseThrow(() -> new RuntimeException("场馆不存在，ID: " + venueId));
    }
}