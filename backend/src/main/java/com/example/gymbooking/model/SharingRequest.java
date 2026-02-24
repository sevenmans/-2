package com.example.gymbooking.model;

import jakarta.persistence.*;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "sharing_request")
@NoArgsConstructor
@AllArgsConstructor
public class SharingRequest {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "order_id", nullable = false)
    private Long orderId;
    
    @Column(name = "sharing_order_id")
    private Long sharingOrderId;
    
    @Column(name = "applicant_username", nullable = false, length = 50)
    private String applicantUsername;
    
    @Column(name = "applicant_team_name", length = 50)
    private String applicantTeamName;
    
    @Column(name = "applicant_contact", length = 100)
    private String applicantContact;
    
    @Column(name = "participants_count", nullable = false)
    private Integer participantsCount = 1;
    
    @Column(name = "message", length = 500)
    private String message;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private RequestStatus status = RequestStatus.PENDING;
    
    @Column(name = "created_at", updatable = false, nullable = false)
    private LocalDateTime createdAt;
    
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
    
    @Column(name = "response_message", length = 500)
    private String responseMessage;

    @Column(name = "payment_deadline")
    private LocalDateTime paymentDeadline;  // 支付截止时间

    @Column(name = "applicant_order_id")
    private Long applicantOrderId;  // 申请者的订单ID（保留兼容性，但不再使用）

    // 新增支付相关字段
    @Column(name = "payment_amount")
    private Double paymentAmount;        // 申请者需要支付的金额

    @Column(name = "paid_at")
    private LocalDateTime paidAt;        // 支付时间

    @Column(name = "payment_order_no", length = 100)
    private String paymentOrderNo;       // 支付订单号（用于支付系统）

    @Column(name = "is_paid")
    private Boolean isPaid = false;      // 是否已支付
    
    @PrePersist
    protected void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        if (this.createdAt == null) {
            this.createdAt = now;
        }
        this.updatedAt = now;
    }
    
    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
    
    public enum RequestStatus {
        PENDING("待处理"),
        APPROVED_PENDING_PAYMENT("已批准待支付"),
        PAID("已支付"),              // 新增：申请者已支付
        APPROVED("已完成"),          // 拼场成功，双方都完成
        REJECTED("已拒绝"),
        TIMEOUT_CANCELLED("超时取消"),
        CANCELLED("已取消");

        private final String description;
        
        RequestStatus(String description) {
            this.description = description;
        }
        
        public String getDescription() {
            return description;
        }
    }
    
    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getOrderId() {
        return orderId;
    }

    public void setOrderId(Long orderId) {
        this.orderId = orderId;
    }

    public Long getSharingOrderId() {
        return sharingOrderId;
    }

    public void setSharingOrderId(Long sharingOrderId) {
        this.sharingOrderId = sharingOrderId;
    }

    public String getApplicantUsername() {
        return applicantUsername;
    }

    public void setApplicantUsername(String applicantUsername) {
        this.applicantUsername = applicantUsername;
    }

    public String getApplicantTeamName() {
        return applicantTeamName;
    }

    public void setApplicantTeamName(String applicantTeamName) {
        this.applicantTeamName = applicantTeamName;
    }

    public String getApplicantContact() {
        return applicantContact;
    }

    public void setApplicantContact(String applicantContact) {
        this.applicantContact = applicantContact;
    }

    public Integer getParticipantsCount() {
        return participantsCount;
    }

    public void setParticipantsCount(Integer participantsCount) {
        this.participantsCount = participantsCount;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public RequestStatus getStatus() {
        return status;
    }

    public void setStatus(RequestStatus status) {
        this.status = status;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public String getResponseMessage() {
        return responseMessage;
    }

    public void setResponseMessage(String responseMessage) {
        this.responseMessage = responseMessage;
    }

    public LocalDateTime getPaymentDeadline() {
        return paymentDeadline;
    }

    public void setPaymentDeadline(LocalDateTime paymentDeadline) {
        this.paymentDeadline = paymentDeadline;
    }

    public Long getApplicantOrderId() {
        return applicantOrderId;
    }

    public void setApplicantOrderId(Long applicantOrderId) {
        this.applicantOrderId = applicantOrderId;
    }

    public Double getPaymentAmount() {
        return paymentAmount;
    }

    public void setPaymentAmount(Double paymentAmount) {
        this.paymentAmount = paymentAmount;
    }

    public LocalDateTime getPaidAt() {
        return paidAt;
    }

    public void setPaidAt(LocalDateTime paidAt) {
        this.paidAt = paidAt;
    }

    public String getPaymentOrderNo() {
        return paymentOrderNo;
    }

    public void setPaymentOrderNo(String paymentOrderNo) {
        this.paymentOrderNo = paymentOrderNo;
    }

    public Boolean getIsPaid() {
        return isPaid;
    }

    public void setIsPaid(Boolean isPaid) {
        this.isPaid = isPaid;
    }

    // 静态工厂方法
    public static SharingRequest createRequest(Long orderId, String applicantUsername, 
                                             String applicantTeamName, String applicantContact,
                                             Integer participantsCount, String message) {
        SharingRequest request = new SharingRequest();
        request.setOrderId(orderId);
        request.setApplicantUsername(applicantUsername);
        request.setApplicantTeamName(applicantTeamName);
        request.setApplicantContact(applicantContact);
        request.setParticipantsCount(participantsCount);
        request.setMessage(message);
        request.setStatus(RequestStatus.PENDING);
        return request;
    }
    
    // 为拼场订单创建申请的静态工厂方法
    public static SharingRequest createRequestForSharingOrder(Long sharingOrderId, String applicantUsername, 
                                                            String applicantTeamName, String applicantContact,
                                                            Integer participantsCount, String message) {
        SharingRequest request = new SharingRequest();
        request.setSharingOrderId(sharingOrderId);
        request.setApplicantUsername(applicantUsername);
        request.setApplicantTeamName(applicantTeamName);
        request.setApplicantContact(applicantContact);
        request.setParticipantsCount(participantsCount);
        request.setMessage(message);
        request.setStatus(RequestStatus.PENDING);
        return request;
    }
}