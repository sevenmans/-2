package com.example.gymbooking.controller;

import com.example.gymbooking.model.Role;
import com.example.gymbooking.model.User;
import com.example.gymbooking.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin")
@CrossOrigin(origins = "*")
public class AdminController {
    
    @Autowired
    private UserRepository userRepository;
    
    /**
     * 获取所有用户（分页）
     * 仅限超级管理员访问
     */
    @GetMapping("/users")
    @PreAuthorize("hasRole('ROLE_SUPER_ADMIN')")
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
    @PreAuthorize("hasRole('ROLE_SUPER_ADMIN')")
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
    @PreAuthorize("hasRole('ROLE_SUPER_ADMIN')")
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
    @PreAuthorize("hasRole('ROLE_SUPER_ADMIN')")
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
    @PreAuthorize("hasRole('ROLE_SUPER_ADMIN')")
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