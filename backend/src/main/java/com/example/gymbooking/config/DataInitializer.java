package com.example.gymbooking.config;

import com.example.gymbooking.model.Role;
import com.example.gymbooking.model.User;
import com.example.gymbooking.model.Venue;
import com.example.gymbooking.model.Order;
import com.example.gymbooking.repository.UserRepository;
import com.example.gymbooking.repository.VenueRepository;
import com.example.gymbooking.repository.OrderRepository;
import com.example.gymbooking.service.VenueService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import jakarta.annotation.PostConstruct;

import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.HashSet;
import java.util.Set;
import java.util.Arrays;
import java.util.List;

@Component
public class DataInitializer {
    private static final Logger logger = LoggerFactory.getLogger(DataInitializer.class);

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private VenueRepository venueRepository;

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;
    
    @Autowired
    private VenueService venueService;

    @PostConstruct
    public void init() {
        initializeUsers();
        initializeVenues();
        initializeOrders();
        
        // 确保所有篮球和足球场都支持拼场
        try {
            venueService.updateSharingSupportForAllVenues();
            logger.info("Updated sharing support for all venues");
        } catch (Exception e) {
            logger.error("Failed to update sharing support for venues: {}", e.getMessage());
        }
        
        logger.info("Data initialization completed");
    }

    private void initializeUsers() {
        // 创建默认管理员账号
        if (userRepository.count() == 0) {
            logger.info("Creating default admin user...");
            
            // 创建超级管理员
            User admin = new User();
            admin.setUsername("admin");
            admin.setPassword(passwordEncoder.encode("admin123"));
            admin.setNickname("系统管理员");
            admin.setPhone("13800138000");
            admin.setEmail("admin@example.com");
            admin.setActive(true);
            
            // 设置管理员角色
            Set<Role> adminRoles = new HashSet<>();
            adminRoles.add(Role.ROLE_SUPER_ADMIN);
            adminRoles.add(Role.ROLE_ADMIN);
            adminRoles.add(Role.ROLE_USER);
            admin.setRoles(adminRoles);
            
            userRepository.save(admin);
            logger.info("Created default admin user: {}", admin.getUsername());
            
            // 创建测试用户
            User testUser = new User();
            testUser.setUsername("testuser");
            testUser.setPassword(passwordEncoder.encode("123456"));
            testUser.setNickname("测试用户");
            testUser.setPhone("13800138001");
            testUser.setEmail("test@example.com");
            testUser.setActive(true);
            
            // 设置普通用户角色
            Set<Role> userRoles = new HashSet<>();
            userRoles.add(Role.ROLE_USER);
            testUser.setRoles(userRoles);
            
            userRepository.save(testUser);
            logger.info("Created test user: {}", testUser.getUsername());
        } else {
            logger.info("Users already exist, skipping user initialization");
        }
    }

    private void initializeVenues() {
        if (venueRepository.count() == 0) {
            logger.info("Creating test venues...");
            
            List<Object[]> venueData = Arrays.asList(
                new Object[]{"篮球场A", "体育馆1楼东侧", "篮球场", "可用", 80.0},
                new Object[]{"篮球场B", "体育馆1楼西侧", "篮球场", "可用", 80.0},
                new Object[]{"篮球场C", "体育馆2楼东侧", "篮球场", "维护中", 80.0},
                new Object[]{"羽毛球场1", "体育馆2楼中央", "羽毛球场", "可用", 50.0},
                new Object[]{"羽毛球场2", "体育馆2楼中央", "羽毛球场", "可用", 50.0},
                new Object[]{"羽毛球场3", "体育馆2楼中央", "羽毛球场", "可用", 50.0},
                new Object[]{"羽毛球场4", "体育馆2楼中央", "羽毛球场", "已占用", 50.0},
                new Object[]{"乒乓球场1", "体育馆3楼北侧", "乒乓球场", "可用", 30.0},
                new Object[]{"乒乓球场2", "体育馆3楼北侧", "乒乓球场", "可用", 30.0},
                new Object[]{"乒乓球场3", "体育馆3楼北侧", "乒乓球场", "可用", 30.0},
                new Object[]{"网球场A", "室外网球场地", "网球场", "可用", 100.0},
                new Object[]{"网球场B", "室外网球场地", "网球场", "可用", 100.0},
                new Object[]{"足球场", "室外足球场地", "足球场", "可用", 200.0},
                new Object[]{"游泳池A道", "游泳馆1楼", "游泳池", "可用", 60.0},
                new Object[]{"游泳池B道", "游泳馆1楼", "游泳池", "可用", 60.0},
                new Object[]{"健身房A区", "体育馆地下1楼", "健身房", "可用", 40.0},
                new Object[]{"健身房B区", "体育馆地下1楼", "健身房", "可用", 40.0},
                new Object[]{"瑜伽室1", "体育馆4楼", "瑜伽室", "可用", 35.0},
                new Object[]{"瑜伽室2", "体育馆4楼", "瑜伽室", "可用", 35.0},
                new Object[]{"舞蹈室", "体育馆4楼", "舞蹈室", "可用", 45.0}
            );
            
            for (Object[] data : venueData) {
                String name = (String) data[0];
                String location = (String) data[1];
                String type = (String) data[2];
                Double price = (Double) data[4];
                // 使用默认管理者ID
                Long managerId = 1L;
                
                Venue venue = new Venue(name, type, location, price, managerId);
                venue.setStatus(Venue.VenueStatus.valueOf(((String) data[3]).equals("可用") ? "OPEN" : 
                                                        ((String) data[3]).equals("维护中") ? "MAINTENANCE" : "CLOSED"));
                
                // 设置营业时间 - 根据场馆类型设置不同的营业时间
                if (type.contains("游泳池")) {
                    venue.setOpenTime(LocalTime.of(6, 0));   // 游泳池 6:00-23:00
                    venue.setCloseTime(LocalTime.of(23, 0));
                } else if (type.contains("健身房")) {
                    venue.setOpenTime(LocalTime.of(6, 0));   // 健身房 6:00-24:00
                    venue.setCloseTime(LocalTime.of(24, 0));
                } else if (type.contains("瑜伽") || type.contains("舞蹈")) {
                    venue.setOpenTime(LocalTime.of(8, 0));   // 瑜伽/舞蹈室 8:00-22:00
                    venue.setCloseTime(LocalTime.of(22, 0));
                } else {
                    venue.setOpenTime(LocalTime.of(6, 0));   // 其他场馆 6:00-23:00
                    venue.setCloseTime(LocalTime.of(23, 0));
                }
                
                venueRepository.save(venue);
                System.out.println("[DataInitializer] 创建场馆: " + name + 
                                 ", 营业时间: " + venue.getOpenTime() + "-" + venue.getCloseTime());
            }
            
            logger.info("Created {} test venues", venueData.size());
        }
    }

    private void initializeOrders() {
        // Skip order initialization since no users exist
        logger.info("Order initialization skipped - no users available");
    }
}
