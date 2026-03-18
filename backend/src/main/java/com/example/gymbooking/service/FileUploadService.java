package com.example.gymbooking.service;

import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.UUID;

@Service
public class FileUploadService {
    
    // 上传目录
    private static final String AVATAR_UPLOAD_DIR = "uploads/avatars/";
    private static final String VENUE_UPLOAD_DIR = "uploads/venues/";
    
    // 允许的文件类型
    private static final String[] ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif"};
    
    // 最大文件大小（5MB）
    private static final long MAX_FILE_SIZE = 5 * 1024 * 1024;
    
    /**
     * 上传头像文件
     */
    public String uploadAvatar(MultipartFile file) throws IOException {
        // 验证文件
        validateFile(file);
        
        // 创建上传目录
        createUploadDirectory(AVATAR_UPLOAD_DIR);
        
        // 生成唯一文件名
        String originalFilename = file.getOriginalFilename();
        String extension = getFileExtension(originalFilename);
        String filename = UUID.randomUUID().toString() + extension;
        
        // 保存文件
        Path filePath = Paths.get(AVATAR_UPLOAD_DIR + filename);
        Files.copy(file.getInputStream(), filePath);
        
        // 返回文件访问路径
        return "/uploads/avatars/" + filename;
    }

    /**
     * 上传场馆图片
     */
    public String uploadVenueImage(MultipartFile file) throws IOException {
        validateFile(file);
        createUploadDirectory(VENUE_UPLOAD_DIR);

        String originalFilename = file.getOriginalFilename();
        String extension = getFileExtension(originalFilename);
        String filename = UUID.randomUUID().toString() + extension;

        Path filePath = Paths.get(VENUE_UPLOAD_DIR + filename);
        Files.copy(file.getInputStream(), filePath);

        return "/uploads/venues/" + filename;
    }
    
    /**
     * 验证上传文件
     */
    private void validateFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("文件不能为空");
        }
        
        if (file.getSize() > MAX_FILE_SIZE) {
            throw new IllegalArgumentException("文件大小不能超过5MB");
        }
        
        String originalFilename = file.getOriginalFilename();
        if (originalFilename == null) {
            throw new IllegalArgumentException("文件名不能为空");
        }
        
        String extension = getFileExtension(originalFilename).toLowerCase();
        boolean isAllowed = false;
        for (String allowedExt : ALLOWED_EXTENSIONS) {
            if (allowedExt.equals(extension)) {
                isAllowed = true;
                break;
            }
        }
        
        if (!isAllowed) {
            throw new IllegalArgumentException("只支持jpg、jpeg、png、gif格式的图片");
        }
    }
    
    /**
     * 获取文件扩展名
     */
    private String getFileExtension(String filename) {
        if (filename == null || filename.lastIndexOf('.') == -1) {
            return "";
        }
        return filename.substring(filename.lastIndexOf('.'));
    }
    
    /**
     * 创建上传目录
     */
    private void createUploadDirectory(String dir) throws IOException {
        Path uploadPath = Paths.get(dir);
        if (!Files.exists(uploadPath)) {
            Files.createDirectories(uploadPath);
        }
    }
    
    /**
     * 删除文件
     */
    public boolean deleteFile(String filePath) {
        try {
            if (filePath != null && filePath.startsWith("/uploads/avatars/")) {
                String filename = filePath.substring("/uploads/avatars/".length());
                Path path = Paths.get(AVATAR_UPLOAD_DIR + filename);
                return Files.deleteIfExists(path);
            }
            if (filePath != null && filePath.startsWith("/uploads/venues/")) {
                String filename = filePath.substring("/uploads/venues/".length());
                Path path = Paths.get(VENUE_UPLOAD_DIR + filename);
                return Files.deleteIfExists(path);
            }
            return false;
        } catch (IOException e) {
            System.err.println("删除文件失败: " + e.getMessage());
            return false;
        }
    }
}