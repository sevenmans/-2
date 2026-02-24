package com.example.gymbooking.repository;

import com.example.gymbooking.model.Announcement;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface AnnouncementRepository extends JpaRepository<Announcement, Long> {
    
    /**
     * 根据公告类型查询
     */
    Page<Announcement> findByType(Announcement.AnnouncementType type, Pageable pageable);
    
    /**
     * 根据公告状态查询
     */
    Page<Announcement> findByStatus(Announcement.AnnouncementStatus status, Pageable pageable);
    
    /**
     * 根据公告类型和状态查询
     */
    Page<Announcement> findByTypeAndStatus(Announcement.AnnouncementType type, Announcement.AnnouncementStatus status, Pageable pageable);
    
    /**
     * 查询有效的公告（已发布且未过期）
     */
    @Query("SELECT a FROM Announcement a WHERE a.status = 'PUBLISHED' AND a.publishTime <= ?1 AND (a.expireTime IS NULL OR a.expireTime >= ?1) ORDER BY a.priority DESC, a.publishTime DESC")
    List<Announcement> findActiveAnnouncements(LocalDateTime now);
    
    /**
     * 根据优先级排序查询公告
     */
    List<Announcement> findAllByOrderByPriorityDescPublishTimeDesc();
    
    /**
     * 根据作者ID查询公告
     */
    List<Announcement> findByAuthorId(Long authorId);
}