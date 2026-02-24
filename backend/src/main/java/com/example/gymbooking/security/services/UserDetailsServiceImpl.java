package com.example.gymbooking.security.services;

import com.example.gymbooking.model.User;
import com.example.gymbooking.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserDetailsServiceImpl implements UserDetailsService {
    private static final Logger logger = LoggerFactory.getLogger(UserDetailsServiceImpl.class);
    
    @Autowired
    private UserRepository userRepository;

    @Override
    @Transactional
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        logger.info("正在加载用户: {}", username);
        try {
            User user = userRepository.findByUsername(username)
                    .orElseThrow(() -> {
                        String errorMsg = "用户未找到: " + username;
                        logger.error(errorMsg);
                        return new UsernameNotFoundException(errorMsg);
                    });

            logger.info("成功加载用户: {}, 角色: {}", user.getUsername(), user.getRoles());
            return UserDetailsImpl.build(user);
        } catch (Exception e) {
            logger.error("加载用户时发生错误: {}", e.getMessage(), e);
            throw e;
        }
    }
}
