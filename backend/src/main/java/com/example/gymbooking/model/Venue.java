package com.example.gymbooking.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import com.fasterxml.jackson.annotation.JsonIgnore;

import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.ArrayList;

@Entity
@Table(name = "venues")
@AllArgsConstructor
public class Venue {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false, length = 100)
    private String name;
    
    @Column(nullable = false, length = 50)
    private String type;
    
    @Column(nullable = false, length = 200)
    private String location;
    
    @Column(length = 500)
    private String description;
    
    @Column(length = 500)
    private String facilities;
    
    @ElementCollection(fetch = FetchType.LAZY)
    @CollectionTable(name = "venue_photos", joinColumns = @JoinColumn(name = "venue_id"))
    @Column(name = "photo_url")
    @JsonIgnore
    private List<String> photos;
    
    // 场馆实体字段
    @Column(length = 255)
    private String image;
    
    @ElementCollection(fetch = FetchType.LAZY)
    @CollectionTable(name = "venue_features", joinColumns = @JoinColumn(name = "venue_id"))
    @Column(name = "feature")
    @JsonIgnore
    private List<String> features;
    
    @Column(nullable = false)
    private Double price;
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private VenueStatus status = VenueStatus.OPEN;
    
    @Column(name = "open_time")
    private LocalTime openTime;
    
    @Column(name = "close_time")
    private LocalTime closeTime;
    
    @Column(name = "manager_id")
    private Long managerId;

    @Column(name = "support_sharing")
    private Boolean supportSharing = false; // 是否支持拼场

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    // 场馆状态枚举
    public enum VenueStatus {
        OPEN("开放"),
        CLOSED("关闭"),
        MAINTENANCE("维护中");

        private final String description;

        VenueStatus(String description) {
            this.description = description;
        }

        public String getDescription() {
            return description;
        }
    }

    // 显式无参构造函数
    public Venue() {
        this.status = VenueStatus.OPEN;
        this.supportSharing = false;
    }

    // 自定义构造器用于DataInitializer
    public Venue(String name, String type, String location, Double price, Long managerId) {
        this.name = name;
        this.type = type;
        this.location = location;
        this.price = price;
        this.managerId = managerId;
        this.status = VenueStatus.OPEN;
        // 自动设置是否支持拼场
        if ("足球".equals(type) || "篮球".equals(type)) {
            this.supportSharing = true;
        } else {
            this.supportSharing = false;
        }
    }

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
        // 自动设置是否支持拼场
        if ("足球".equals(type) || "篮球".equals(type)) {
            this.supportSharing = true;
        } else {
            this.supportSharing = false;
        }
    }

    public String getLocation() {
        return location;
    }

    public void setLocation(String location) {
        this.location = location;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getFacilities() {
        return facilities;
    }

    public void setFacilities(String facilities) {
        this.facilities = facilities;
    }

    public List<String> getPhotos() {
        return photos;
    }

    public void setPhotos(List<String> photos) {
        this.photos = photos;
    }
    
    public String getImage() {
        return image;
    }

    public void setImage(String image) {
        this.image = image;
    }
    
    public List<String> getFeatures() {
        return features;
    }

    public void setFeatures(List<String> features) {
        this.features = features;
    }

    public Double getPrice() {
        return price;
    }

    public void setPrice(Double price) {
        this.price = price;
    }

    public VenueStatus getStatus() {
        return status;
    }

    public void setStatus(VenueStatus status) {
        this.status = status;
    }

    public LocalTime getOpenTime() {
        return openTime;
    }

    public void setOpenTime(LocalTime openTime) {
        this.openTime = openTime;
    }

    public LocalTime getCloseTime() {
        return closeTime;
    }

    public void setCloseTime(LocalTime closeTime) {
        this.closeTime = closeTime;
    }

    public Long getManagerId() {
        return managerId;
    }

    public void setManagerId(Long managerId) {
        this.managerId = managerId;
    }

    public Boolean getSupportSharing() {
        return supportSharing;
    }

    public void setSupportSharing(Boolean supportSharing) {
        this.supportSharing = supportSharing;
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