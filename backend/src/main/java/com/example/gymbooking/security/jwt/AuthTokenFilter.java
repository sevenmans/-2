package com.example.gymbooking.security.jwt;

import java.io.IOException;
import java.util.Enumeration;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.stereotype.Component;

import com.example.gymbooking.security.services.UserDetailsServiceImpl;

@Component
public class AuthTokenFilter extends OncePerRequestFilter {
    @Autowired
    private JwtUtils jwtUtils;

    @Autowired
    private UserDetailsServiceImpl userDetailsService;

    private static final Logger logger = LoggerFactory.getLogger(AuthTokenFilter.class);
    
    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        logger.debug("处理请求: {} {}", request.getMethod(), request.getRequestURI());
        
        // 检查是否是公开接口
        String requestURI = request.getRequestURI();
        String method = request.getMethod();
        
        // 公开接口列表
        if (isPublicEndpoint(requestURI, method)) {
            logger.debug("公开接口，跳过JWT验证: {} {}", method, requestURI);
            filterChain.doFilter(request, response);
            return;
        }
        
        // 打印请求头信息
        logger.debug("请求头信息:");
        Enumeration<String> headerNames = request.getHeaderNames();
        while (headerNames.hasMoreElements()) {
            String headerName = headerNames.nextElement();
            logger.debug("  {}: {}", headerName, request.getHeader(headerName));
        }
        
        try {
            String jwt = parseJwt(request);
            if (jwt != null && jwtUtils.validateJwtToken(jwt)) {
                String username = jwtUtils.getUserNameFromJwtToken(jwt);
                
                UserDetails userDetails = userDetailsService.loadUserByUsername(username);
                UsernamePasswordAuthenticationToken authentication = 
                    new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities());
                authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                
                SecurityContextHolder.getContext().setAuthentication(authentication);
                logger.debug("用户 {} 认证成功", username);
            } else {
                logger.debug("未找到有效的JWT令牌");
            }
        } catch (Exception e) {
            logger.error("无法设置用户认证: {}", e.getMessage());
        }
        
        if (SecurityContextHolder.getContext().getAuthentication() == null) {
            logger.debug("请求中未找到JWT令牌");
        }
        
        filterChain.doFilter(request, response);
    }
    
    private boolean isPublicEndpoint(String requestURI, String method) {
        // 认证相关接口
        if (requestURI.startsWith("/api/auth/")) {
            return true;
        }
        
        // 错误页面
        if (requestURI.equals("/error")) {
            return true;
        }
        
        // Swagger文档
        if (requestURI.startsWith("/v3/api-docs/") || 
            requestURI.startsWith("/swagger-ui/") || 
            requestURI.equals("/swagger-ui.html") ||
            requestURI.startsWith("/api/health/")) {
            return true;
        }
        
        // 场地和场馆的GET请求
        if ("GET".equals(method) && 
            requestURI.startsWith("/api/venues")) {
            return true;
        }
        
        // 只有特定的预约接口允许公开访问（如果有的话）
        // 注意：大部分预约接口都需要认证，这里暂时不开放任何预约接口
        // if ("GET".equals(method) && requestURI.equals("/api/bookings/public-endpoint")) {
        //     return true;
        // }
        
        // 上传文件
        if (requestURI.startsWith("/uploads/")) {
            return true;
        }
        
        return false;
    }
    


    private String parseJwt(HttpServletRequest request) {
        // 1. 从Authorization头获取token
        String headerAuth = request.getHeader("Authorization");
        
        // 2. 检查Authorization头是否存在且格式正确
        if (StringUtils.hasText(headerAuth) && headerAuth.startsWith("Bearer ")) {
            String token = headerAuth.substring(7);
            logger.debug("从Authorization头解析到JWT令牌，长度: {}", token.length());
            return token;
        }
        
        // 3. 也可以尝试从请求参数中获取token
        String tokenParam = request.getParameter("token");
        if (StringUtils.hasText(tokenParam)) {
            logger.debug("从请求参数中解析到JWT令牌，长度: {}", tokenParam.length());
            return tokenParam;
        }
        
        logger.debug("未找到有效的JWT令牌");
        return null;
    }
}
