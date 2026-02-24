package com.example.gymbooking.service;

import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ThreadLocalRandom;

@Service
public class SmsService {
    
    // 存储验证码的内存缓存（实际项目中应使用Redis）
    private final Map<String, SmsCode> smsCodeCache = new ConcurrentHashMap<>();
    
    // 验证码有效期（5分钟）
    private static final long CODE_EXPIRE_TIME = 5 * 60 * 1000;
    
    /**
     * 发送短信验证码
     */
    public boolean sendSmsCode(String phone) {
        try {
            // 生成6位随机验证码
            String code = String.format("%06d", ThreadLocalRandom.current().nextInt(100000, 999999));
            
            // 存储验证码和过期时间
            SmsCode smsCode = new SmsCode(code, System.currentTimeMillis() + CODE_EXPIRE_TIME);
            smsCodeCache.put(phone, smsCode);
            
            // 模拟发送短信（实际项目中应调用短信服务商API）
            System.out.println("发送短信验证码到 " + phone + ": " + code);
            
            return true;
        } catch (Exception e) {
            System.err.println("发送短信验证码失败: " + e.getMessage());
            return false;
        }
    }
    
    /**
     * 验证短信验证码
     */
    public boolean verifySmsCode(String phone, String code) {
        SmsCode smsCode = smsCodeCache.get(phone);
        
        if (smsCode == null) {
            return false; // 验证码不存在
        }
        
        if (System.currentTimeMillis() > smsCode.getExpireTime()) {
            smsCodeCache.remove(phone); // 清除过期验证码
            return false; // 验证码已过期
        }
        
        if (!smsCode.getCode().equals(code)) {
            return false; // 验证码错误
        }
        
        // 验证成功，清除验证码
        smsCodeCache.remove(phone);
        return true;
    }
    
    /**
     * 清理过期验证码
     */
    public void cleanExpiredCodes() {
        long currentTime = System.currentTimeMillis();
        smsCodeCache.entrySet().removeIf(entry -> currentTime > entry.getValue().getExpireTime());
    }
    
    /**
     * 内部类：短信验证码
     */
    private static class SmsCode {
        private final String code;
        private final long expireTime;
        
        public SmsCode(String code, long expireTime) {
            this.code = code;
            this.expireTime = expireTime;
        }
        
        public String getCode() {
            return code;
        }
        
        public long getExpireTime() {
            return expireTime;
        }
    }
}