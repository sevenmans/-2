package com.example.gymbooking.repository;

import com.example.gymbooking.model.Venue;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalTime;
import java.util.List;

@Repository
public interface VenueRepository extends JpaRepository<Venue, Long> {
    
    // 根据场馆类型查询
    List<Venue> findByType(String type);
    
    // 根据场馆状态查询
    List<Venue> findByStatus(Venue.VenueStatus status);
    
    // 根据场馆类型和状态查询
    List<Venue> findByTypeAndStatus(String type, Venue.VenueStatus status);
    
    // 根据是否支持拼场查询
    List<Venue> findBySupportSharing(Boolean supportSharing);
    
    // 根据管理员ID查询
    List<Venue> findByManagerId(Long managerId);
    
    // 根据名称或地址模糊查询（不区分大小写）
    @Query("SELECT v FROM Venue v WHERE LOWER(v.name) LIKE LOWER(CONCAT('%', :keyword, '%')) OR LOWER(v.location) LIKE LOWER(CONCAT('%', :keyword, '%'))")
    List<Venue> findByNameOrLocationContaining(@Param("keyword") String keyword);
    
    // 根据名称模糊查询
    List<Venue> findByNameContainingIgnoreCase(String name);
    
    // 根据位置模糊查询
    List<Venue> findByLocationContainingIgnoreCase(String location);
    
    // 查询所有不同的场馆类型
    @Query("SELECT DISTINCT v.type FROM Venue v")
    List<String> findDistinctTypes();
    
    // 根据价格范围查询
    List<Venue> findByPriceBetween(Double minPrice, Double maxPrice);
    
    // 根据开放时间查询
    List<Venue> findByOpenTimeBefore(LocalTime time);
    
    // 根据关闭时间查询
    List<Venue> findByCloseTimeAfter(LocalTime time);
    
    // 根据类型和是否支持拼场查询
    List<Venue> findByTypeAndSupportSharing(String type, Boolean supportSharing);
    
    // 根据多个类型查询
    @Query("SELECT v FROM Venue v WHERE v.type IN :types")
    List<Venue> findByTypeIn(@Param("types") List<String> types);
}