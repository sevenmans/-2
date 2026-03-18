package com.example.gymbooking.controller;

import com.example.gymbooking.model.Venue;
import com.example.gymbooking.security.services.UserDetailsImpl;
import com.example.gymbooking.service.FileUploadService;
import com.example.gymbooking.service.VenueService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/venues")
@CrossOrigin(origins = "*")
public class VenueController {
    
    @Autowired
    private VenueService venueService;

    @Autowired
    private FileUploadService fileUploadService;
    
    /**
     * 获取场馆列表
     */
    @GetMapping
    public ResponseEntity<Map<String, Object>> getVenueList(
            @RequestParam(name = "page", defaultValue = "1") int page,
            @RequestParam(name = "pageSize", defaultValue = "10") int pageSize,
            @RequestParam(name = "type", required = false) String type,
            @RequestParam(name = "status", required = false) Venue.VenueStatus status,
            @RequestParam(name = "minPrice", required = false) Double minPrice,
            @RequestParam(name = "maxPrice", required = false) Double maxPrice) {
        
        try {
            System.out.println("获取场馆列表请求 - page: " + page + ", pageSize: " + pageSize + ", type: " + type + ", status: " + status);
            
            Pageable pageable = PageRequest.of(page - 1, pageSize);
            List<Venue> venues;
            
            if (type != null && status != null) {
                venues = venueService.getVenuesByTypeAndStatus(type, status);
            } else if (type != null) {
                venues = venueService.getVenuesByType(type);
            } else if (status != null) {
                venues = venueService.getVenuesByStatus(status);
            } else {
                venues = venueService.getAllVenues();
            }
            
            System.out.println("查询到场馆数量: " + venues.size());
        
        // 价格筛选
        if (minPrice != null || maxPrice != null) {
            venues = venues.stream()
                    .filter(venue -> {
                        Double priceObj = venue.getPrice();
                        if (priceObj == null) {
                            return false; // 如果价格为null，则不匹配筛选条件
                        }
                        double price = priceObj;
                        boolean matchMin = minPrice == null || price >= minPrice;
                        boolean matchMax = maxPrice == null || price <= maxPrice;
                        return matchMin && matchMax;
                    })
                    .collect(Collectors.toList());
        }
        
            // 手动分页
            int start = (int) pageable.getOffset();
            int end = Math.min((start + pageable.getPageSize()), venues.size());
            List<Venue> pageContent = venues.subList(start, end);
            
            System.out.println("分页后场馆数量: " + pageContent.size());
            
            Map<String, Object> response = new HashMap<>();
            response.put("data", pageContent);
            response.put("total", venues.size());
            response.put("page", page);
            response.put("pageSize", pageSize);
            response.put("totalPages", (int) Math.ceil((double) venues.size() / pageSize));
            
            System.out.println("响应构建完成");
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            System.err.println("获取场馆列表失败: " + e.getMessage());
            e.printStackTrace();
            
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "获取场馆列表失败: " + e.getMessage());
            errorResponse.put("data", new ArrayList<>());
            errorResponse.put("total", 0);
            errorResponse.put("page", page);
            errorResponse.put("pageSize", pageSize);
            errorResponse.put("totalPages", 0);
            
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }
    
    /**
     * 获取场馆详情
     */
    @GetMapping("/{id}")
    public ResponseEntity<Venue> getVenueDetail(@PathVariable Long id) {
        Optional<Venue> venue = venueService.getVenueById(id);
        if (venue.isPresent()) {
            return ResponseEntity.ok(venue.get());
        } else {
            return ResponseEntity.notFound().build();
        }
    }
    
    /**
     * 获取可预约时间段
     */
    @GetMapping("/{venueId}/slots")
    public ResponseEntity<Map<String, Object>> getAvailableSlots(
            @PathVariable Long venueId,
            @RequestParam(name = "date") String date) {
        
        try {
            LocalDate localDate = LocalDate.parse(date);
            Map<String, Object> slots = venueService.getAvailableTimeSlots(venueId, localDate);
            return ResponseEntity.ok(slots);
        } catch (Exception e) {
            Map<String, Object> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
        }
    }
    
    /**
     * 获取场馆时间段（兼容前端请求路径）
     * 支持 refresh 参数强制刷新缓存
     */
    @GetMapping("/{venueId}/timeslots")
    public ResponseEntity<Map<String, Object>> getVenueTimeSlots(
            @PathVariable Long venueId,
            @RequestParam(name = "date") String date,
            @RequestParam(name = "refresh", required = false, defaultValue = "false") boolean refresh) {
        
        try {
            LocalDate localDate = LocalDate.parse(date);
            
            // 记录请求日志
            System.out.println("[VenueController] 收到时间段请求 - venueId: " + venueId + ", date: " + date + ", refresh: " + refresh);
            
            // 获取时间段数据
            Map<String, Object> slots = venueService.getAvailableTimeSlots(venueId, localDate);
            
            // 构建响应
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "获取时间段成功");
            response.put("timestamp", System.currentTimeMillis());
            response.put("data", slots.get("slots"));
            response.put("count", slots.containsKey("slots") ? ((List<?>) slots.get("slots")).size() : 0);
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            System.err.println("[VenueController] 获取时间段失败: " + e.getMessage());
            e.printStackTrace();
            
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("message", "获取时间段失败: " + e.getMessage());
            error.put("timestamp", System.currentTimeMillis());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }
    
    /**
     * 获取场馆类型列表
     */
    @GetMapping("/types")
    public ResponseEntity<List<String>> getVenueTypes() {
        List<String> types = venueService.getAllVenueTypes();
        return ResponseEntity.ok(types);
    }
    
    /**
     * 搜索场馆
     */
    @GetMapping("/search")
    public ResponseEntity<List<Venue>> searchVenues(
            @RequestParam(name = "keyword") String keyword,
            @RequestParam(name = "type", required = false) String type,
            @RequestParam(name = "date", required = false) String date,
            @RequestParam(name = "timeSlot", required = false) String timeSlot,
            @RequestParam(name = "minPrice", required = false) Double minPrice,
            @RequestParam(name = "maxPrice", required = false) Double maxPrice) {
        
        List<Venue> venues = venueService.searchVenues(keyword);
        
        // 根据类型过滤
        if (type != null && !type.trim().isEmpty()) {
            venues = venues.stream()
                    .filter(venue -> venue.getType().equals(type))
                    .collect(Collectors.toList());
        }
        
        // 价格筛选
        if (minPrice != null || maxPrice != null) {
            venues = venues.stream()
                    .filter(venue -> {
                        Double priceObj = venue.getPrice();
                        if (priceObj == null) {
                            return false; // 如果价格为null，则不匹配筛选条件
                        }
                        double price = priceObj;
                        boolean matchMin = minPrice == null || price >= minPrice;
                        boolean matchMax = maxPrice == null || price <= maxPrice;
                        return matchMin && matchMax;
                    })
                    .collect(Collectors.toList());
        }
        
        return ResponseEntity.ok(venues);
    }
    
    /**
     * 获取热门场馆
     */
    @GetMapping("/popular")
    public ResponseEntity<List<Venue>> getPopularVenues(
            @RequestParam(name = "limit", defaultValue = "5") int limit) {
        
        List<Venue> venues = venueService.getAllVenues();
        
        // 简单模拟热门场馆（实际项目中应该根据预约次数等指标排序）
        Collections.shuffle(venues);
        List<Venue> popularVenues = venues.stream()
                .limit(limit)
                .collect(Collectors.toList());
        
        return ResponseEntity.ok(popularVenues);
    }
    
    /**
     * 创建新场馆
     */
    @PostMapping
    @PreAuthorize("hasAnyAuthority('ROLE_SUPER_ADMIN','ROLE_VENUE_ADMIN')")
    public ResponseEntity<Venue> createVenue(@RequestBody Venue venue) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof UserDetailsImpl userDetails) {
            if (venue.getManagerId() == null) {
                venue.setManagerId(userDetails.getId());
            }
        }
        Venue newVenue = venueService.createVenue(venue);
        return ResponseEntity.status(HttpStatus.CREATED).body(newVenue);
    }

    /**
     * 上传场馆图片（管理员）
     */
    @PostMapping("/upload-image")
    @PreAuthorize("hasAnyAuthority('ROLE_SUPER_ADMIN','ROLE_VENUE_ADMIN')")
    public ResponseEntity<Map<String, Object>> uploadVenueImage(@RequestParam("file") MultipartFile file) {
        Map<String, Object> response = new HashMap<>();
        try {
            String imagePath = fileUploadService.uploadVenueImage(file);
            response.put("success", true);
            response.put("imageUrl", imagePath);
            response.put("message", "上传成功");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", e.getMessage() != null ? e.getMessage() : "上传失败");
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        }
    }
    
    /**
     * 更新场馆信息
     */
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ROLE_SUPER_ADMIN') or hasRole('ROLE_VENUE_ADMIN')")
    public ResponseEntity<Venue> updateVenue(@PathVariable Long id, @RequestBody Venue venue) {
        try {
            Venue updatedVenue = venueService.updateVenue(id, venue);
            return ResponseEntity.ok(updatedVenue);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }
    }
    
    /**
     * 删除场馆
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('ROLE_SUPER_ADMIN','ROLE_VENUE_ADMIN')")
    public ResponseEntity<Void> deleteVenue(@PathVariable Long id) {
        try {
            venueService.deleteVenue(id);
            return ResponseEntity.noContent().build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }
    }
    
    /**
     * 更新场馆状态
     */
    @PatchMapping("/{id}/status")
    @PreAuthorize("hasRole('ROLE_SUPER_ADMIN') or hasRole('ROLE_VENUE_ADMIN')")
    public ResponseEntity<Venue> updateVenueStatus(
            @PathVariable Long id, 
            @RequestBody Map<String, String> statusMap) {
        try {
            Venue.VenueStatus status = Venue.VenueStatus.valueOf(statusMap.get("status"));
            Venue updatedVenue = venueService.updateVenueStatus(id, status);
            return ResponseEntity.ok(updatedVenue);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        }
    }
    
    /**
     * 获取支持拼场的场馆
     */
    @GetMapping("/sharing")
    public ResponseEntity<List<Venue>> getSharingVenues() {
        List<Venue> venues = venueService.getSharingVenues();
        return ResponseEntity.ok(venues);
    }

    /**
     * 获取当前登录管理员管理的场馆列表
     */
    @GetMapping("/manager/me")
    @PreAuthorize("hasRole('ROLE_VENUE_ADMIN') or hasRole('ROLE_SUPER_ADMIN')")
    public ResponseEntity<?> getMyManagedVenues() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof UserDetailsImpl)) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "未获取到有效登录信息");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(errorResponse);
        }
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        boolean isSuperAdmin = userDetails.getAuthorities().stream()
                .anyMatch(authority -> "ROLE_SUPER_ADMIN".equals(authority.getAuthority()));
        if (isSuperAdmin) {
            return ResponseEntity.ok(venueService.getAllVenues());
        }
        List<Venue> venues = venueService.getVenuesByManagerId(userDetails.getId());
        return ResponseEntity.ok(venues);
    }
    
    /**
     * 分配管理员到场馆
     */
    @PatchMapping("/{id}/manager")
    @PreAuthorize("hasAnyAuthority('ROLE_SUPER_ADMIN','ROLE_VENUE_ADMIN')")
    public ResponseEntity<Venue> assignManager(
            @PathVariable Long id,
            @RequestBody Map<String, Long> managerMap) {
        try {
            Long managerId = managerMap.get("managerId");
            Venue updatedVenue = venueService.assignManager(id, managerId);
            return ResponseEntity.ok(updatedVenue);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        }
    }
    
    /**
     * 获取管理员管理的场馆列表
     */
    @GetMapping("/manager/{managerId}")
    @PreAuthorize("hasRole('ROLE_SUPER_ADMIN') or hasRole('ROLE_VENUE_ADMIN')")
    public ResponseEntity<List<Venue>> getVenuesByManager(@PathVariable Long managerId) {
        List<Venue> venues = venueService.getVenuesByManagerId(managerId);
        return ResponseEntity.ok(venues);
    }
    
    /**
     * 批量更新场馆拼场支持状态
     * 确保所有篮球和足球场都支持拼场
     */
    @PostMapping("/update-sharing-support")
    @PreAuthorize("hasAnyAuthority('ROLE_SUPER_ADMIN','ROLE_VENUE_ADMIN')")
    public ResponseEntity<Map<String, String>> updateSharingSupportForAllVenues() {
        try {
            venueService.updateSharingSupportForAllVenues();
            Map<String, String> response = new HashMap<>();
            response.put("message", "所有场馆的拼场支持状态已更新完成");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, String> response = new HashMap<>();
            response.put("error", "更新失败: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
}
