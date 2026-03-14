package com.example.gymbooking.controller;

import com.example.gymbooking.model.Order;
import com.example.gymbooking.model.Role;
import com.example.gymbooking.model.User;
import com.example.gymbooking.model.Venue;
import com.example.gymbooking.repository.OrderRepository;
import com.example.gymbooking.repository.UserRepository;
import com.example.gymbooking.repository.VenueRepository;
import com.example.gymbooking.security.services.UserDetailsImpl;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.temporal.TemporalAdjusters;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin")
@CrossOrigin(origins = "*")
public class AdminController {
    
    @Autowired
    private UserRepository userRepository;

    @Autowired
    private VenueRepository venueRepository;

    @Autowired
    private OrderRepository orderRepository;

    /**
     * 管理员工作台统计
     */
    @GetMapping("/dashboard/stats")
    @PreAuthorize("hasRole('ROLE_VENUE_ADMIN') or hasRole('ROLE_SUPER_ADMIN')")
    public ResponseEntity<Map<String, Object>> getDashboardStats(
            @RequestParam(defaultValue = "today") String timeRange,
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate) {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            if (authentication == null || !(authentication.getPrincipal() instanceof UserDetailsImpl)) {
                Map<String, Object> errorResponse = new HashMap<>();
                errorResponse.put("success", false);
                errorResponse.put("message", "未获取到有效登录信息");
                return ResponseEntity.status(401).body(errorResponse);
            }

            UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
            List<Long> venueIds = venueRepository.findByManagerId(userDetails.getId()).stream()
                    .map(Venue::getId)
                    .collect(Collectors.toList());

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("timeRange", timeRange);

            if (venueIds.isEmpty()) {
                response.put("venueCount", 0);
                response.put("totalOrders", 0);
                response.put("pendingVerificationCount", 0);
                response.put("verifiedCount", 0);
                response.put("revenue", 0.0);
                response.put("rangeStart", null);
                response.put("rangeEnd", null);
                return ResponseEntity.ok(response);
            }

            LocalDateTime[] dateRange = resolveDateRange(timeRange, startDate, endDate);
            LocalDateTime rangeStart = dateRange[0];
            LocalDateTime rangeEnd = dateRange[1];

            long totalOrders = orderRepository.countByVenueIdInAndBookingTimeBetween(venueIds, rangeStart, rangeEnd);
            long pendingVerificationCount = orderRepository.countByVenueIdInAndStatusInAndBookingTimeBetween(
                    venueIds,
                    Arrays.asList(
                            Order.OrderStatus.PAID,
                            Order.OrderStatus.CONFIRMED,
                            Order.OrderStatus.SHARING_SUCCESS
                    ),
                    rangeStart,
                    rangeEnd
            );
            long verifiedCount = orderRepository.countByVenueIdInAndStatusInAndBookingTimeBetween(
                    venueIds,
                    Arrays.asList(
                            Order.OrderStatus.VERIFIED,
                            Order.OrderStatus.COMPLETED
                    ),
                    rangeStart,
                    rangeEnd
            );
            Double revenue = orderRepository.sumTotalPriceByVenueIdInAndStatusInAndBookingTimeBetween(
                    venueIds,
                    Collections.singletonList(Order.OrderStatus.COMPLETED),
                    rangeStart,
                    rangeEnd
            );

            response.put("venueCount", venueIds.size());
            response.put("totalOrders", totalOrders);
            response.put("pendingVerificationCount", pendingVerificationCount);
            response.put("verifiedCount", verifiedCount);
            response.put("revenue", revenue == null ? 0.0 : revenue);
            response.put("rangeStart", rangeStart);
            response.put("rangeEnd", rangeEnd);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(errorResponse);
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "获取工作台统计失败: " + e.getMessage());
            return ResponseEntity.badRequest().body(errorResponse);
        }
    }

    private LocalDateTime[] resolveDateRange(String timeRange, String startDate, String endDate) {
        LocalDate today = LocalDate.now();
        LocalDateTime rangeStart;
        LocalDateTime rangeEnd;

        switch (timeRange == null ? "today" : timeRange.toLowerCase()) {
            case "today":
                rangeStart = today.atStartOfDay();
                rangeEnd = LocalDateTime.of(today, LocalTime.MAX);
                break;
            case "week":
                LocalDate weekStart = today.with(java.time.DayOfWeek.MONDAY);
                LocalDate weekEnd = today.with(java.time.DayOfWeek.SUNDAY);
                rangeStart = weekStart.atStartOfDay();
                rangeEnd = LocalDateTime.of(weekEnd, LocalTime.MAX);
                break;
            case "month":
                LocalDate monthStart = today.with(TemporalAdjusters.firstDayOfMonth());
                LocalDate monthEnd = today.with(TemporalAdjusters.lastDayOfMonth());
                rangeStart = monthStart.atStartOfDay();
                rangeEnd = LocalDateTime.of(monthEnd, LocalTime.MAX);
                break;
            case "custom":
                if (startDate == null || endDate == null) {
                    throw new IllegalArgumentException("自定义时间范围必须提供 startDate 和 endDate");
                }
                LocalDate customStart = LocalDate.parse(startDate);
                LocalDate customEnd = LocalDate.parse(endDate);
                if (customEnd.isBefore(customStart)) {
                    throw new IllegalArgumentException("endDate 不能早于 startDate");
                }
                rangeStart = customStart.atStartOfDay();
                rangeEnd = LocalDateTime.of(customEnd, LocalTime.MAX);
                break;
            default:
                throw new IllegalArgumentException("不支持的 timeRange: " + timeRange);
        }
        return new LocalDateTime[]{rangeStart, rangeEnd};
    }
    
    /**
     * 获取所有用户（分页）
     * 仅限超级管理员访问
     */
    @GetMapping("/users")
    @PreAuthorize("hasAnyAuthority('ROLE_SUPER_ADMIN','ROLE_VENUE_ADMIN')")
    public ResponseEntity<Map<String, Object>> getAllUsers(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String sortBy,
            @RequestParam(required = false) String sortDir) {
        
        try {
            // 默认按ID排序
            String sortField = (sortBy != null && !sortBy.isEmpty()) ? sortBy : "id";
            Sort.Direction direction = (sortDir != null && sortDir.equalsIgnoreCase("desc")) ? 
                    Sort.Direction.DESC : Sort.Direction.ASC;
            
            // 创建分页请求
            Pageable pageable = PageRequest.of(page - 1, size, Sort.by(direction, sortField));
            Page<User> usersPage = userRepository.findAll(pageable);
            
            List<Map<String, Object>> users = usersPage.getContent().stream().map(user -> {
                Map<String, Object> userMap = new HashMap<>();
                userMap.put("id", user.getId());
                userMap.put("username", user.getUsername());
                userMap.put("nickname", user.getNickname());
                userMap.put("email", user.getEmail());
                userMap.put("phone", user.getPhone());
                userMap.put("roles", user.getRoles());
                userMap.put("active", user.isActive());
                userMap.put("createdAt", user.getCreatedAt());
                userMap.put("updatedAt", user.getUpdatedAt());
                return userMap;
            }).collect(Collectors.toList());
            
            Map<String, Object> response = new HashMap<>();
            response.put("users", users);
            response.put("currentPage", usersPage.getNumber() + 1);
            response.put("totalItems", usersPage.getTotalElements());
            response.put("totalPages", usersPage.getTotalPages());
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "获取用户列表失败: " + e.getMessage());
            return ResponseEntity.badRequest().body(errorResponse);
        }
    }
    
    /**
     * 获取用户详情
     * 仅限超级管理员访问
     */
    @GetMapping("/users/{userId}")
    @PreAuthorize("hasAnyAuthority('ROLE_SUPER_ADMIN','ROLE_VENUE_ADMIN')")
    public ResponseEntity<Map<String, Object>> getUserDetails(@PathVariable Long userId) {
        try {
            Optional<User> userOpt = userRepository.findById(userId);
            if (!userOpt.isPresent()) {
                Map<String, Object> errorResponse = new HashMap<>();
                errorResponse.put("success", false);
                errorResponse.put("message", "用户不存在");
                return ResponseEntity.notFound().build();
            }
            
            User user = userOpt.get();
            Map<String, Object> response = new HashMap<>();
            response.put("id", user.getId());
            response.put("username", user.getUsername());
            response.put("nickname", user.getNickname());
            response.put("email", user.getEmail());
            response.put("phone", user.getPhone());
            response.put("roles", user.getRoles());
            response.put("active", user.isActive());
            response.put("createdAt", user.getCreatedAt());
            response.put("updatedAt", user.getUpdatedAt());
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "获取用户详情失败: " + e.getMessage());
            return ResponseEntity.badRequest().body(errorResponse);
        }
    }
    
    /**
     * 更新用户角色
     * 仅限超级管理员访问
     */
    @PutMapping("/users/{userId}/roles")
    @PreAuthorize("hasAnyAuthority('ROLE_SUPER_ADMIN','ROLE_VENUE_ADMIN')")
    public ResponseEntity<Map<String, Object>> updateUserRoles(
            @PathVariable Long userId, 
            @RequestBody Map<String, Object> updateData) {
        
        try {
            Optional<User> userOpt = userRepository.findById(userId);
            if (!userOpt.isPresent()) {
                Map<String, Object> errorResponse = new HashMap<>();
                errorResponse.put("success", false);
                errorResponse.put("message", "用户不存在");
                return ResponseEntity.notFound().build();
            }
            
            User user = userOpt.get();
            
            // 更新角色
            if (updateData.containsKey("roles")) {
                @SuppressWarnings("unchecked")
                List<String> roleNames = (List<String>) updateData.get("roles");
                Set<Role> roles = new HashSet<>();
                
                for (String roleName : roleNames) {
                    try {
                        Role role = Role.valueOf(roleName);
                        roles.add(role);
                    } catch (IllegalArgumentException e) {
                        Map<String, Object> errorResponse = new HashMap<>();
                        errorResponse.put("success", false);
                        errorResponse.put("message", "无效的角色名称: " + roleName);
                        return ResponseEntity.badRequest().body(errorResponse);
                    }
                }
                
                user.setRoles(roles);
            }
            
            // 更新用户状态
            if (updateData.containsKey("active")) {
                boolean active = (boolean) updateData.get("active");
                user.setActive(active);
            }
            
            User savedUser = userRepository.save(user);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "用户角色更新成功");
            response.put("user", Map.of(
                "id", savedUser.getId(),
                "username", savedUser.getUsername(),
                "roles", savedUser.getRoles(),
                "active", savedUser.isActive()
            ));
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "更新用户角色失败: " + e.getMessage());
            return ResponseEntity.badRequest().body(errorResponse);
        }
    }
    
    /**
     * 删除用户（软删除，将用户状态设置为非活跃）
     * 仅限超级管理员访问
     */
    @DeleteMapping("/users/{userId}")
    @PreAuthorize("hasAnyAuthority('ROLE_SUPER_ADMIN','ROLE_VENUE_ADMIN')")
    public ResponseEntity<Map<String, Object>> deactivateUser(@PathVariable Long userId) {
        try {
            Optional<User> userOpt = userRepository.findById(userId);
            if (!userOpt.isPresent()) {
                Map<String, Object> errorResponse = new HashMap<>();
                errorResponse.put("success", false);
                errorResponse.put("message", "用户不存在");
                return ResponseEntity.notFound().build();
            }
            
            User user = userOpt.get();
            user.setActive(false);
            userRepository.save(user);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "用户已停用");
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "停用用户失败: " + e.getMessage());
            return ResponseEntity.badRequest().body(errorResponse);
        }
    }
    
    /**
     * 重新激活用户
     * 仅限超级管理员访问
     */
    @PutMapping("/users/{userId}/activate")
    @PreAuthorize("hasAnyAuthority('ROLE_SUPER_ADMIN','ROLE_VENUE_ADMIN')")
    public ResponseEntity<Map<String, Object>> activateUser(@PathVariable Long userId) {
        try {
            Optional<User> userOpt = userRepository.findById(userId);
            if (!userOpt.isPresent()) {
                Map<String, Object> errorResponse = new HashMap<>();
                errorResponse.put("success", false);
                errorResponse.put("message", "用户不存在");
                return ResponseEntity.notFound().build();
            }
            
            User user = userOpt.get();
            user.setActive(true);
            userRepository.save(user);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "用户已激活");
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "激活用户失败: " + e.getMessage());
            return ResponseEntity.badRequest().body(errorResponse);
        }
    }
}
