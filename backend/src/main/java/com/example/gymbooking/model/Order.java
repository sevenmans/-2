package com.example.gymbooking.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.LocalDateTime;
import java.time.LocalDate;
import java.time.LocalTime;

@Entity
@Table(name = "`order`")  // 使用反引号转义表名
@NoArgsConstructor
@AllArgsConstructor
public class Order {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false, length = 50)
    private String username;
    
    @Column(name = "venue_id", nullable = false)
    private Long venueId;
    
    @Column(name = "booking_time", nullable = false)
    private LocalDateTime bookingTime;
    
    @Column(name = "end_time")
    private LocalDateTime endTime;
    
    @Column(name = "total_price", nullable = false)
    private Double totalPrice;
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private OrderStatus status = OrderStatus.PENDING;
    
    @Column(name = "order_no", unique = true, nullable = false, length = 50)
    private String orderNo;
    
    @Column(name = "venue_name", length = 100)
    private String venueName;
    
    @Column(name = "created_at", updatable = false, nullable = false)
    private LocalDateTime createdAt;
    
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
    
    // 拼场相关字段
    @Enumerated(EnumType.STRING)
    @Column(name = "booking_type", nullable = false, length = 20)
    private BookingType bookingType = BookingType.EXCLUSIVE;
    
    @Column(name = "max_participants")
    private Integer maxParticipants;
    
    @Column(name = "current_participants")
    private Integer currentParticipants = 1;
    
    @Column(name = "allow_sharing")
    private Boolean allowSharing = false;
    
    @Column(name = "contact_info", length = 100)
    private String contactInfo;
    
    @Column(name = "team_name", length = 50)
    private String teamName;
    
    @Column(name = "description", length = 500)
    private String description;
    
    // 场地相关字段
    @Column(name = "field_id", nullable = true)
    private Long fieldId;
    
    @Column(name = "field_name", length = 100, nullable = true)
    private String fieldName;

    // 原始时间信息（用于已取消订单的时间显示）
    @Column(name = "original_start_time", nullable = true)
    private LocalTime originalStartTime;

    @Column(name = "original_end_time", nullable = true)
    private LocalTime originalEndTime;

    @PrePersist
    protected void onCreate() {
        if (this.orderNo == null) {
            this.orderNo = generateOrderNo();
        }
        LocalDateTime now = LocalDateTime.now();
        if (this.createdAt == null) {
            this.createdAt = now;
        }
        this.updatedAt = now;
        
        // 确保金额保留两位小数
        if (this.totalPrice != null) {
            this.totalPrice = Math.round(this.totalPrice * 100.0) / 100.0;
        }
    }
    
    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
        
        // 确保金额保留两位小数
        if (this.totalPrice != null) {
            this.totalPrice = Math.round(this.totalPrice * 100.0) / 100.0;
        }
    }
    
    public enum OrderStatus {
        // 基础状态（所有订单通用）
        PENDING("待支付"),
        PAID("已支付"),
        CONFIRMED("已确认"),
        VERIFIED("已核销"),
        COMPLETED("已完成"),
        CANCELLED("已取消"),
        EXPIRED("已过期"),

        // 拼场订单特有状态
        OPEN("开放中"),                    // 发起者已支付，等待申请者
        APPROVED_PENDING_PAYMENT("已批准待支付"), // 申请被批准，等待申请者支付
        SHARING_SUCCESS("拼场成功"),        // 双方都已支付，拼场成功
        PENDING_FULL("待满员"),            // 保留，用于多人拼场场景
        FULL("已满员");

        private final String description;

        OrderStatus(String description) {
            this.description = description;
        }

        public String getDescription() {
            return description;
        }

        /**
         * 检查是否为拼场相关状态
         */
        public boolean isSharingStatus() {
            return this == OPEN || this == APPROVED_PENDING_PAYMENT || this == SHARING_SUCCESS ||
                   this == PENDING_FULL || this == FULL;
        }

        /**
         * 检查是否为可支付状态
         */
        public boolean isPayable() {
            return this == PENDING;
        }

        /**
         * 检查是否为可取消状态
         */
        public boolean isCancellable() {
            return this == PENDING || this == PAID || this == CONFIRMED ||
                   this == OPEN || this == APPROVED_PENDING_PAYMENT || this == PENDING_FULL;
        }

        /**
         * 检查是否为终态（不可再变更）
         */
        public boolean isFinalState() {
            return this == COMPLETED || this == CANCELLED || this == EXPIRED;
        }
    }
    
    public enum BookingType {
        EXCLUSIVE("独享"),
        SHARED("拼场");
        
        private final String description;
        
        BookingType(String description) {
            this.description = description;
        }
        
        public String getDescription() {
            return description;
        }
    }
    
    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public Long getVenueId() {
        return venueId;
    }

    public void setVenueId(Long venueId) {
        this.venueId = venueId;
    }

    public LocalDateTime getBookingTime() {
        return bookingTime;
    }

    public void setBookingTime(LocalDateTime bookingTime) {
        this.bookingTime = bookingTime;
    }

    public Double getTotalPrice() {
        return totalPrice;
    }

    public void setTotalPrice(Double totalPrice) {
        this.totalPrice = totalPrice;
    }

    public OrderStatus getStatus() {
        return status;
    }

    public void setStatus(OrderStatus status) {
        this.status = status;
    }

    public String getOrderNo() {
        return orderNo;
    }

    public void setOrderNo(String orderNo) {
        this.orderNo = orderNo;
    }

    public String getVenueName() {
        return venueName;
    }

    public void setVenueName(String venueName) {
        this.venueName = venueName;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public BookingType getBookingType() {
        return bookingType;
    }

    public void setBookingType(BookingType bookingType) {
        this.bookingType = bookingType;
    }

    public Integer getMaxParticipants() {
        return maxParticipants;
    }

    public void setMaxParticipants(Integer maxParticipants) {
        this.maxParticipants = maxParticipants;
    }

    public Integer getCurrentParticipants() {
        return currentParticipants;
    }

    public void setCurrentParticipants(Integer currentParticipants) {
        this.currentParticipants = currentParticipants;
    }

    public Boolean getAllowSharing() {
        return allowSharing;
    }

    public void setAllowSharing(Boolean allowSharing) {
        this.allowSharing = allowSharing;
    }

    public String getContactInfo() {
        return contactInfo;
    }

    public void setContactInfo(String contactInfo) {
        this.contactInfo = contactInfo;
    }

    public String getTeamName() {
        return teamName;
    }

    public void setTeamName(String teamName) {
        this.teamName = teamName;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public Long getFieldId() {
        return fieldId;
    }

    public void setFieldId(Long fieldId) {
        this.fieldId = fieldId;
    }

    public String getFieldName() {
        return fieldName;
    }

    public void setFieldName(String fieldName) {
        this.fieldName = fieldName;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }

    // ========== 时间字段映射方法 ==========
    // 说明：由于历史原因，数据库字段命名存在歧义：
    // - booking_time 实际存储的是开始时间（不是预订时间）
    // - created_at 存储的是订单创建时间（真正的预订时间）
    // 以下方法提供清晰的字段映射

    /**
     * 获取预订日期（从开始时间中提取日期部分）
     * 数据来源：booking_time字段的日期部分
     */
    @JsonProperty("bookingdate")
    public LocalDate getBookingDate() {
        return bookingTime != null ? bookingTime.toLocalDate() : null;
    }

    /**
     * 获取开始时间（时分秒部分）
     * 数据来源：booking_time字段的时间部分
     */
    @JsonProperty("starttime")
    public LocalTime getStartTime() {
        return bookingTime != null ? bookingTime.toLocalTime() : null;
    }

    /**
     * 获取结束时间（时分秒部分）
     * 数据来源：end_time字段的时间部分
     */
    @JsonProperty("endtime")
    public LocalTime getEndTime() {
        return endTime != null ? endTime.toLocalTime() : null;
    }

    /**
     * 获取完整的开始日期时间
     * 数据来源：booking_time字段（完整的LocalDateTime）
     */
    @JsonProperty("startdatetime")
    public LocalDateTime getStartDateTime() {
        return bookingTime;
    }

    /**
     * 获取完整的结束日期时间
     * 数据来源：end_time字段（完整的LocalDateTime）
     */
    @JsonProperty("enddatetime")
    public LocalDateTime getEndDateTime() {
        return endTime;
    }

    /**
     * 获取订单创建时间（真正的预订时间）
     * 数据来源：created_at字段
     */
    @JsonProperty("ordercreatetime")
    public LocalDateTime getOrderCreateTime() {
        return createdAt;
    }

    /**
     * 获取订单创建日期（真正的预订日期）
     * 数据来源：created_at字段的日期部分
     */
    @JsonProperty("ordercreatedate")
    public LocalDate getOrderCreateDate() {
        return createdAt != null ? createdAt.toLocalDate() : null;
    }
    
    public void setEndTime(LocalDateTime endTime) {
        this.endTime = endTime;
    }

    // ========== 便捷的时间设置方法 ==========

    /**
     * 设置预订的开始和结束时间（使用日期+时间）
     * @param bookingDate 预订日期
     * @param startTime 开始时间
     * @param endTime 结束时间
     */
    public void setBookingTimeRange(LocalDate bookingDate, LocalTime startTime, LocalTime endTime) {
        this.bookingTime = LocalDateTime.of(bookingDate, startTime);
        this.endTime = LocalDateTime.of(bookingDate, endTime);
    }

    /**
     * 设置预订的开始和结束时间（使用完整的LocalDateTime）
     * @param startDateTime 开始日期时间
     * @param endDateTime 结束日期时间
     */
    public void setBookingTimeRange(LocalDateTime startDateTime, LocalDateTime endDateTime) {
        this.bookingTime = startDateTime;
        this.endTime = endDateTime;
    }

    public Double getPricePerPerson() {
        if (totalPrice != null && maxParticipants != null && maxParticipants > 0) {
            return Math.round((totalPrice / maxParticipants) * 100.0) / 100.0;
        }
        return totalPrice;
    }

    public static Order createOrder(String username, Long venueId, String venueName, LocalDateTime bookingTime, LocalDateTime endTime, Double price) {
        Order order = new Order();
        order.setUsername(username);
        order.setVenueId(venueId);
        order.setVenueName(venueName);
        order.setBookingTime(bookingTime);
        order.setEndTime(endTime);
        order.setTotalPrice(price);
        order.setStatus(OrderStatus.PENDING);  // 所有订单都以待支付状态创建
        order.setCreatedAt(LocalDateTime.now());
        order.setUpdatedAt(LocalDateTime.now());
        return order;
    }

    /**
     * 检查是否可以转换到目标状态
     */
    public boolean canTransitionTo(OrderStatus targetStatus) {
        if (this.status.isFinalState()) {
            return false; // 终态不能再转换
        }

        switch (this.status) {
            case PENDING:
                return targetStatus == OrderStatus.PAID ||
                       targetStatus == OrderStatus.OPEN ||  // 拼场订单可以直接从PENDING转为OPEN
                       targetStatus == OrderStatus.CANCELLED ||
                       targetStatus == OrderStatus.EXPIRED;

            case PAID:
                if (this.bookingType == BookingType.SHARED) {
                    return targetStatus == OrderStatus.OPEN ||
                           targetStatus == OrderStatus.CANCELLED;
                } else {
                    return targetStatus == OrderStatus.CONFIRMED ||
                           targetStatus == OrderStatus.CANCELLED;
                }

            case OPEN:
                return targetStatus == OrderStatus.APPROVED_PENDING_PAYMENT ||
                       targetStatus == OrderStatus.SHARING_SUCCESS ||
                       targetStatus == OrderStatus.CANCELLED ||
                       targetStatus == OrderStatus.EXPIRED;

            case APPROVED_PENDING_PAYMENT:
                return targetStatus == OrderStatus.SHARING_SUCCESS ||
                       targetStatus == OrderStatus.OPEN ||  // 超时重新开放
                       targetStatus == OrderStatus.CANCELLED ||
                       targetStatus == OrderStatus.EXPIRED;

            case SHARING_SUCCESS:
            case FULL:
                return targetStatus == OrderStatus.CONFIRMED ||
                       targetStatus == OrderStatus.CANCELLED;

            case CONFIRMED:
                return targetStatus == OrderStatus.VERIFIED ||
                       targetStatus == OrderStatus.CANCELLED ||
                       targetStatus == OrderStatus.EXPIRED;

            case VERIFIED:
                return targetStatus == OrderStatus.COMPLETED;

            default:
                return false;
        }
    }

    /**
     * 更新订单状态（带验证）
     */
    public boolean updateStatus(OrderStatus newStatus) {
        if (canTransitionTo(newStatus)) {
            this.status = newStatus;
            this.updatedAt = LocalDateTime.now();
            return true;
        }
        return false;
    }
    
    // 创建拼场订单的静态方法
    public static Order createSharedOrder(String username, Long venueId, String venueName, 
                                        LocalDateTime bookingTime, LocalDateTime endTime, Double price, 
                                        String teamName, String contactInfo, 
                                        Integer maxParticipants, String description) {
        Order order = createOrder(username, venueId, venueName, bookingTime, endTime, price);
        order.setBookingType(BookingType.SHARED);
        order.setAllowSharing(true);
        order.setTeamName(teamName);
        order.setContactInfo(contactInfo);
        order.setMaxParticipants(maxParticipants);
        order.setDescription(description);
        order.setCurrentParticipants(1);
        // 为拼场预约设置默认的 field_id，使用 venueId 作为默认值
        order.setFieldId(venueId);
        order.setFieldName(venueName + "默认场地");
        return order;
    }
    
    // 创建拼场订单的静态方法 - 使用LocalDate和LocalTime参数
    public static Order createSharedOrder(String username, Long venueId, String venueName,
                                        LocalDate bookingDate, LocalTime startTime, LocalTime endTime,
                                        String teamName, String contactInfo,
                                        Integer maxParticipants, String description) {
        // 将LocalDate和LocalTime转换为LocalDateTime
        LocalDateTime bookingTime = LocalDateTime.of(bookingDate, startTime);
        LocalDateTime endDateTime = LocalDateTime.of(bookingDate, endTime);
        // 🔧 修复：使用默认价格而不是null，避免价格为0的问题
        // 这里使用一个默认价格，后续由控制器设置正确的价格
        Double defaultPrice = 100.0; // 默认价格，避免null导致的问题
        Order order = createOrder(username, venueId, venueName, bookingTime, endDateTime, defaultPrice);
        order.setBookingType(BookingType.SHARED);
        order.setAllowSharing(true);
        order.setTeamName(teamName);
        order.setContactInfo(contactInfo);
        order.setMaxParticipants(maxParticipants);
        order.setDescription(description);
        order.setCurrentParticipants(1);
        // 为拼场预约设置默认的 field_id，使用 venueId 作为默认值
        order.setFieldId(venueId);
        order.setFieldName(venueName + "默认场地");
        return order;
    }

    // ========== 原始时间信息的getter和setter方法 ==========

    public LocalTime getOriginalStartTime() {
        return originalStartTime;
    }

    public void setOriginalStartTime(LocalTime originalStartTime) {
        this.originalStartTime = originalStartTime;
    }

    public LocalTime getOriginalEndTime() {
        return originalEndTime;
    }

    public void setOriginalEndTime(LocalTime originalEndTime) {
        this.originalEndTime = originalEndTime;
    }

    private static String generateOrderNo() {
        return "ORD" + System.currentTimeMillis() + (int)(Math.random() * 1000);
    }
}
