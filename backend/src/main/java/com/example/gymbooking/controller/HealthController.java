package com.example.gymbooking.controller;

import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import jakarta.annotation.security.PermitAll;

import java.util.HashMap;
import java.util.Map;

@RestController
@PermitAll // 允许所有用户访问此控制器的所有端点
public class HealthController {

    @GetMapping(
        value = {
            "/api/health",
            "/health",
            "/api/healths", 
            "/healths", 
            "/api/healths/**", 
            "/healths/**"
        },
        produces = MediaType.APPLICATION_JSON_VALUE
    )
    public ResponseEntity<Map<String, Object>> health() {
        Map<String, Object> response = new HashMap<>();
        response.put("status", "UP");
        response.put("timestamp", System.currentTimeMillis());
        return ResponseEntity.ok(response);
    }
}
