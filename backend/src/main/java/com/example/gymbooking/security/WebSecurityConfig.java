package com.example.gymbooking.security;

import com.example.gymbooking.security.jwt.AuthEntryPointJwt;
import com.example.gymbooking.security.jwt.AuthTokenFilter;
import com.example.gymbooking.security.services.UserDetailsServiceImpl;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.http.HttpMethod;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.Arrays;
import java.util.Collections;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class WebSecurityConfig {
    private static final Logger logger = LoggerFactory.getLogger(WebSecurityConfig.class);

    @Autowired
    UserDetailsServiceImpl userDetailsService;

    @Autowired
    private AuthEntryPointJwt unauthorizedHandler;

    @Bean
    public AuthTokenFilter authenticationJwtTokenFilter() {
        return new AuthTokenFilter();
    }

    @Bean
    public DaoAuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider authProvider = new DaoAuthenticationProvider();
        authProvider.setUserDetailsService(userDetailsService);
        authProvider.setPasswordEncoder(passwordEncoder());
        return authProvider;
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration authConfig) throws Exception {
        return authConfig.getAuthenticationManager();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        logger.info("配置安全过滤器链...");
        
        http
            // 配置CORS
            .cors(cors -> {
                logger.info("启用CORS配置");
                cors.configurationSource(corsConfigurationSource());
            })
            // 禁用CSRF
            .csrf(csrf -> csrf.disable())
            // 禁用表单登录
            .formLogin(form -> form.disable())
            // 禁用HTTP Basic认证
            .httpBasic(httpBasic -> httpBasic.disable())
            // 禁用注销
            .logout(logout -> logout.disable())
            // 配置会话管理
            .sessionManagement(session -> session
                .sessionCreationPolicy(SessionCreationPolicy.STATELESS)
            )
            // 配置异常处理
            .exceptionHandling(exception -> exception
                .authenticationEntryPoint(unauthorizedHandler)
            )
            // 配置请求授权
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/auth/**").permitAll() // 允许所有认证相关的请求
                .requestMatchers("/error").permitAll()
                .requestMatchers(
                    "/v3/api-docs/**",
                    "/swagger-ui/**",
                    "/swagger-ui.html",
                    "/api/health/**",
                    "/health/**",
                    "/healths/**"
                ).permitAll()
                // 允许场地和场馆相关的GET请求公开访问
                .requestMatchers(HttpMethod.GET, "/api/venues/**").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/venues/init").permitAll()
                // 允许时间段相关的API公开访问（测试用）
                .requestMatchers(HttpMethod.GET, "/api/timeslots/**").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/timeslots/**").permitAll()
                .requestMatchers(HttpMethod.PATCH, "/api/timeslots/**").permitAll()
                // 允许订单相关的GET和POST请求公开访问（测试用）
                .requestMatchers(HttpMethod.GET, "/api/bookings").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/bookings/**").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/bookings").permitAll()
                .requestMatchers(HttpMethod.PUT, "/api/bookings/*/cancel").permitAll()
                // 允许拼场相关的API公开访问
                .requestMatchers(HttpMethod.GET, "/api/bookings/shared/**").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/bookings/shared").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/bookings/shared/*/join").permitAll()
                // 允许拼场订单相关的API公开访问
                .requestMatchers(HttpMethod.GET, "/api/sharing-orders/**").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/sharing-orders").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/sharing-orders/*/join").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/sharing-orders/*/apply-join").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/sharing-orders/*/cancel-join").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/sharing-orders/*/confirm").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/sharing-orders/*/cancel").permitAll()
                .requestMatchers("/uploads/**").permitAll()
                // 允许测试API公开访问
                .requestMatchers("/api/test/**").permitAll()
                // 允许订单API公开访问（测试用）
                .requestMatchers("/api/order/**").permitAll()
                // 允许WebSocket端点访问
                .requestMatchers("/ws/**").permitAll()
                .anyRequest().authenticated()
            );
            
        // 添加JWT过滤器
        http.addFilterBefore(authenticationJwtTokenFilter(), UsernamePasswordAuthenticationFilter.class);
            
        logger.info("安全配置完成");
        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        logger.info("配置CORS...");
        CorsConfiguration configuration = new CorsConfiguration();

        // 开发环境：允许所有来源
        // 当allowCredentials为true时，必须使用allowedOriginPatterns而不是allowedOrigins
        configuration.addAllowedOriginPattern("*");

        // 允许的HTTP方法
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));

        // 允许的请求头
        configuration.setAllowedHeaders(Arrays.asList(
            "Authorization",
            "Content-Type",
            "Accept",
            "X-Requested-With",
            "Cache-Control",
            "Origin",
            "Access-Control-Request-Method",
            "Access-Control-Request-Headers"
        ));

        // 暴露的响应头
        configuration.setExposedHeaders(Arrays.asList(
            "Authorization",
            "Content-Type",
            "Accept",
            "X-Requested-With",
            "Content-Disposition"
        ));

        // 允许发送凭证（如cookies）
        configuration.setAllowCredentials(true);

        // 预检请求的缓存时间（秒）
        configuration.setMaxAge(3600L);

        logger.info("CORS 配置完成，允许的来源模式: {}", configuration.getAllowedOriginPatterns());

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}
