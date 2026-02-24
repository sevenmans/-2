package com.example.gymbooking.service;

import com.example.gymbooking.model.Order;
import com.example.gymbooking.model.SharingOrder;
import com.example.gymbooking.model.SharingRequest;
import com.example.gymbooking.model.TimeSlot;
import com.example.gymbooking.model.Venue;
import com.example.gymbooking.repository.OrderRepository;
import com.example.gymbooking.repository.SharingOrderRepository;
import com.example.gymbooking.repository.SharingRequestRepository;
import com.example.gymbooking.repository.TimeSlotRepository;
import com.example.gymbooking.repository.VenueRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

@Service
public class SharingOrderService {
    private static final Logger logger = LoggerFactory.getLogger(SharingOrderService.class);
    
    @Autowired
    private SharingOrderRepository sharingOrderRepository;

    @Autowired
    private VenueRepository venueRepository;

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private SharingRequestRepository sharingRequestRepository;

    @Autowired
    private TimeSlotRepository timeSlotRepository;

    @Autowired
    private TimeSlotService timeSlotService;

    @Autowired
    private OrderService orderService;
    
    /**
     * 获取所有拼场订单（按创建时间倒序排列）
     */
    public List<SharingOrder> getAllSharingOrders() {
        List<SharingOrder> orders = sharingOrderRepository.findAll();
        // 按创建时间倒序排列
        orders.sort((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()));
        return orders;
    }
    
    /**
     * 根据ID获取拼场订单
     */
    public Optional<SharingOrder> getSharingOrderById(Long id) {
        return sharingOrderRepository.findById(id);
    }
    
    /**
     * 根据订单号获取拼场订单
     */
    public SharingOrder getSharingOrderByOrderNo(String orderNo) {
        return sharingOrderRepository.findByOrderNo(orderNo);
    }
    
    /**
     * 创建拼场订单
     */
    @Transactional
    public SharingOrder createSharingOrder(SharingOrder sharingOrder) {
        // 如果提供了orderId，从原始订单获取正确的时间和价格信息
        if (sharingOrder.getOrderId() != null) {
            Optional<Order> originalOrderOpt = orderService.getOrderById(sharingOrder.getOrderId());
            if (originalOrderOpt.isPresent()) {
                Order originalOrder = originalOrderOpt.get();
                // 使用原始订单的时间信息（bookingTime和endTime字段）
                if (originalOrder.getBookingTime() != null) {
                    sharingOrder.setBookingDate(originalOrder.getBookingTime().toLocalDate());
                    // 使用原始订单的实际时间段
                    LocalTime startTime = originalOrder.getBookingTime().toLocalTime();
                    sharingOrder.setStartTime(startTime);
                    // 使用原始订单的实际结束时间
                    LocalTime endTime;
                    if (originalOrder.getEndDateTime() != null) {
                        endTime = originalOrder.getEndDateTime().toLocalTime();
                    } else {
                        // 如果没有设置结束时间，则使用开始时间加2小时作为默认值
                        endTime = startTime.plusHours(2);
                    }
                    sharingOrder.setEndTime(endTime);
                    logger.info("设置拼场订单时间 - 原订单开始时间: {}, 原订单结束时间: {}, 拼场订单日期: {}, 拼场订单开始: {}, 拼场订单结束: {}", 
                               originalOrder.getBookingTime(), originalOrder.getEndDateTime(), 
                               sharingOrder.getBookingDate(), startTime, endTime);
                }
                // 计算拼场价格：原订单总价的一半，作为每队费用
                // 使用BigDecimal确保精度
                BigDecimal totalPrice = BigDecimal.valueOf(originalOrder.getTotalPrice());
                BigDecimal pricePerTeam = totalPrice.divide(BigDecimal.valueOf(2), 2, RoundingMode.HALF_UP);
                
                // 直接设置每队费用和总费用
                sharingOrder.setPricePerTeam(pricePerTeam.doubleValue());
                sharingOrder.setTotalPrice(originalOrder.getTotalPrice());
                logger.info("拼场价格计算 - 原订单总价: {}, 每队费用: {}", 
                           originalOrder.getTotalPrice(), pricePerTeam);
            }
        }
        
        // 检查场馆是否存在
        Optional<Venue> venueOpt = venueRepository.findById(sharingOrder.getVenueId());
        if (!venueOpt.isPresent()) {
            throw new RuntimeException("场馆不存在，ID: " + sharingOrder.getVenueId());
        }
        
        Venue venue = venueOpt.get();
        
        // 检查场馆是否支持拼场
        if (!venue.getSupportSharing()) {
            throw new RuntimeException("该场馆不支持拼场");
        }
        
        // 只有篮球场和足球场支持拼场
        if (!"篮球".equals(venue.getType()) && !"足球".equals(venue.getType())) {
            throw new RuntimeException("只有篮球场和足球场支持拼场");
        }
        
        // 数据验证
        if (sharingOrder.getBookingDate() == null) {
            throw new RuntimeException("预约日期不能为空");
        }
        if (sharingOrder.getStartTime() == null) {
            throw new RuntimeException("开始时间不能为空");
        }
        if (sharingOrder.getEndTime() == null) {
            throw new RuntimeException("结束时间不能为空");
        }
        if (sharingOrder.getStartTime().isAfter(sharingOrder.getEndTime())) {
            throw new RuntimeException("开始时间不能晚于结束时间");
        }
        if (sharingOrder.getMaxParticipants() == null || sharingOrder.getMaxParticipants() < 2) {
            throw new RuntimeException("最大参与人数不能少于2人");
        }
        if (sharingOrder.getPricePerTeam() == null || sharingOrder.getPricePerTeam() <= 0) {
            throw new RuntimeException("每队价格必须大于0");
        }
        if (sharingOrder.getTotalPrice() == null || sharingOrder.getTotalPrice() <= 0) {
            throw new RuntimeException("总价格必须大于0");
        }
        
        // 检查时间限制：只有距离开场三个小时以外的时间段才能发起拼场
        LocalDateTime bookingDateTime = LocalDateTime.of(sharingOrder.getBookingDate(), sharingOrder.getStartTime());
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime threeHoursLater = now.plusHours(3);
        
        if (bookingDateTime.isBefore(threeHoursLater)) {
            throw new RuntimeException("只能预约3小时后的时间段进行拼场");
        }
        
        // 检查预约日期不能是过去的日期
        if (sharingOrder.getBookingDate().isBefore(now.toLocalDate())) {
            throw new RuntimeException("不能预约过去的日期");
        }
        
        // 检查时间段是否有冲突
        boolean hasConflict = timeSlotService.hasConflict(
                sharingOrder.getVenueId(),
                sharingOrder.getBookingDate(),
                sharingOrder.getStartTime(),
                sharingOrder.getEndTime());
        
        if (hasConflict) {
            throw new RuntimeException("所选时间段已被预约");
        }
        
        // 检查是否已存在相同时间段的拼场订单
        List<SharingOrder> overlappingOrders = sharingOrderRepository.findOverlappingOrders(
                sharingOrder.getVenueId(),
                sharingOrder.getBookingDate(),
                sharingOrder.getStartTime(),
                sharingOrder.getEndTime());
        
        if (!overlappingOrders.isEmpty()) {
            throw new RuntimeException("该时间段已存在拼场订单");
        }
        
        // 设置场馆名称
        sharingOrder.setVenueName(venue.getName());
        
        // 保存拼场订单
        return sharingOrderRepository.save(sharingOrder);
    }
    
    /**
     * 加入拼场订单
     */
    @Transactional
    public SharingOrder joinSharingOrder(Long id, String username) {
        return sharingOrderRepository.findById(id)
                .map(order -> {
                    if (order.getStatus() != SharingOrder.SharingOrderStatus.OPEN) {
                        throw new RuntimeException("该拼场订单不可加入");
                    }
                    
                    // 检查是否有人数限制，如果有限制且已满则不能加入
                    if (order.getMaxParticipants() != null && order.getCurrentParticipants() >= order.getMaxParticipants()) {
                        throw new RuntimeException("该拼场订单已满");
                    }
                    
                    // 检查用户是否已有预约
                    boolean hasBooking = timeSlotService.hasUserBookingAtTime(
                            username,
                            order.getBookingDate(),
                            order.getStartTime(),
                            order.getEndTime());
                    
                    if (hasBooking) {
                        throw new RuntimeException("您在该时间段已有预约");
                    }
                    
                    // 添加参与者
                    order.addParticipant();
                    
                    // 球队拼场逻辑：需要达到maxParticipants才算拼场成功
                    // 将订单状态更新为拼场成功
                    if (order.getMaxParticipants() != null && order.getCurrentParticipants() >= order.getMaxParticipants()) {
                        order.setStatus(SharingOrder.SharingOrderStatus.CONFIRMED);
                        
                        // 更新关联的主订单状态为拼场成功（如果有关联的主订单）
                        if (order.getOrderId() != null) {
                            orderService.updateOrderStatusToSharingSuccess(order.getOrderId());
                        }
                    }
                    
                    return sharingOrderRepository.save(order);
                })
                .orElseThrow(() -> new RuntimeException("拼场订单不存在，ID: " + id));
    }
    
    /**
     * 取消加入拼场订单
     */
    @Transactional
    public SharingOrder cancelJoinSharingOrder(Long id, String username) {
        return sharingOrderRepository.findById(id)
                .map(order -> {
                    // 创建者不能取消加入
                    if (order.getCreatorUsername().equals(username)) {
                        throw new RuntimeException("创建者不能取消加入");
                    }
                    
                    if (order.getStatus() != SharingOrder.SharingOrderStatus.OPEN && 
                        order.getStatus() != SharingOrder.SharingOrderStatus.FULL) {
                        throw new RuntimeException("该拼场订单不可取消加入");
                    }
                    
                    // 移除参与者
                    order.removeParticipant();
                    return sharingOrderRepository.save(order);
                })
                .orElseThrow(() -> new RuntimeException("拼场订单不存在，ID: " + id));
    }
    
    /**
     * 确认拼场订单
     */
    @Transactional
    public SharingOrder confirmSharingOrder(Long id) {
        return sharingOrderRepository.findById(id)
                .map(order -> {
                    if (order.getStatus() != SharingOrder.SharingOrderStatus.OPEN && 
                        order.getStatus() != SharingOrder.SharingOrderStatus.FULL) {
                        throw new RuntimeException("该拼场订单不可确认");
                    }
                    
                    // 确认订单
                    order.confirm();
                    return sharingOrderRepository.save(order);
                })
                .orElseThrow(() -> new RuntimeException("拼场订单不存在，ID: " + id));
    }
    
    /**
     * 取消拼场订单
     */
    @Transactional
    public SharingOrder cancelSharingOrder(Long id) {
        return sharingOrderRepository.findById(id)
                .map(order -> {
                    if (order.getStatus() == SharingOrder.SharingOrderStatus.CONFIRMED ||
                        order.getStatus() == SharingOrder.SharingOrderStatus.CANCELLED ||
                        order.getStatus() == SharingOrder.SharingOrderStatus.EXPIRED) {
                        throw new RuntimeException("该拼场订单不可取消");
                    }

                    logger.info("开始取消拼场订单，ID: {}, 关联订单ID: {}", id, order.getOrderId());

                    // 1. 取消拼场订单
                    order.cancel();
                    SharingOrder savedOrder = sharingOrderRepository.save(order);

                    // 2. 同步取消关联的原始订单（如果存在）
                    if (order.getOrderId() != null) {
                        try {
                            Optional<Order> originalOrderOpt = orderRepository.findById(order.getOrderId());
                            if (originalOrderOpt.isPresent()) {
                                Order originalOrder = originalOrderOpt.get();
                                logger.info("找到关联的原始订单，ID: {}, 当前状态: {}", originalOrder.getId(), originalOrder.getStatus());

                                // 只有在订单未完成的情况下才取消
                                if (originalOrder.getStatus() != Order.OrderStatus.CANCELLED &&
                                    originalOrder.getStatus() != Order.OrderStatus.COMPLETED &&
                                    originalOrder.getStatus() != Order.OrderStatus.EXPIRED) {

                                    // 🔥 修复：在取消订单前，保存原始时间信息
                                    if (originalOrder.getOriginalStartTime() == null || originalOrder.getOriginalEndTime() == null) {
                                        try {
                                            List<TimeSlot> orderTimeSlots = timeSlotRepository.findByOrderId(originalOrder.getId());
                                            if (!orderTimeSlots.isEmpty()) {
                                                // 找到最早的开始时间和最晚的结束时间
                                                LocalTime earliestStart = orderTimeSlots.stream()
                                                    .map(TimeSlot::getStartTime)
                                                    .min(LocalTime::compareTo)
                                                    .orElse(originalOrder.getBookingTime().toLocalTime());

                                                LocalTime latestEnd = orderTimeSlots.stream()
                                                    .map(TimeSlot::getEndTime)
                                                    .max(LocalTime::compareTo)
                                                    .orElse(originalOrder.getBookingTime().toLocalTime().plusHours(1));

                                                // 保存原始时间信息
                                                originalOrder.setOriginalStartTime(earliestStart);
                                                originalOrder.setOriginalEndTime(latestEnd);

                                                logger.info("🔴 保存拼场订单{}关联的原始订单{}的原始时间信息: {} - {}",
                                                           id, originalOrder.getId(), earliestStart, latestEnd);
                                            }
                                        } catch (Exception e) {
                                            logger.warn("保存原始订单{}的原始时间信息失败: {}", originalOrder.getId(), e.getMessage());
                                        }
                                    }

                                    originalOrder.setStatus(Order.OrderStatus.CANCELLED);
                                    orderRepository.save(originalOrder);
                                    logger.info("原始订单已同步取消，订单ID: {}", originalOrder.getId());

                                    // 3. 释放时间段
                                    timeSlotService.cancelBooking(originalOrder.getId());
                                    logger.info("时间段已释放，订单ID: {}", originalOrder.getId());
                                } else {
                                    logger.info("原始订单状态为 {}，无需取消", originalOrder.getStatus());
                                }
                            } else {
                                logger.warn("未找到拼场订单关联的原始订单，订单ID: {}", order.getOrderId());
                            }
                        } catch (Exception e) {
                            logger.error("同步取消原始订单失败: {}", e.getMessage(), e);
                            // 不影响拼场订单的取消，只记录错误
                        }
                    }

                    // 4. 处理相关的拼场申请（将待处理的申请标记为已取消）
                    if (order.getOrderId() != null) {
                        try {
                            List<SharingRequest> pendingRequests = sharingRequestRepository.findByOrderIdAndStatus(
                                order.getOrderId(), SharingRequest.RequestStatus.PENDING);

                            for (SharingRequest request : pendingRequests) {
                                request.setStatus(SharingRequest.RequestStatus.CANCELLED);
                                request.setResponseMessage("拼场订单已被创建者取消");
                            }

                            if (!pendingRequests.isEmpty()) {
                                sharingRequestRepository.saveAll(pendingRequests);
                                logger.info("已取消 {} 个相关的拼场申请", pendingRequests.size());
                            }
                        } catch (Exception e) {
                            logger.error("处理相关拼场申请失败: {}", e.getMessage(), e);
                            // 不影响拼场订单的取消，只记录错误
                        }
                    }

                    logger.info("拼场订单取消完成，ID: {}", id);
                    return savedOrder;
                })
                .orElseThrow(() -> new RuntimeException("拼场订单不存在，ID: " + id));
    }
    
    /**
     * 获取可加入的拼场订单
     */
    public List<SharingOrder> getJoinableSharingOrders() {
        return sharingOrderRepository.findJoinableSharingOrders();
    }
    
    /**
     * 获取指定场馆可加入的拼场订单
     */
    public List<SharingOrder> getJoinableSharingOrdersByVenueId(Long venueId) {
        return sharingOrderRepository.findJoinableSharingOrdersByVenueId(venueId);
    }
    
    /**
     * 获取指定日期可加入的拼场订单
     */
    public List<SharingOrder> getJoinableSharingOrdersByDate(LocalDate date) {
        return sharingOrderRepository.findJoinableSharingOrdersByDate(date);
    }
    
    /**
     * 获取指定场馆和日期可加入的拼场订单
     */
    public List<SharingOrder> getJoinableSharingOrdersByVenueIdAndDate(Long venueId, LocalDate date) {
        return sharingOrderRepository.findJoinableSharingOrdersByVenueIdAndDate(venueId, date);
    }
    
    /**
     * 获取用户创建的拼场订单
     */
    public List<SharingOrder> getSharingOrdersByCreator(String username) {
        return sharingOrderRepository.findByCreatorUsername(username);
    }
    
    /**
     * 获取用户创建的指定状态的拼场订单
     */
    public List<SharingOrder> getSharingOrdersByCreatorAndStatus(String username, SharingOrder.SharingOrderStatus status) {
        return sharingOrderRepository.findByCreatorUsernameAndStatus(username, status);
    }
    
    /**
     * 处理过期的拼场订单（定时任务）
     * @return 处理的订单数量
     */
    @Transactional
    public int processExpiringSharingOrders() {
        LocalDate today = LocalDate.now();
        List<SharingOrder> expiringOrders = sharingOrderRepository.findExpiringSharingOrders(today);
        
        for (SharingOrder order : expiringOrders) {
            order.setStatus(SharingOrder.SharingOrderStatus.EXPIRED);
        }
        
        sharingOrderRepository.saveAll(expiringOrders);
        return expiringOrders.size();
    }
    
    /**
     * 更新拼场订单
     */
    @Transactional
    public SharingOrder updateSharingOrder(SharingOrder sharingOrder) {
        return sharingOrderRepository.save(sharingOrder);
    }
}