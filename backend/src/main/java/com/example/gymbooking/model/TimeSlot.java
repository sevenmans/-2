package com.example.gymbooking.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.LocalDateTime;

@Entity
@Table(name = "time_slots",
       uniqueConstraints = {
           @UniqueConstraint(columnNames = {"venue_id", "date", "start_time", "end_time"})
       })
public class TimeSlot {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull
    @Column(name = "venue_id", nullable = false)
    private Long venueId;

    @NotNull
    @Column(nullable = false)
    private LocalDate date;

    @NotNull
    @Column(name = "start_time", nullable = false)
    private LocalTime startTime;

    @NotNull
    @Column(name = "end_time", nullable = false)
    private LocalTime endTime;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private SlotStatus status = SlotStatus.AVAILABLE;

    @Column(nullable = false)
    private Double price;

    @Column(name = "order_id")
    private Long orderId; // 关联的订单ID，如果已被预约

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    // 时间段状态枚举
    public enum SlotStatus {
        AVAILABLE("可用"),
        RESERVED("已预约"),
        OCCUPIED("已占用"),
        MAINTENANCE("维护中"),
        BOOKED("已预订"),
        SHARING("拼场中"),
        EXPIRED("已过期");

        private final String description;

        SlotStatus(String description) {
            this.description = description;
        }

        public String getDescription() {
            return description;
        }
    }

    // 构造函数
    public TimeSlot() {}

    public TimeSlot(Long venueId, LocalDate date, LocalTime startTime, LocalTime endTime, Double price) {
        this.venueId = venueId;
        this.date = date;
        this.startTime = startTime;
        this.endTime = endTime;
        this.price = price;
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

    public LocalDate getDate() {
        return date;
    }

    public void setDate(LocalDate date) {
        this.date = date;
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

    public SlotStatus getStatus() {
        return status;
    }

    public void setStatus(SlotStatus status) {
        this.status = status;
    }

    public Double getPrice() {
        return price;
    }

    public void setPrice(Double price) {
        this.price = price;
    }

    public Long getOrderId() {
        return orderId;
    }

    public void setOrderId(Long orderId) {
        this.orderId = orderId;
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
}