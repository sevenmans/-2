package com.example.gymbooking.controller;

import com.example.gymbooking.model.Role;
import com.example.gymbooking.model.User;
import com.example.gymbooking.payload.request.LoginRequest;
import com.example.gymbooking.payload.request.SignupRequest;
import com.example.gymbooking.payload.response.JwtResponse;
import com.example.gymbooking.payload.response.MessageResponse;
import com.example.gymbooking.repository.UserRepository;
import com.example.gymbooking.security.jwt.JwtUtils;
import com.example.gymbooking.security.services.UserDetailsImpl;
import com.example.gymbooking.security.services.UserDetailsServiceImpl;
import com.example.gymbooking.service.SmsService;
import com.example.gymbooking.service.WechatAuthService;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import jakarta.servlet.http.HttpServletRequest;
import java.util.Enumeration;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private static final Logger logger = LoggerFactory.getLogger(AuthController.class);
    
    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private JwtUtils jwtUtils;
    
    @Autowired
    private UserDetailsServiceImpl userDetailsService;
    
    @Autowired
    private PasswordEncoder encoder;  // 用于密码加密和验证
    
    @Autowired
    private AuthenticationManager authenticationManager;
    
    @Autowired
    private SmsService smsService;

    @Autowired
    private WechatAuthService wechatAuthService;

    @PostMapping("/signin")
    public ResponseEntity<?> authenticateUser(@Valid @RequestBody LoginRequest loginRequest, HttpServletRequest request) {
        try {
            logger.info("\n=== 开始处理登录请求 ===");
            logger.info("请求方法: {}", request.getMethod());
            logger.info("请求URL: {}", request.getRequestURL());
            logger.info("请求参数: {}", loginRequest);
            
            // 记录请求头
            logger.info("请求头信息:");
            Enumeration<String> headerNames = request.getHeaderNames();
            while (headerNames.hasMoreElements()) {
                String headerName = headerNames.nextElement();
                logger.info("  {}: {}", headerName, request.getHeader(headerName));
            }
            
            // 检查请求体是否为空
            if (loginRequest == null) {
                logger.error("请求体为空");
                return ResponseEntity.badRequest().body(new MessageResponse("请求体不能为空"));
            }
            
            // 检查用户名和密码是否为空
            if (loginRequest.getUsername() == null || loginRequest.getUsername().trim().isEmpty()) {
                logger.error("用户名为空");
                return ResponseEntity.badRequest().body(new MessageResponse("用户名不能为空"));
            }
            
            if (loginRequest.getPassword() == null || loginRequest.getPassword().trim().isEmpty()) {
                logger.error("密码为空");
                return ResponseEntity.badRequest().body(new MessageResponse("密码不能为空"));
            }
            
            logger.info("请求参数验证通过");
            
            // 1. 检查用户是否存在
            logger.info("1. 检查用户是否存在...");
            User user = userRepository.findByUsername(loginRequest.getUsername())
                    .orElseThrow(() -> {
                        String errorMsg = "用户不存在: " + loginRequest.getUsername();
                        logger.error(errorMsg);
                        return new UsernameNotFoundException(errorMsg);
                    });
            
            // 2. 验证密码
            logger.info("2. 验证密码...");
            if (!encoder.matches(loginRequest.getPassword(), user.getPassword())) {
                String errorMsg = "密码错误";
                logger.error(errorMsg);
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(new MessageResponse(errorMsg));
            }
            
            // 3. 生成JWT令牌
            logger.info("3. 生成JWT令牌...");
            // 首先进行认证
            Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                    loginRequest.getUsername(), 
                    loginRequest.getPassword()
                )
            );
            
            // 生成JWT令牌
            String jwt = jwtUtils.generateJwtToken(authentication);
            
            // 4. 返回登录成功响应
            logger.info("4. 返回登录成功响应");
            // 将Set<Role>转换为List<String>
            List<String> roleNames = user.getRoles().stream()
                .map(role -> role.name())
                .collect(Collectors.toList());
                
            JwtResponse jwtResponse = new JwtResponse(
                jwt,
                "Bearer",
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                roleNames
            );
            return ResponseEntity.<JwtResponse>ok(jwtResponse);
            
        } catch (UsernameNotFoundException e) {
            logger.warn("登录失败 - 用户不存在: {}", loginRequest.getUsername());
            logger.debug("异常详情:", e);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(new MessageResponse("用户名或密码错误"));
        } catch (Exception e) {
            logger.error("登录过程中发生错误: {}", e.getMessage(), e);
            logger.error("异常类型: {}", e.getClass().getName());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new MessageResponse("服务器内部错误: " + e.getMessage()));
        } finally {
            logger.info("=== 登录请求处理结束 ===");
        }
    }

    @PostMapping("/signup")
    public ResponseEntity<?> registerUser(@Valid @RequestBody SignupRequest signUpRequest) {
        try {
            logger.info("=== 开始处理注册请求 ===");
            logger.info("处理注册请求 - 用户名: {}", signUpRequest.getUsername());
            logger.info("请求参数: {}", signUpRequest);
        
        // 验证用户名是否已存在
        logger.info("检查用户名是否存在...");
        
        // 验证用户名是否已存在
        if (userRepository.existsByUsername(signUpRequest.getUsername())) {
            logger.warn("注册失败 - 用户名已存在: {}", signUpRequest.getUsername());
            return ResponseEntity
                    .status(HttpStatus.CONFLICT)
                    .body(new MessageResponse("用户名已被注册"));
        }

        // 验证邮箱是否已存在（如果提供了邮箱）
        if (signUpRequest.getEmail() != null && !signUpRequest.getEmail().isEmpty()) {
            if (userRepository.existsByEmail(signUpRequest.getEmail())) {
                logger.warn("注册失败 - 邮箱已存在: {}", signUpRequest.getEmail());
                return ResponseEntity
                        .status(HttpStatus.CONFLICT)
                        .body(new MessageResponse("邮箱已被注册"));
            }
        }

        // Create new user's account
        String email = signUpRequest.getEmail();
        if (email == null || email.trim().isEmpty()) {
            email = null;
        }
        User user = new User(
                signUpRequest.getUsername(),
                encoder.encode(signUpRequest.getPassword()),
                signUpRequest.getNickname(),
                signUpRequest.getPhone(),
                email
        );

        // 设置用户角色
        Set<Role> userRoles = new HashSet<>();
        userRoles.add(Role.ROLE_USER);
        user.setRoles(userRoles);

        // 保存用户
        User savedUser = userRepository.save(user);
        logger.info("用户注册成功 - ID: {}, 用户名: {}", savedUser.getId(), savedUser.getUsername());

        // 创建认证对象
        UserDetails userDetails = userDetailsService.loadUserByUsername(savedUser.getUsername());
        
        // 创建认证令牌
        UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
            userDetails, 
            null, 
            userDetails.getAuthorities()
        );
        
        // 生成JWT令牌
        String jwt = jwtUtils.generateJwtToken(authentication);
        
        // 获取用户角色
        UserDetailsImpl userDetailsImpl = (UserDetailsImpl) userDetails;
        List<String> roleList = userDetailsImpl.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .collect(Collectors.toList());
        
        // 返回JWT和用户信息
        JwtResponse jwtResponse = new JwtResponse(
                jwt,
                "Bearer",
                userDetailsImpl.getId(),
                userDetailsImpl.getUsername(),
                userDetailsImpl.getEmail(),
                roleList
        );
        logger.info("=== 注册请求处理成功 ===");
        return ResponseEntity.<JwtResponse>ok(jwtResponse);
        
        } catch (Exception e) {
            logger.error("注册过程中发生错误: {}", e.getMessage(), e);
            logger.error("异常类型: {}", e.getClass().getName());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new MessageResponse("服务器内部错误: " + e.getMessage()));
        } finally {
            logger.info("=== 注册请求处理结束 ===");
        }
    }
    
    /**
     * 获取短信验证码
     */
    @PostMapping("/sms-code")
    public ResponseEntity<Map<String, Object>> getSmsCode(@RequestBody Map<String, String> request) {
        String phone = request.get("phone");
        Map<String, Object> response = new HashMap<>();
        
        if (phone == null || phone.trim().isEmpty()) {
            response.put("success", false);
            response.put("message", "手机号不能为空");
            return ResponseEntity.badRequest().body(response);
        }
        
        // 简单的手机号格式验证
        if (!phone.matches("^1[3-9]\\d{9}$")) {
            response.put("success", false);
            response.put("message", "手机号格式不正确");
            return ResponseEntity.badRequest().body(response);
        }
        
        boolean sent = smsService.sendSmsCode(phone);
        
        if (sent) {
            response.put("success", true);
            response.put("message", "验证码发送成功");
            return ResponseEntity.ok(response);
        } else {
            response.put("success", false);
            response.put("message", "验证码发送失败，请稍后重试");
            return ResponseEntity.internalServerError().body(response);
        }
    }

    @PostMapping("/wechat/login")
    public ResponseEntity<?> wechatLogin(@RequestBody Map<String, String> request) {
        String code = request.get("code");
        if (code == null || code.trim().isEmpty()) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "code不能为空");
            return ResponseEntity.badRequest().body(response);
        }

        try {
            String openid = wechatAuthService.getOpenidByCode(code);
            User user = userRepository.findByWechatOpenid(openid).orElseGet(() -> {
                String suffix = openid.length() > 8 ? openid.substring(openid.length() - 8) : openid;
                String username = "wx_" + suffix;
                while (Boolean.TRUE.equals(userRepository.existsByUsername(username))) {
                    username = "wx_" + suffix + "_" + System.currentTimeMillis() % 10000;
                }

                User newUser = new User();
                newUser.setUsername(username);
                newUser.setPassword(encoder.encode(UUID.randomUUID().toString()));
                newUser.setNickname("微信用户" + suffix);
                newUser.setPhone(null);
                newUser.setEmail(null);
                newUser.setWechatOpenid(openid);
                Set<Role> roles = new HashSet<>();
                roles.add(Role.ROLE_USER);
                newUser.setRoles(roles);
                return userRepository.save(newUser);
            });

            UserDetails userDetails = userDetailsService.loadUserByUsername(user.getUsername());
            UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                    userDetails,
                    null,
                    userDetails.getAuthorities()
            );
            String jwt = jwtUtils.generateJwtToken(authentication);
            List<String> roleNames = user.getRoles().stream().map(Enum::name).collect(Collectors.toList());
            JwtResponse jwtResponse = new JwtResponse(
                    jwt,
                    "Bearer",
                    user.getId(),
                    user.getUsername(),
                    user.getEmail(),
                    roleNames
            );
            return ResponseEntity.ok(jwtResponse);
        } catch (Exception e) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
        }
    }
    
    /**
     * 退出登录
     */
    @PostMapping("/logout")
    public ResponseEntity<Map<String, Object>> logout() {
        Map<String, Object> response = new HashMap<>();
        
        try {
            // 清除Spring Security上下文
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null) {
                SecurityContextHolder.getContext().setAuthentication(null);
            }
            
            response.put("success", true);
            response.put("message", "退出登录成功");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "退出登录失败: " + e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }
}
