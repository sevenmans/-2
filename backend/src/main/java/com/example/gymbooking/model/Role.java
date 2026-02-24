package com.example.gymbooking.model;

public enum Role {
    ROLE_USER,           // 普通用户
    ROLE_ADMIN,          // 管理员（兼容旧数据）
    ROLE_VENUE_ADMIN,    // 场馆管理员
    ROLE_SUPER_ADMIN     // 超级管理员
}
