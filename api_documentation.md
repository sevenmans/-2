# 体育馆预约系统 API 接口规范（代码实况版）

## 1. 文档说明

- 本文档基于当前项目真实代码扫描生成，只记录代码中存在的接口。
- 扫描范围：
  - 后端：`backend/src/main/java/com/example/gymbooking/controller/*.java`
  - 前端：`体育馆预约2.0/src/api/*.js` 与少量页面内直接请求
- 前端默认基础地址（开发环境）：`http://localhost:8080/api`
  - 见 `体育馆预约2.0/src/config/index.js`
  - 请求拼接逻辑见 `体育馆预约2.0/src/utils/request.js`
- 认证方式：JWT，Header 为 `Authorization: Bearer <token>`。

## 2. 后端真实接口总览（按控制器）

## 2.1 认证模块 AuthController（`/api/auth`）

- `POST /api/auth/signin`（登录）
  - 入参：`LoginRequest`
  - 返回：`ResponseEntity<?>`
- `POST /api/auth/signup`（注册）
  - 入参：`SignupRequest`
  - 返回：`ResponseEntity<?>`
- `POST /api/auth/sms-code`（发送短信验证码）
  - 入参：`Map<String, String>`
  - 返回：`ResponseEntity<?>`
- `POST /api/auth/wechat/login`（微信登录）
  - 入参：`Map<String, String>`
  - 返回：`ResponseEntity<?>`
- `POST /api/auth/logout`（退出登录）
  - 入参：无
  - 返回：`ResponseEntity<Map<String, Object>>`

## 2.2 用户模块 UserController（`/api/users`）

- `GET /api/users/me`（当前用户信息）
- `GET /api/users/{userId}`（指定用户信息）
- `PUT /api/users/me`（更新当前用户信息）
  - 入参：`Map<String, Object>`
- `PUT /api/users/me/password`（修改密码）
  - 入参：`Map<String, String>`
- `GET /api/users/me/bookings`（我的预约）
  - Query：`page`、`pageSize`、`status`
- `GET /api/users/me/orders`（我的订单）
  - Query：`page`、`pageSize`、`status`
- `GET /api/users/me/stats`（我的统计）
- `POST /api/users/me/avatar`（上传头像）
  - FormData：`file`
- `GET /api/users/me/virtual-order/{requestId}`（虚拟订单查询）

## 2.3 预约模块 BookingController（`/api/bookings`）

- `POST /api/bookings`（创建预约）
  - 入参：`Map<String, Object>`
- `GET /api/bookings`（预约列表）
  - Query：`page`、`pageSize`、`status`、`startDate`、`endDate`、`userId`
- `GET /api/bookings/{id}`（预约详情）
- `PUT /api/bookings/{id}/cancel`（取消预约）
- `POST /api/bookings/{id}/admin-cancel`（管理员取消/逻辑退款）
- `GET /api/bookings/venues/{venueId}/slots`（场馆可用时段）
  - Query：`date`
- `POST /api/bookings/shared`（创建拼场预约）
  - 入参：`Map<String, Object>`
- `GET /api/bookings/shared/available`（可拼场列表）
  - Query：`date`、`venueType`、`page`、`pageSize`
- `POST /api/bookings/shared/{sharingOrderId}/apply`（申请拼场）
  - 入参：`Map<String, Object>`
- `PUT /api/bookings/shared/requests/{requestId}`（处理拼场申请）
  - 入参：`Map<String, Object>`
- `GET /api/bookings/shared/my-requests`（我发出的拼场申请）
  - Query：`status`、`page`、`pageSize`
- `GET /api/bookings/shared/received-requests`（我收到的拼场申请）

## 2.4 场馆模块 VenueController（`/api/venues`）

- `GET /api/venues`（场馆列表）
  - Query：`page`、`pageSize`、`type`、`status`、`minPrice`、`maxPrice`
- `GET /api/venues/{id}`（场馆详情）
- `GET /api/venues/{venueId}/slots`（场馆时段）
  - Query：`date`
- `GET /api/venues/{venueId}/timeslots`（场馆时段）
  - Query：`date`、`refresh`
- `GET /api/venues/types`（场馆类型）
- `GET /api/venues/search`（搜索场馆）
  - Query：`keyword`、`type`、`date`、`timeSlot`、`minPrice`、`maxPrice`
- `GET /api/venues/popular`（热门场馆）
  - Query：`limit`
- `POST /api/venues`（创建场馆）
  - 入参：`Venue`
- `PUT /api/venues/{id}`（更新场馆）
  - 入参：`Venue`
- `DELETE /api/venues/{id}`（删除场馆）
- `PATCH /api/venues/{id}/status`（更新场馆状态）
  - 入参：`Map<String, String>`
- `GET /api/venues/sharing`（支持拼场场馆）
- `GET /api/venues/manager/me`（当前管理员管理的场馆）

## 2.5 时段模块 TimeSlotController（`/api/timeslots`）

- `GET /api/timeslots/venue/{venueId}/date/{date}`（指定日期时段）
- `GET /api/timeslots/venue/{venueId}/date/{date}/available`（可用时段）
- `POST /api/timeslots/venue/{venueId}/date/{date}/generate`（生成当日时段）
- `POST /api/timeslots/venue/{venueId}/generate-week`（生成未来一周时段）
- `PATCH /api/timeslots/{id}/status`（更新时段状态）
  - 入参：`Map<String, String>`
- `GET /api/timeslots/check`（检查时段可约）
  - Query：`venueId`、`date`、`startTime`、`endTime`
- `GET /api/timeslots/venue/{venueId}/date/{date}/refresh`（刷新时段状态）
- `POST /api/timeslots/admin/mark-expired`（管理任务：标记过期）
- `POST /api/timeslots/admin/reset-future-expired`（管理任务：重置未来误标记）

## 2.6 拼场申请模块 SharingController（`/api/shared`）

- `PUT /api/shared/requests/{requestId}`（处理拼场申请）
  - 入参：`Map<String, Object>`
- `GET /api/shared/my-requests`（我发出的申请）
  - Query：`status`、`page`、`pageSize`
- `GET /api/shared/received-requests`（我收到的申请）
  - Query：`status`、`page`、`pageSize`
- `DELETE /api/shared/requests/{requestId}/cancel`（取消申请）

## 2.7 拼场订单模块 SharingOrderController（`/api/sharing-orders`）

- `POST /api/sharing-orders`（创建拼场订单）
- `GET /api/sharing-orders/{id}`（拼场订单详情）
- `GET /api/sharing-orders/by-order/{orderId}`（按主订单查拼场单）
- `GET /api/sharing-orders`（拼场订单列表）
  - Query：`page`、`pageSize`、`all`
- `GET /api/sharing-orders/joinable`（可加入拼场列表）
  - Query：`page`、`pageSize`
- `GET /api/sharing-orders/joinable/venue/{venueId}`
- `GET /api/sharing-orders/joinable/date/{date}`
- `GET /api/sharing-orders/joinable/venue/{venueId}/date/{date}`
- `GET /api/sharing-orders/my-created`（我创建的拼场）
- `POST /api/sharing-orders/{id}/join`（直接加入）
- `POST /api/sharing-orders/{id}/apply-join`（申请加入）
- `POST /api/sharing-orders/{id}/cancel-join`（取消加入）
- `POST /api/sharing-orders/{id}/confirm`（确认拼场）
- `POST /api/sharing-orders/{id}/cancel`（取消拼场）
- `GET /api/sharing-orders/order-no/{orderNo}`（按订单号查拼场）
- `PUT /api/sharing-orders/{id}/settings`（拼场设置）
  - 入参：`Map<String, Object>`

## 2.8 订单模块 OrderController（`/api/order`）

- `POST /api/order`（创建订单）
  - 入参：`Order`
- `GET /api/order/{id}`（订单详情）
- `GET /api/order`（用户订单列表）
  - Query：`username`
- `GET /api/order/all`（全部订单）
- `PUT /api/order/{id}/cancel`（取消订单）
- `POST /api/order/{id}/expire`（标记订单过期）

## 2.9 支付模块 PaymentController（`/api/payments`）

- `POST /api/payments/orders/{id}/pay`（支付订单）
- `GET /api/payments/orders/{id}/status`（支付状态）
- `POST /api/payments/orders/{id}/callback`（支付回调）
  - 入参：`Map<String, Object>`

## 2.10 核销模块 VerificationController（`/api/verification`）

- `POST /api/verification/orders/{id}/verify`（核销订单）
- `POST /api/verification/orders/{id}/complete`（完成订单）
- `GET /api/verification/orders/{id}/status`（核销状态）
- `GET /api/verification/code/{code}`（按核销码查询订单）
- `POST /api/verification/code/verify`（按核销码核销）

## 2.11 公告模块 AnnouncementController（`/api/announcements`）

- `GET /api/announcements`（公告列表）
  - Query：`page`、`size`、`type`、`status`
- `GET /api/announcements/{id}`（公告详情）
- `POST /api/announcements`（创建公告）
- `PUT /api/announcements/{id}`（更新公告）
- `DELETE /api/announcements/{id}`（删除公告）
- `DELETE /api/announcements/batch`（批量删除）
  - 入参：`List<Long>`
- `PATCH /api/announcements/{id}/status`（更新公告状态）
  - 入参：`Map<String, String>`

## 2.12 管理员模块 AdminController（`/api/admin`）

- `GET /api/admin/dashboard/stats`（管理员工作台统计）
  - Query：`timeRange`、`startDate`、`endDate`

## 2.13 管理员订单模块 AdminBookingController（`/api/admin/bookings`）

- `GET /api/admin/bookings`（管理员订单列表）
  - Query：`page`、`pageSize`、`status`、`keyword`、`venueId`、`type`、`startDate`、`endDate`

## 2.14 健康检查接口

- HealthController（多路径映射同一方法）：
  - `GET /api/health`
  - `GET /health`
  - `GET /api/healths`
  - `GET /healths`
  - `GET /api/healths/**`
  - `GET /healths/**`
- HealthCheckController：
  - `GET /api/health`

## 2.15 测试接口（建议仅测试环境）

- `POST /api/test/order-status/{orderId}/transition`
- `GET /api/test/order-status/{orderId}/available-actions`
- `POST /api/test/order-status/{orderId}/simulate-sharing-success`
- `POST /api/test/order-status/{orderId}/simulate-timeout`
- `POST /api/test/order-status/trigger-scheduled-tasks`

---

## 3. 前端 API 调用清单（src/api 真实调用）

## 3.1 完全匹配后端的前端接口

- `src/api/auth.js`
  - `POST /auth/signin`
  - `POST /auth/signup`
  - `POST /auth/wechat/login`
  - `POST /auth/logout`
- `src/api/user.js`
  - `GET /users/me`
  - `PUT /users/me`
  - `PUT /users/me/password`
  - `POST /users/me/avatar`
  - `GET /users/me/bookings`
  - `GET /users/me/orders`
  - `GET /users/me/stats`
- `src/api/booking.js`
  - `POST /bookings`
  - `GET /bookings`
  - `GET /bookings/{id}`
  - `PUT /bookings/{id}/cancel`
  - `GET /bookings/venues/{venueId}/slots`
  - `POST /bookings/shared`
  - `POST /bookings/shared/{orderId}/apply`
- `src/api/venue.js`
  - `GET /venues`
  - `GET /venues/{id}`
  - `GET /timeslots/venue/{venueId}/date/{date}`
  - `GET /venues/types`
  - `GET /venues/popular`
  - `GET /venues/search`
  - `GET /venues/sharing`
- `src/api/order.js`
  - `POST /order`
  - `GET /order/{id}`
  - `GET /order`
  - `PUT /order/{id}/cancel`
  - `GET /order/all`
- `src/api/payment.js`
  - `POST /payments/orders/{id}/pay`
  - `GET /payments/orders/{id}/status`
  - `POST /payments/orders/{id}/callback`
  - `GET /bookings/{id}`（支付页取订单详情）
- `src/api/admin.js`
  - `POST /venues`
  - `PUT /venues/{id}`
  - `PATCH /venues/{id}/status`
  - `DELETE /venues/{id}`
- `src/api/verification.js`
  - `POST /verification/orders/{id}/verify`
  - `POST /verification/orders/{id}/complete`
  - `GET /verification/orders/{id}/status`
- `src/api/sharing.js`（主流程）
  - `POST /sharing-orders`
  - `GET /sharing-orders/{id}`
  - `GET /sharing-orders/by-order/{orderId}`
  - `GET /sharing-orders/order-no/{orderNo}`
  - `GET /sharing-orders/joinable`
  - `GET /sharing-orders`
  - `GET /sharing-orders/joinable/venue/{venueId}`
  - `GET /sharing-orders/joinable/date/{date}`
  - `GET /sharing-orders/joinable/venue/{venueId}/date/{date}`
  - `GET /sharing-orders/my-created`
  - `POST /sharing-orders/{id}/join`
  - `POST /sharing-orders/{id}/apply-join`
  - `POST /sharing-orders/{id}/cancel-join`
  - `POST /sharing-orders/{id}/confirm`
  - `POST /sharing-orders/{id}/cancel`
  - `PUT /sharing-orders/{id}/settings`
  - `PUT /shared/requests/{requestId}`
  - `GET /shared/my-requests`
  - `GET /shared/received-requests`
  - `DELETE /shared/requests/{requestId}/cancel`
  - `GET /bookings/shared/available`

## 3.2 前端存在但后端当前未实现或路径不一致

- `POST /auth/sms-login`（`src/api/auth.js`）
  - 后端未找到对应映射。
- `POST /auth/refresh`（`src/api/auth.js`）
  - 后端未找到对应映射。
- `POST /auth/wechat/login`（`src/api/auth.js`）
  - 后端未找到对应映射。
- `PUT /users/me/profile`（`src/api/user.js`）
  - 后端当前是 `PUT /users/me`。
- `GET /timeslots/check-availability`（`src/api/timeslot.js`）
  - 后端当前是 `GET /timeslots/check`。
- `POST /timeslots/generate`（`src/api/timeslot.js`）
  - 后端当前是 `POST /timeslots/venue/{venueId}/date/{date}/generate`。
- `POST /timeslots/venue/{venueId}/date/{date}/batch-create`（`src/api/timeslot.js`）
  - 后端未找到对应映射。
- `POST /sharing-orders/{sharingId}/participants/{participantId}/remove`（`src/api/sharing.js`）
  - 后端未找到对应映射。
- `GET /sharing-orders/my-joined`（`src/api/sharing.js`）
  - 后端未找到对应映射。
- `GET /payments/records`（`src/api/payment.js`）
  - 后端未找到对应映射。
- `POST /payments/orders/{id}/refund`（`src/api/payment.js`）
  - 后端未找到对应映射。
- `GET /admin/users`（`src/api/admin.js`）
  - 后端未找到对应映射。
- `GET /admin/users/{userId}`（`src/api/admin.js`）
  - 后端未找到对应映射。
- `PUT /admin/users/{userId}/roles`（`src/api/admin.js`）
  - 后端未找到对应映射。
- `DELETE /admin/users/{userId}`（`src/api/admin.js`）
  - 后端未找到对应映射。
- `PUT /admin/users/{userId}/activate`（`src/api/admin.js`）
  - 后端未找到对应映射。
- `PATCH /venues/{id}/manager`（`src/api/admin.js`）
  - 后端未找到对应映射。
- `GET /venues/manager/{managerId}`（`src/api/admin.js`）
  - 后端未找到对应映射。

---

## 4. 规范约定（建议）

- 前端统一使用 `src/api` 作为唯一接口出口，减少页面内直接请求。
- 未实现接口在前端应标注“待后端支持”，避免上线后 404。
- 后端新增接口后，优先同步更新本文档，再更新前端 API 封装。
- 若同一业务存在新旧接口并存，建议保留一套主路径，避免维护分叉。

---

## 5. 管理员端联调补充（CRUD + 复杂查询 + 错误码）

## 5.1 CRUD 总览（管理员端）

- 场馆：
  - `POST /api/venues`（C，场馆管理员）
  - `GET /api/venues` / `GET /api/venues/{id}`（R）
  - `PUT /api/venues/{id}`（U）
  - `PATCH /api/venues/{id}/status`（U）
  - `DELETE /api/venues/{id}`（D，场馆管理员）
- 订单：
  - `GET /api/admin/bookings`（R，复杂筛选）
  - `GET /api/bookings/{id}`（R，详情增强）
  - `POST /api/bookings/{id}/admin-cancel`（U，管理员取消）
- 核销：
  - `GET /api/verification/code/{code}`（R）
  - `POST /api/verification/code/verify`（U）
  - `POST /api/verification/orders/{id}/verify`（U）
  - `POST /api/verification/orders/{id}/complete`（U）
- 排期：
  - `PATCH /api/timeslots/{id}/status`（U，锁场/解锁）

## 5.2 复杂查询入参格式

- `GET /api/admin/bookings`
  - Query：`page`、`pageSize`、`status`、`keyword`、`venueId`、`type`、`startDate`、`endDate`
  - 示例：
    - `/api/admin/bookings?page=1&pageSize=20&status=PAID&type=SHARED`
    - `/api/admin/bookings?page=1&pageSize=10&keyword=REQ_88`
    - `/api/admin/bookings?page=1&pageSize=10&keyword=1380013&startDate=2026-03-01&endDate=2026-03-31`

- `GET /api/admin/dashboard/stats`
  - Query：`timeRange`（today/week/month/custom）、`startDate`、`endDate`
  - 示例：
    - `/api/admin/dashboard/stats?timeRange=today`
    - `/api/admin/dashboard/stats?timeRange=custom&startDate=2026-03-01&endDate=2026-03-12`

## 5.3 错误码示例（管理员端常见）

- `400`：参数错误、状态流转非法、核销码非法
- `401`：未登录/令牌失效
- `403`：无权限（非本人管理场馆）
- `404`：资源不存在
- `409`：锁场冲突（时段存在订单）
- `500`：服务内部错误

- 示例（409）：
```json
{
  "success": false,
  "message": "存在冲突订单，无法设为维护中，请先处理订单",
  "timeSlotId": 1234
}
```
