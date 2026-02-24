package com.example.gymbooking.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "announcements")
public class Announcement {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    @Column(nullable = false, length = 200)
    private String title;

    @NotBlank
    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private AnnouncementType type = AnnouncementType.GENERAL;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private AnnouncementStatus status = AnnouncementStatus.PUBLISHED;

    @Column(name = "author_id", nullable = false)
    private Long authorId; // 发布者ID（超级管理员）

    @Column(name = "author_name", length = 50)
    private String authorName; // 发布者姓名

    @Column(name = "priority")
    private Integer priority = 0; // 优先级，数字越大优先级越高

    @Column(name = "publish_time")
    private LocalDateTime publishTime;

    @Column(name = "expire_time")
    private LocalDateTime expireTime;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    // 公告类型枚举
    public enum AnnouncementType {
        GENERAL("一般公告"),
        URGENT("紧急公告"),
        MAINTENANCE("维护公告"),
        EVENT("活动公告");

        private final String description;

        AnnouncementType(String description) {
            this.description = description;
        }

        public String getDescription() {
            return description;
        }
    }

    // 公告状态枚举
    public enum AnnouncementStatus {
        DRAFT("草稿"),
        PUBLISHED("已发布"),
        EXPIRED("已过期"),
        DELETED("已删除");

        private final String description;

        AnnouncementStatus(String description) {
            this.description = description;
        }

        public String getDescription() {
            return description;
        }
    }

    // 构造函数
    public Announcement() {}

    public Announcement(String title, String content, Long authorId, String authorName) {
        this.title = title;
        this.content = content;
        this.authorId = authorId;
        this.authorName = authorName;
        this.publishTime = LocalDateTime.now();
    }

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getContent() {
        return content;
    }

    public void setContent(String content) {
        this.content = content;
    }

    public AnnouncementType getType() {
        return type;
    }

    public void setType(AnnouncementType type) {
        this.type = type;
    }

    public AnnouncementStatus getStatus() {
        return status;
    }

    public void setStatus(AnnouncementStatus status) {
        this.status = status;
    }

    public Long getAuthorId() {
        return authorId;
    }

    public void setAuthorId(Long authorId) {
        this.authorId = authorId;
    }

    public String getAuthorName() {
        return authorName;
    }

    public void setAuthorName(String authorName) {
        this.authorName = authorName;
    }

    public Integer getPriority() {
        return priority;
    }

    public void setPriority(Integer priority) {
        this.priority = priority;
    }

    public LocalDateTime getPublishTime() {
        return publishTime;
    }

    public void setPublishTime(LocalDateTime publishTime) {
        this.publishTime = publishTime;
    }

    public LocalDateTime getExpireTime() {
        return expireTime;
    }

    public void setExpireTime(LocalDateTime expireTime) {
        this.expireTime = expireTime;
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