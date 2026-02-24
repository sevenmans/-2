package com.example.gymbooking;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.SQLException;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
public class DatabaseTest {

    @Autowired
    private DataSource dataSource;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    public void testDatabaseConnection() throws SQLException {
        System.out.println("测试数据库连接...");
        try (Connection conn = dataSource.getConnection()) {
            assertNotNull(conn);
            System.out.println("数据库连接成功！");
            System.out.println("URL: " + conn.getMetaData().getURL());
            System.out.println("用户名: " + conn.getMetaData().getUserName());
            
            // 测试查询
            List<Map<String, Object>> result = jdbcTemplate.queryForList("SHOW TABLES");
            System.out.println("数据库表列表:");
            result.forEach(row -> System.out.println("- " + row.values()));
            
            // 检查用户表是否存在
            boolean usersTableExists = result.stream()
                .anyMatch(row -> row.values().toString().toLowerCase().contains("users"));
            System.out.println("用户表存在: " + usersTableExists);
            
            if (usersTableExists) {
                // 查询用户数量
                Integer userCount = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM users", Integer.class);
                System.out.println("用户表中的记录数: " + userCount);
                
                // 查询管理员用户
                List<Map<String, Object>> adminUsers = jdbcTemplate.queryForList(
                    "SELECT * FROM users WHERE username = 'admin'");
                System.out.println("管理员用户: " + adminUsers);
            }
        }
    }
}
