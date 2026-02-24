package com.example.gymbooking.repository;

import com.example.gymbooking.model.SharingRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface SharingRequestRepository extends JpaRepository<SharingRequest, Long> {
    
    /**
     * 根据订单ID查找拼场申请
     */
    List<SharingRequest> findByOrderId(Long orderId);
    
    /**
     * 根据申请人用户名查找拼场申请
     */
    List<SharingRequest> findByApplicantUsername(String applicantUsername);
    
    /**
     * 根据状态查找拼场申请
     */
    List<SharingRequest> findByStatus(SharingRequest.RequestStatus status);
    
    /**
     * 根据订单ID和状态查找拼场申请
     */
    List<SharingRequest> findByOrderIdAndStatus(Long orderId, SharingRequest.RequestStatus status);
    
    /**
     * 根据申请人用户名和状态查找拼场申请
     */
    List<SharingRequest> findByApplicantUsernameAndStatus(String applicantUsername, SharingRequest.RequestStatus status);
    
    /**
     * 检查用户是否已经申请过某个订单的拼场
     */
    boolean existsByOrderIdAndApplicantUsername(Long orderId, String applicantUsername);

    /**
     * 检查用户是否已经对某个拼场订单提交了有效的申请（非取消、拒绝状态）
     */
    boolean existsBySharingOrderIdAndApplicantUsernameAndStatusNotIn(
        Long sharingOrderId, String username, List<SharingRequest.RequestStatus> statuses
    );
    
    /**
     * 获取某个订单的所有已批准的拼场申请
     */
    @Query("SELECT sr FROM SharingRequest sr WHERE sr.orderId = :orderId AND sr.status = 'APPROVED'")
    List<SharingRequest> findApprovedRequestsByOrderId(@Param("orderId") Long orderId);
    
    /**
     * 统计某个订单的已批准申请的总参与人数
     */
    @Query("SELECT COALESCE(SUM(sr.participantsCount), 0) FROM SharingRequest sr WHERE sr.orderId = :orderId AND sr.status = 'APPROVED'")
    Integer countApprovedParticipantsByOrderId(@Param("orderId") Long orderId);
    
    /**
     * 检查用户是否已经申请过某个拼场订单
     */
    boolean existsBySharingOrderIdAndApplicantUsername(Long sharingOrderId, String applicantUsername);

    /**
     * 根据申请者订单ID查找拼场申请
     */
    SharingRequest findByApplicantOrderId(Long applicantOrderId);
    
    /**
     * 统计某个拼场订单的已批准申请的总参与人数
     */
    @Query("SELECT COALESCE(SUM(sr.participantsCount), 0) FROM SharingRequest sr WHERE sr.sharingOrderId = :sharingOrderId AND sr.status = 'APPROVED'")
    Integer countApprovedParticipantsBySharingOrderId(@Param("sharingOrderId") Long sharingOrderId);

    /**
     * 查找指定状态且支付截止时间已过的申请
     */
    List<SharingRequest> findByStatusAndPaymentDeadlineBefore(SharingRequest.RequestStatus status, LocalDateTime deadline);
}