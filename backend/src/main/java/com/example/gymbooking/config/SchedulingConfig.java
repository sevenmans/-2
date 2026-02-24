package com.example.gymbooking.config;

import com.example.gymbooking.service.SharingOrderService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;

/**
 * 定时任务配置类
 * 用于配置系统中的各种定时任务，如处理过期的拼场订单等
 */
@Configuration
@EnableScheduling
public class SchedulingConfig {
    
    private static final Logger logger = LoggerFactory.getLogger(SchedulingConfig.class);
    
    @Autowired
    private SharingOrderService sharingOrderService;
    
    /**
     * 每天凌晨1点执行一次，处理过期的拼场订单
     * cron表达式：秒 分 时 日 月 周
     */
    @Scheduled(cron = "0 0 1 * * ?")
    public void processExpiringSharingOrders() {
        logger.info("开始执行过期拼场订单处理定时任务");
        try {
            int processedCount = sharingOrderService.processExpiringSharingOrders();
            logger.info("过期拼场订单处理完成，共处理{}个订单", processedCount);
        } catch (Exception e) {
            logger.error("过期拼场订单处理定时任务执行失败: {}", e.getMessage(), e);
        }
    }
}