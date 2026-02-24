package com.example.gymbooking.controller;

import com.example.gymbooking.model.Announcement;
import com.example.gymbooking.repository.AnnouncementRepository;
import com.example.gymbooking.payload.response.MessageResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/announcements")
@CrossOrigin(origins = "*")
public class AnnouncementController {

    @Autowired
    private AnnouncementRepository announcementRepository;

    /**
     * 获取所有公告（分页）
     */
    @GetMapping
    public ResponseEntity<Map<String, Object>> getAllAnnouncements(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String status) {

        try {
            // 页码从0开始
            Pageable paging = PageRequest.of(page - 1, size, Sort.by("priority").descending().and(Sort.by("publishTime").descending()));
            Page<Announcement> pageAnnouncements;

            // 根据类型和状态筛选
            if (type != null && status != null) {
                Announcement.AnnouncementType announcementType = Announcement.AnnouncementType.valueOf(type);
                Announcement.AnnouncementStatus announcementStatus = Announcement.AnnouncementStatus.valueOf(status);
                pageAnnouncements = announcementRepository.findByTypeAndStatus(announcementType, announcementStatus, paging);
            } else if (type != null) {
                Announcement.AnnouncementType announcementType = Announcement.AnnouncementType.valueOf(type);
                pageAnnouncements = announcementRepository.findByType(announcementType, paging);
            } else if (status != null) {
                Announcement.AnnouncementStatus announcementStatus = Announcement.AnnouncementStatus.valueOf(status);
                pageAnnouncements = announcementRepository.findByStatus(announcementStatus, paging);
            } else {
                pageAnnouncements = announcementRepository.findAll(paging);
            }

            List<Announcement> announcements = pageAnnouncements.getContent();

            Map<String, Object> response = new HashMap<>();
            response.put("announcements", announcements);
            response.put("currentPage", pageAnnouncements.getNumber() + 1);
            response.put("totalItems", pageAnnouncements.getTotalElements());
            response.put("totalPages", pageAnnouncements.getTotalPages());

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new HashMap<String, Object>() {{
                        put("message", "获取公告列表失败: " + e.getMessage());
                    }});
        }
    }

    /**
     * 获取公告详情
     */
    @GetMapping("/{id}")
    public ResponseEntity<?> getAnnouncementById(@PathVariable Long id) {
        Optional<Announcement> announcementData = announcementRepository.findById(id);

        if (announcementData.isPresent()) {
            return ResponseEntity.ok(announcementData.get());
        } else {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(new MessageResponse("公告不存在"));
        }
    }

    /**
     * 创建公告（仅超级管理员）
     */
    @PostMapping
    @PreAuthorize("hasRole('ROLE_SUPER_ADMIN')")
    public ResponseEntity<?> createAnnouncement(@RequestBody Announcement announcement) {
        try {
            // 设置作者信息
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            String username = authentication.getName();
            announcement.setAuthorName(username);
            
            // 设置创建和更新时间
            LocalDateTime now = LocalDateTime.now();
            announcement.setCreatedAt(now);
            announcement.setUpdatedAt(now);
            
            // 如果没有设置发布时间，则默认为当前时间
            if (announcement.getPublishTime() == null) {
                announcement.setPublishTime(now);
            }
            
            // 保存公告
            Announcement savedAnnouncement = announcementRepository.save(announcement);
            return ResponseEntity.status(HttpStatus.CREATED).body(savedAnnouncement);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new MessageResponse("创建公告失败: " + e.getMessage()));
        }
    }

    /**
     * 更新公告（仅超级管理员）
     */
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ROLE_SUPER_ADMIN')")
    public ResponseEntity<?> updateAnnouncement(@PathVariable Long id, @RequestBody Announcement announcement) {
        Optional<Announcement> announcementData = announcementRepository.findById(id);

        if (announcementData.isPresent()) {
            Announcement existingAnnouncement = announcementData.get();
            
            // 更新字段
            existingAnnouncement.setTitle(announcement.getTitle());
            existingAnnouncement.setContent(announcement.getContent());
            existingAnnouncement.setType(announcement.getType());
            existingAnnouncement.setStatus(announcement.getStatus());
            existingAnnouncement.setPriority(announcement.getPriority());
            existingAnnouncement.setPublishTime(announcement.getPublishTime());
            existingAnnouncement.setExpireTime(announcement.getExpireTime());
            existingAnnouncement.setUpdatedAt(LocalDateTime.now());
            
            return ResponseEntity.ok(announcementRepository.save(existingAnnouncement));
        } else {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(new MessageResponse("公告不存在"));
        }
    }

    /**
     * 删除公告（仅超级管理员）
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ROLE_SUPER_ADMIN')")
    public ResponseEntity<?> deleteAnnouncement(@PathVariable Long id) {
        try {
            announcementRepository.deleteById(id);
            return ResponseEntity.ok(new MessageResponse("公告已成功删除"));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new MessageResponse("删除公告失败: " + e.getMessage()));
        }
    }

    /**
     * 批量删除公告（仅超级管理员）
     */
    @DeleteMapping("/batch")
    @PreAuthorize("hasRole('ROLE_SUPER_ADMIN')")
    public ResponseEntity<?> deleteAnnouncementsBatch(@RequestBody List<Long> ids) {
        try {
            announcementRepository.deleteAllById(ids);
            return ResponseEntity.ok(new MessageResponse("已成功删除" + ids.size() + "条公告"));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new MessageResponse("批量删除公告失败: " + e.getMessage()));
        }
    }

    /**
     * 更新公告状态（仅超级管理员）
     */
    @PatchMapping("/{id}/status")
    @PreAuthorize("hasRole('ROLE_SUPER_ADMIN')")
    public ResponseEntity<?> updateAnnouncementStatus(
            @PathVariable Long id,
            @RequestBody Map<String, String> statusUpdate) {
        
        try {
            String status = statusUpdate.get("status");
            if (status == null) {
                return ResponseEntity.badRequest()
                        .body(new MessageResponse("状态不能为空"));
            }
            
            Optional<Announcement> announcementData = announcementRepository.findById(id);
            if (announcementData.isPresent()) {
                Announcement announcement = announcementData.get();
                announcement.setStatus(Announcement.AnnouncementStatus.valueOf(status));
                announcement.setUpdatedAt(LocalDateTime.now());
                
                return ResponseEntity.ok(announcementRepository.save(announcement));
            } else {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(new MessageResponse("公告不存在"));
            }
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                    .body(new MessageResponse("无效的状态值"));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new MessageResponse("更新公告状态失败: " + e.getMessage()));
        }
    }
}