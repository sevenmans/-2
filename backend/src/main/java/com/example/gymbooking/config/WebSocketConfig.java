package com.example.gymbooking.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

/**
 * WebSocket配置类
 * 用于配置WebSocket消息代理和端点
 */
@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    /**
     * 配置消息代理
     * @param config 消息代理注册器
     */
    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        // 启用简单的消息代理，用于向客户端发送消息
        config.enableSimpleBroker("/topic", "/queue");
        // 设置应用程序目标前缀，客户端发送消息时使用
        config.setApplicationDestinationPrefixes("/app");
    }

    /**
     * 注册STOMP端点
     * @param registry STOMP端点注册器
     */
    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // 注册WebSocket端点，允许跨域访问
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns("*")
                .withSockJS(); // 启用SockJS支持，用于不支持WebSocket的浏览器
    }
}