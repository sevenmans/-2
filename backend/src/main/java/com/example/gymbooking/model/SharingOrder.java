package com.example.gymbooking.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Entity
@Table(name = "sharing_orders")
public class SharingOrder {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull
    @Column(name = "venue_id", nullable = false)
    private Long venueId;

    @NotBlank
    @Column(name = "venue_name", nullable = false)
    private String venueName;

    @NotNull
    @Column(name = "booking_date", nullable = false)
    private LocalDate bookingDate;

    @NotNull
    @Column(name = "start_time", nullable = false)
    private LocalTime startTime;

    @NotNull
    @Column(name = "end_time", nullable = false)
    private LocalTime endTime;

    @NotBlank
    @Column(name = "team_name", nullable = false)
    private String teamName;

    @NotBlank
    @Column(name = "contact_info", nullable = false)
    private String contactInfo;

    @Min(2)
    @Column(name = "max_participants")
    private Integer maxParticipants;

    @NotNull
    @Column(name = "current_participants", nullable = false)
    private Integer currentParticipants = 1;

    @Column(length = 500)
    private String description;

    @NotNull
    @Column(name = "price_per_team", nullable = false)
    private Double pricePerTeam;
    
    @NotNull
    @Column(name = "total_price", nullable = false)
    private Double totalPrice;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private SharingOrderStatus status = SharingOrderStatus.OPEN;

    @NotBlank
    @Column(name = "creator_username", nullable = false)
    private String creatorUsername;

    @Column(name = "order_no", unique = true)
    private String orderNo;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
    
    @Column(name = "order_id")
    private Long orderId; // 关联的主订单ID
    
    @Column(name = "auto_approve")
    private Boolean autoApprove = false; // 是否自动通过申请
    
    @Column(name = "allow_exit")
    private Boolean allowExit = true; // 是否允许中途退出
    
    @Transient
    private String venueLocation; // 场馆位置信息（非持久化字段）

    // 拼场订单状态枚举
    public enum SharingOrderStatus {
        OPEN("开放中"),
        FULL("已满"),
        CONFIRMED("已确认"),
        CANCELLED("已取消"),
        EXPIRED("已过期");

        private final String description;

        SharingOrderStatus(String description) {
            this.description = description;
        }

        public String getDescription() {
            return description;
        }
    }

    // 生命周期回调方法
    @PrePersist
    protected void onCreate() {
        if (this.orderNo == null) {
            this.orderNo = generateOrderNo();
        }
        // 确保金额保留两位小数
        if (this.pricePerTeam != null) {
            this.pricePerTeam = Math.round(this.pricePerTeam * 100.0) / 100.0;
        }
        if (this.totalPrice != null) {
            this.totalPrice = Math.round(this.totalPrice * 100.0) / 100.0;
        }
    }
    
    @PreUpdate
    protected void onUpdate() {
        // 确保金额保留两位小数
        if (this.pricePerTeam != null) {
            this.pricePerTeam = Math.round(this.pricePerTeam * 100.0) / 100.0;
        }
        if (this.totalPrice != null) {
            this.totalPrice = Math.round(this.totalPrice * 100.0) / 100.0;
        }
    }

    // 构造函数
    public SharingOrder() {}

    public SharingOrder(Long venueId, String venueName, LocalDate bookingDate, LocalTime startTime, LocalTime endTime,
                       String teamName, String contactInfo, Integer maxParticipants, Double pricePerTeam, Double totalPrice,
                       String creatorUsername) {
        this.venueId = venueId;
        this.venueName = venueName;
        this.bookingDate = bookingDate;
        this.startTime = startTime;
        this.endTime = endTime;
        this.teamName = teamName;
        this.contactInfo = contactInfo;
        this.maxParticipants = maxParticipants;
        this.pricePerTeam = pricePerTeam;
        this.totalPrice = totalPrice;
        this.creatorUsername = creatorUsername;
        this.orderNo = generateOrderNo();
    }

    // 生成订单号
    private String generateOrderNo() {
        return "S" + System.currentTimeMillis() + String.format("%04d", (int) (Math.random() * 10000));
    }

    // 添加参与者
    public boolean addParticipant() {
        if (this.status != SharingOrderStatus.OPEN || 
            (this.maxParticipants != null && this.currentParticipants >= this.maxParticipants)) {
            return false;
        }
        this.currentParticipants++;
        if (this.maxParticipants != null && this.currentParticipants >= this.maxParticipants) {
            this.status = SharingOrderStatus.FULL;
        }
        return true;
    }

    // 移除参与者
    public boolean removeParticipant() {
        if (this.currentParticipants <= 1) {
            return false;
        }
        this.currentParticipants--;
        if (this.status == SharingOrderStatus.FULL) {
            this.status = SharingOrderStatus.OPEN;
        }
        return true;
    }

    // 确认拼场订单
    public boolean confirm() {
        if (this.status != SharingOrderStatus.OPEN && this.status != SharingOrderStatus.FULL) {
            return false;
        }
        this.status = SharingOrderStatus.CONFIRMED;
        return true;
    }

    // 取消拼场订单
    public boolean cancel() {
        if (this.status == SharingOrderStatus.CONFIRMED || this.status == SharingOrderStatus.CANCELLED || this.status == SharingOrderStatus.EXPIRED) {
            return false;
        }
        this.status = SharingOrderStatus.CANCELLED;
        return true;
    }

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getVenueId() {
        return venueId;
    }

    public void setVenueId(Long venueId) {
        this.venueId = venueId;
    }

    public String getVenueName() {
        return venueName;
    }

    public void setVenueName(String venueName) {
        this.venueName = venueName;
    }

    public LocalDate getBookingDate() {
        return bookingDate;
    }

    public void setBookingDate(LocalDate bookingDate) {
        this.bookingDate = bookingDate;
    }

    public LocalTime getStartTime() {
        return startTime;
    }

    public void setStartTime(LocalTime startTime) {
        this.startTime = startTime;
    }

    public LocalTime getEndTime() {
        return endTime;
    }

    public void setEndTime(LocalTime endTime) {
        this.endTime = endTime;
    }

    public String getTeamName() {
        return teamName;
    }

    public void setTeamName(String teamName) {
        this.teamName = teamName;
    }

    public String getContactInfo() {
        return contactInfo;
    }

    public void setContactInfo(String contactInfo) {
        this.contactInfo = contactInfo;
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

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public Double getPricePerTeam() {
        return pricePerTeam;
    }

    public void setPricePerTeam(Double pricePerTeam) {
        this.pricePerTeam = pricePerTeam;
    }
    
    public Double getTotalPrice() {
        return totalPrice;
    }

    public void setTotalPrice(Double totalPrice) {
        this.totalPrice = totalPrice;
    }

    public SharingOrderStatus getStatus() {
        return status;
    }

    public void setStatus(SharingOrderStatus status) {
        this.status = status;
    }

    public String getCreatorUsername() {
        return creatorUsername;
    }

    public void setCreatorUsername(String creatorUsername) {
        this.creatorUsername = creatorUsername;
    }

    public String getOrderNo() {
        return orderNo;
    }

    public void setOrderNo(String orderNo) {
        this.orderNo = orderNo;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
    
    public Long getOrderId() {
        return orderId;
    }

    public void setOrderId(Long orderId) {
        this.orderId = orderId;
    }
    
    public Boolean getAutoApprove() {
        return autoApprove;
    }

    public void setAutoApprove(Boolean autoApprove) {
        this.autoApprove = autoApprove;
    }
    
    public Boolean getAllowExit() {
        return allowExit;
    }

    public void setAllowExit(Boolean allowExit) {
        this.allowExit = allowExit;
    }
    
    public String getVenueLocation() {
        return venueLocation;
    }

    public void setVenueLocation(String venueLocation) {
        this.venueLocation = venueLocation;
    }
    

}