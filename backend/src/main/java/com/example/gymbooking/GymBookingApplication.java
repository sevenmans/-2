package com.example.gymbooking;

import com.example.gymbooking.model.Role;
import com.example.gymbooking.model.User;
import com.example.gymbooking.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashSet;
import java.util.Set;

@SpringBootApplication
@EnableJpaRepositories(basePackages = "com.example.gymbooking.repository")
@EnableScheduling
@RestController
public class GymBookingApplication {
    private static final Logger logger = LoggerFactory.getLogger(GymBookingApplication.class);
    
    public static void main(String[] args) {
        SpringApplication.run(GymBookingApplication.class, args);
    }
    
    // 移除CommandLineRunner，改用DataInitializer组件
    
    @GetMapping("/health")
    public String healthCheck() {
        return "Server is running";
    }
}
