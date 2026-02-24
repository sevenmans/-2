# 体育馆预约系统API接口文档

## 概述

本文档详细描述了体育馆预约系统的后端API接口，供前端开发人员参考。所有接口均支持跨域访问，前端可以使用uni-request进行调用，适配微信小程序。

## 基础信息

- 基础URL: `http://your-api-domain/api`
- 所有请求和响应均使用JSON格式
- 认证方式: JWT Token (在请求头中添加 `Authorization: Bearer {token}`)

## 认证相关接口

### 用户登录

- **URL**: `/auth/signin`
- **方法**: POST
- **描述**: 用户登录并获取JWT令牌
- **请求参数**:

```json
{
  "username": "用户名",
  "password": "密码"
}
```

- **响应示例**:

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "type": "Bearer",
  "id": 1,
  "username": "user123",
  "email": "user@example.com",
  "roles": ["ROLE_USER"]
}
```

### 用户注册

- **URL**: `/auth/signup`
- **方法**: POST
- **描述**: 注册新用户
- **请求参数**:

```json
{
  "username": "用户名",
  "email": "邮箱",
  "password": "密码",
  "nickname": "昵称",
  "phone": "手机号",
  "code": "验证码"
}
```

- **响应示例**:

```json
{
  "message": "用户注册成功"
}
```

### 获取短信验证码

- **URL**: `/auth/sms-code`
- **方法**: POST
- **描述**: 获取手机验证码
- **请求参数**:

```json
{
  "phone": "手机号"
}
```

- **响应示例**:

```json
{
  "message": "验证码已发送"
}
```

### 退出登录

- **URL**: `/auth/logout`
- **方法**: POST
- **描述**: 用户退出登录
- **请求参数**: 无
- **响应示例**:

```json
{
  "message": "退出成功"
}
```

## 用户相关接口

### 获取当前用户信息

- **URL**: `/users/me`
- **方法**: GET
- **描述**: 获取当前登录用户的详细信息
- **请求参数**: 无
- **响应示例**:

```json
{
  "id": 1,
  "username": "user123",
  "nickname": "用户昵称",
  "phone": "13800138000",
  "email": "user@example.com",
  "roles": ["ROLE_USER"]
}
```

### 更新用户信息

- **URL**: `/users/me`
- **方法**: PUT
- **描述**: 更新当前用户的个人信息
- **请求参数**:

```json
{
  "nickname": "新昵称",
  "phone": "新手机号",
  "email": "新邮箱"
}
```

- **响应示例**:

```json
{
  "success": true,
  "message": "用户信息更新成功",
  "data": {
    "id": 1,
    "username": "user123",
    "nickname": "新昵称",
    "phone": "新手机号",
    "email": "新邮箱"
  }
}
```

### 修改密码

- **URL**: `/users/me/password`
- **方法**: PUT
- **描述**: 修改当前用户的密码
- **请求参数**:

```json
{
  "oldPassword": "旧密码",
  "newPassword": "新密码"
}
```

- **响应示例**:

```json
{
  "success": true,
  "message": "密码修改成功"
}
```

### 上传用户头像

- **URL**: `/users/me/avatar`
- **方法**: POST
- **描述**: 上传用户头像
- **请求参数**: 表单数据，包含文件字段 `file`
- **响应示例**:

```json
{
  "success": true,
  "message": "头像上传成功",
  "avatarUrl": "/uploads/avatars/user_1.jpg"
}
```

### 获取用户预约记录

- **URL**: `/users/me/bookings`
- **方法**: GET
- **描述**: 获取当前用户的预约记录
- **请求参数**:
  - `page`: 页码，默认1
  - `pageSize`: 每页数量，默认10
  - `status`: 订单状态筛选（可选）
- **响应示例**:

```json
{
  "data": [
    {
      "id": 1,
      "orderNo": "ORD16234567890123",
      "venueName": "篮球馆A",
      "bookingTime": "2023-07-01T14:00:00",
      "status": "CONFIRMED",
      "totalPrice": 100.0
    }
  ],
  "total": 5,
  "page": 1,
  "pageSize": 10,
  "totalPages": 1
}
```

### 获取用户订单记录

- **URL**: `/users/me/orders`
- **方法**: GET
- **描述**: 获取当前用户的订单记录
- **请求参数**:
  - `page`: 页码，默认1
  - `pageSize`: 每页数量，默认10
  - `status`: 订单状态筛选（可选）
- **响应示例**:

```json
{
  "data": [
    {
      "id": 1,
      "orderNo": "ORD16234567890123",
      "venueName": "篮球馆A",
      "bookingTime": "2023-07-01T14:00:00",
      "status": "PAID",
      "totalPrice": 100.0
    }
  ],
  "total": 5,
  "page": 1,
  "pageSize": 10,
  "totalPages": 1
}
```

## 场馆相关接口

### 获取场馆列表

- **URL**: `/venues`
- **方法**: GET
- **描述**: 获取场馆列表，支持分页和筛选
- **请求参数**:
  - `page`: 页码，默认1
  - `size`: 每页数量，默认10
  - `type`: 场馆类型筛选（可选）
  - `status`: 场馆状态筛选（可选）
- **响应示例**:

```json
{
  "content": [
    {
      "id": 1,
      "name": "篮球馆A",
      "type": "篮球",
      "location": "体育中心一楼",
      "description": "标准篮球场地",
      "facilities": "更衣室,淋浴间",
      "photos": ["url1", "url2"],
      "price": 100.0,
      "status": "OPEN",
      "openTime": "09:00:00",
      "closeTime": "22:00:00",
      "supportSharing": true
    }
  ],
  "totalElements": 20,
  "totalPages": 2,
  "size": 10,
  "number": 0
}
```

### 获取场馆详情

- **URL**: `/venues/{id}`
- **方法**: GET
- **描述**: 获取指定ID的场馆详情
- **请求参数**: 无
- **响应示例**:

```json
{
  "id": 1,
  "name": "篮球馆A",
  "type": "篮球",
  "location": "体育中心一楼",
  "description": "标准篮球场地",
  "facilities": "更衣室,淋浴间",
  "photos": ["url1", "url2"],
  "image": "main_image_url",
  "features": "木地板,空调",
  "price": 100.0,
  "status": "OPEN",
  "openTime": "09:00:00",
  "closeTime": "22:00:00",
  "supportSharing": true
}
```

### 获取场馆时间段

- **URL**: `/venues/{venueId}/slots`
- **方法**: GET
- **描述**: 获取指定场馆在特定日期的时间段
- **请求参数**:
  - `date`: 日期，格式为 `yyyy-MM-dd`
- **响应示例**:

```json
[
  {
    "id": 1,
    "venueId": 1,
    "date": "2023-07-01",
    "startTime": "09:00:00",
    "endTime": "10:00:00",
    "status": "AVAILABLE",
    "price": 100.0
  },
  {
    "id": 2,
    "venueId": 1,
    "date": "2023-07-01",
    "startTime": "10:00:00",
    "endTime": "11:00:00",
    "status": "RESERVED",
    "price": 100.0,
    "orderId": 123
  }
]
```

### 获取场馆类型列表

- **URL**: `/venues/types`
- **方法**: GET
- **描述**: 获取所有场馆类型列表
- **请求参数**: 无
- **响应示例**:

```json
[
  "篮球",
  "足球",
  "羽毛球",
  "乒乓球",
  "网球"
]
```

### 搜索场馆

- **URL**: `/venues/search`
- **方法**: GET
- **描述**: 根据关键词和类型搜索场馆
- **请求参数**:
  - `keyword`: 搜索关键词
  - `type`: 场馆类型（可选）
  - `page`: 页码，默认1
  - `size`: 每页数量，默认10
- **响应示例**:

```json
{
  "content": [
    {
      "id": 1,
      "name": "篮球馆A",
      "type": "篮球",
      "location": "体育中心一楼",
      "price": 100.0,
      "status": "OPEN"
    }
  ],
  "totalElements": 5,
  "totalPages": 1,
  "size": 10,
  "number": 0
}
```

### 获取热门场馆

- **URL**: `/venues/popular`
- **方法**: GET
- **描述**: 获取热门场馆列表
- **请求参数**:
  - `limit`: 返回数量，默认5
- **响应示例**:

```json
[
  {
    "id": 1,
    "name": "篮球馆A",
    "type": "篮球",
    "location": "体育中心一楼",
    "image": "image_url",
    "price": 100.0
  }
]
```

### 获取支持拼场的场馆

- **URL**: `/venues/sharing`
- **方法**: GET
- **描述**: 获取支持拼场的场馆列表
- **请求参数**:
  - `page`: 页码，默认1
  - `size`: 每页数量，默认10
- **响应示例**:

```json
{
  "content": [
    {
      "id": 1,
      "name": "篮球馆A",
      "type": "篮球",
      "location": "体育中心一楼",
      "price": 100.0,
      "status": "OPEN",
      "supportSharing": true
    }
  ],
  "totalElements": 10,
  "totalPages": 1,
  "size": 10,
  "number": 0
}
```

### 创建场馆（仅限超级管理员）

- **URL**: `/venues`
- **方法**: POST
- **描述**: 创建新场馆
- **权限**: 需要 `ROLE_SUPER_ADMIN` 角色
- **请求参数**:

```json
{
  "name": "场馆名称",
  "type": "场馆类型",
  "location": "场馆位置",
  "description": "场馆描述",
  "facilities": "设施描述",
  "price": 100.0,
  "openTime": "09:00:00",
  "closeTime": "22:00:00",
  "supportSharing": true
}
```

- **响应示例**:

```json
{
  "id": 10,
  "name": "场馆名称",
  "type": "场馆类型",
  "location": "场馆位置",
  "description": "场馆描述",
  "facilities": "设施描述",
  "price": 100.0,
  "status": "OPEN",
  "openTime": "09:00:00",
  "closeTime": "22:00:00",
  "supportSharing": true
}
```

### 更新场馆信息（仅限管理员）

- **URL**: `/venues/{id}`
- **方法**: PUT
- **描述**: 更新场馆信息
- **权限**: 需要 `ROLE_SUPER_ADMIN` 或 `ROLE_VENUE_ADMIN` 角色
- **请求参数**:

```json
{
  "name": "新场馆名称",
  "type": "新场馆类型",
  "location": "新场馆位置",
  "description": "新场馆描述",
  "facilities": "新设施描述",
  "price": 120.0,
  "openTime": "08:00:00",
  "closeTime": "23:00:00",
  "supportSharing": true
}
```

- **响应示例**:

```json
{
  "id": 1,
  "name": "新场馆名称",
  "type": "新场馆类型",
  "location": "新场馆位置",
  "description": "新场馆描述",
  "facilities": "新设施描述",
  "price": 120.0,
  "status": "OPEN",
  "openTime": "08:00:00",
  "closeTime": "23:00:00",
  "supportSharing": true
}
```

### 更新场馆状态（仅限管理员）

- **URL**: `/venues/{id}/status`
- **方法**: PATCH
- **描述**: 更新场馆状态
- **权限**: 需要 `ROLE_SUPER_ADMIN` 或 `ROLE_VENUE_ADMIN` 角色
- **请求参数**:

```json
{
  "status": "MAINTENANCE"
}
```

- **响应示例**:

```json
{
  "id": 1,
  "name": "篮球馆A",
  "status": "MAINTENANCE"
}
```

### 删除场馆（仅限超级管理员）

- **URL**: `/venues/{id}`
- **方法**: DELETE
- **描述**: 删除场馆
- **权限**: 需要 `ROLE_SUPER_ADMIN` 角色
- **请求参数**: 无
- **响应示例**:

```json
{
  "message": "场馆删除成功"
}
```

### 分配管理员到场馆（仅限超级管理员）

- **URL**: `/venues/{id}/manager`
- **方法**: PATCH
- **描述**: 分配管理员到场馆
- **权限**: 需要 `ROLE_SUPER_ADMIN` 角色
- **请求参数**:

```json
{
  "managerId": 5
}
```

- **响应示例**:

```json
{
  "id": 1,
  "name": "篮球馆A",
  "managerId": 5
}
```

### 获取管理员管理的场馆（仅限管理员）

- **URL**: `/venues/manager/{managerId}`
- **方法**: GET
- **描述**: 获取指定管理员管理的场馆列表
- **权限**: 需要 `ROLE_SUPER_ADMIN` 或 `ROLE_VENUE_ADMIN` 角色
- **请求参数**: 无
- **响应示例**:

```json
[
  {
    "id": 1,
    "name": "篮球馆A",
    "type": "篮球",
    "location": "体育中心一楼",
    "status": "OPEN",
    "price": 100.0
  }
]
```

## 时间段相关接口

### 获取场馆指定日期的所有时间段

- **URL**: `/timeslots/venue/{venueId}/date/{date}`
- **方法**: GET
- **描述**: 获取场馆指定日期的所有时间段
- **请求参数**: 无
- **响应示例**:

```json
[
  {
    "id": 1,
    "venueId": 1,
    "date": "2023-07-01",
    "startTime": "09:00:00",
    "endTime": "10:00:00",
    "status": "AVAILABLE",
    "price": 100.0
  }
]
```

### 获取场馆指定日期的可用时间段

- **URL**: `/timeslots/venue/{venueId}/date/{date}/available`
- **方法**: GET
- **描述**: 获取场馆指定日期的可用时间段
- **请求参数**: 无
- **响应示例**:

```json
[
  {
    "id": 1,
    "venueId": 1,
    "date": "2023-07-01",
    "startTime": "09:00:00",
    "endTime": "10:00:00",
    "status": "AVAILABLE",
    "price": 100.0
  }
]
```

### 为场馆生成指定日期的时间段（仅限管理员）

- **URL**: `/timeslots/venue/{venueId}/date/{date}/generate`
- **方法**: POST
- **描述**: 为场馆生成指定日期的时间段
- **权限**: 需要 `ROLE_SUPER_ADMIN` 或 `ROLE_VENUE_ADMIN` 角色
- **请求参数**: 无
- **响应示例**:

```json
[
  {
    "id": 1,
    "venueId": 1,
    "date": "2023-07-01",
    "startTime": "09:00:00",
    "endTime": "10:00:00",
    "status": "AVAILABLE",
    "price": 100.0
  }
]
```

### 批量生成未来一周的时间段（仅限管理员）

- **URL**: `/timeslots/venue/{venueId}/generate-week`
- **方法**: POST
- **描述**: 批量生成未来一周的时间段
- **权限**: 需要 `ROLE_SUPER_ADMIN` 或 `ROLE_VENUE_ADMIN` 角色
- **请求参数**: 无
- **响应示例**:

```json
{
  "message": "成功生成未来一周的时间段"
}
```

### 更新时间段状态（仅限管理员）

- **URL**: `/timeslots/{id}/status`
- **方法**: PATCH
- **描述**: 更新时间段状态
- **权限**: 需要 `ROLE_SUPER_ADMIN` 或 `ROLE_VENUE_ADMIN` 角色
- **请求参数**:

```json
{
  "status": "MAINTENANCE"
}
```

- **响应示例**:

```json
{
  "id": 1,
  "venueId": 1,
  "date": "2023-07-01",
  "startTime": "09:00:00",
  "endTime": "10:00:00",
  "status": "MAINTENANCE",
  "price": 100.0
}
```

### 检查时间段是否可预约

- **URL**: `/timeslots/check`
- **方法**: GET
- **描述**: 检查时间段是否可预约
- **请求参数**:
  - `venueId`: 场馆ID
  - `date`: 日期，格式为 `yyyy-MM-dd`
  - `startTime`: 开始时间，格式为 `HH:mm:ss`
  - `endTime`: 结束时间，格式为 `HH:mm:ss`
- **响应示例**:

```json
{
  "available": true
}
```

## 预约相关接口

### 创建预约

- **URL**: `/bookings`
- **方法**: POST
- **描述**: 创建预约
- **请求参数**:

```json
{
  "venueId": 1,
  "date": "2023-07-01",
  "startTime": "09:00:00",
  "endTime": "10:00:00"
}
```

- **响应示例**:

```json
{
  "id": 1,
  "orderNo": "ORD16234567890123",
  "username": "user123",
  "venueId": 1,
  "venueName": "篮球馆A",
  "bookingTime": "2023-07-01T09:00:00",
  "totalPrice": 100.0,
  "status": "PENDING",
  "bookingType": "EXCLUSIVE"
}
```

### 获取预约列表

- **URL**: `/bookings`
- **方法**: GET
- **描述**: 获取预约列表
- **请求参数**:
  - `page`: 页码，默认1
  - `size`: 每页数量，默认10
  - `status`: 预约状态筛选（可选）
  - `date`: 日期筛选，格式为 `yyyy-MM-dd`（可选）
  - `userId`: 用户ID筛选（可选，仅管理员可用）
- **响应示例**:

```json
{
  "content": [
    {
      "id": 1,
      "orderNo": "ORD16234567890123",
      "username": "user123",
      "venueId": 1,
      "venueName": "篮球馆A",
      "bookingTime": "2023-07-01T09:00:00",
      "totalPrice": 100.0,
      "status": "PENDING",
      "bookingType": "EXCLUSIVE"
    }
  ],
  "totalElements": 5,
  "totalPages": 1,
  "size": 10,
  "number": 0
}
```

### 获取预约详情

- **URL**: `/bookings/{id}`
- **方法**: GET
- **描述**: 获取指定ID的预约详情
- **请求参数**: 无
- **响应示例**:

```json
{
  "id": 1,
  "orderNo": "ORD16234567890123",
  "username": "user123",
  "venueId": 1,
  "venueName": "篮球馆A",
  "bookingTime": "2023-07-01T09:00:00",
  "totalPrice": 100.0,
  "status": "PENDING",
  "bookingType": "EXCLUSIVE",
  "createdAt": "2023-06-30T15:30:00"
}
```

### 取消预约

- **URL**: `/bookings/{id}/cancel`
- **方法**: PUT
- **描述**: 取消指定ID的预约
- **请求参数**: 无
- **响应示例**:

```json
{
  "id": 1,
  "orderNo": "ORD16234567890123",
  "status": "CANCELLED",
  "message": "预约已取消"
}
```

### 获取场馆可用时间段

- **URL**: `/bookings/venues/{venueId}/slots`
- **方法**: GET
- **描述**: 获取指定场馆在特定日期的可用时间段
- **请求参数**:
  - `date`: 日期，格式为 `yyyy-MM-dd`
- **响应示例**:

```json
[
  {
    "id": 1,
    "startTime": "09:00:00",
    "endTime": "10:00:00",
    "available": true,
    "price": 100.0
  }
]
```

### 创建拼场预约

- **URL**: `/bookings/shared`
- **方法**: POST
- **描述**: 创建拼场预约
- **请求参数**:

```json
{
  "venueId": 1,
  "date": "2023-07-01",
  "startTime": "09:00:00",
  "endTime": "10:00:00",
  "teamName": "队伍名称",
  "contactInfo": "联系方式",
  "maxParticipants": 10,
  "description": "拼场描述"
}
```

- **响应示例**:

```json
{
  "id": 1,
  "orderNo": "ORD16234567890123",
  "username": "user123",
  "venueId": 1,
  "venueName": "篮球馆A",
  "bookingTime": "2023-07-01T09:00:00",
  "totalPrice": 100.0,
  "status": "SHARING",
  "bookingType": "SHARED",
  "teamName": "队伍名称",
  "contactInfo": "联系方式",
  "maxParticipants": 10,
  "currentParticipants": 1,
  "description": "拼场描述"
}
```

### 获取可拼场的订单列表

- **URL**: `/shared/available`
- **方法**: GET
- **描述**: 获取可拼场的订单列表
- **请求参数**:
  - `date`: 日期筛选，格式为 `yyyy-MM-dd`（可选）
  - `venueType`: 场馆类型筛选（可选）
  - `page`: 页码，默认1
  - `size`: 每页数量，默认10
- **响应示例**:

```json
{
  "content": [
    {
      "id": 1,
      "orderNo": "ORD16234567890123",
      "venueName": "篮球馆A",
      "venueType": "篮球",
      "bookingTime": "2023-07-01T09:00:00",
      "teamName": "队伍名称",
      "contactInfo": "联系方式",
      "maxParticipants": 10,
      "currentParticipants": 1,
      "remainingSlots": 9,
      "description": "拼场描述"
    }
  ],
  "totalElements": 5,
  "totalPages": 1,
  "size": 10,
  "number": 0
}
```

### 申请拼场

- **URL**: `/bookings/shared/{orderId}/apply`
- **方法**: POST
- **描述**: 申请拼场
- **请求参数**:

```json
{
  "teamName": "申请队伍名称",
  "contactInfo": "申请联系方式",
  "participantsCount": 2,
  "message": "申请留言"
}
```

- **响应示例**:

```json
{
  "id": 1,
  "orderId": 1,
  "applicantUsername": "user123",
  "applicantTeamName": "申请队伍名称",
  "applicantContact": "申请联系方式",
  "participantsCount": 2,
  "message": "申请留言",
  "status": "PENDING",
  "createdAt": "2023-06-30T15:30:00"
}
```

### 处理拼场申请

- **URL**: `/shared/requests/{requestId}`
- **方法**: PUT
- **描述**: 处理拼场申请（同意/拒绝）
- **请求参数**:

```json
{
  "status": "APPROVED",
  "responseMessage": "同意拼场申请"
}
```

- **响应示例**:

```json
{
  "id": 1,
  "orderId": 1,
  "status": "APPROVED",
  "responseMessage": "同意拼场申请",
  "updatedAt": "2023-06-30T16:00:00"
}
```

### 获取我发出的拼场申请

- **URL**: `/shared/my-requests`
- **方法**: GET
- **描述**: 获取当前用户发出的拼场申请列表
- **请求参数**:
  - `page`: 页码，默认1
  - `size`: 每页数量，默认10
  - `status`: 申请状态筛选（可选）
- **响应示例**:

```json
{
  "content": [
    {
      "id": 1,
      "orderId": 1,
      "venueName": "篮球馆A",
      "bookingTime": "2023-07-01T09:00:00",
      "teamName": "队伍名称",
      "applicantTeamName": "申请队伍名称",
      "participantsCount": 2,
      "status": "PENDING",
      "createdAt": "2023-06-30T15:30:00"
    }
  ],
  "totalElements": 3,
  "totalPages": 1,
  "size": 10,
  "number": 0
}
```

### 获取我收到的拼场申请

- **URL**: `/shared/received-requests`
- **方法**: GET
- **描述**: 获取当前用户收到的拼场申请列表
- **请求参数**:
  - `page`: 页码，默认1
  - `size`: 每页数量，默认10
  - `status`: 申请状态筛选（可选）
- **响应示例**:

```json
{
  "content": [
    {
      "id": 1,
      "orderId": 1,
      "venueName": "篮球馆A",
      "bookingTime": "2023-07-01T09:00:00",
      "applicantUsername": "user456",
      "applicantTeamName": "申请队伍名称",
      "applicantContact": "申请联系方式",
      "participantsCount": 2,
      "message": "申请留言",
      "status": "PENDING",
      "createdAt": "2023-06-30T15:30:00"
    }
  ],
  "totalElements": 2,
  "totalPages": 1,
  "size": 10,
  "number": 0
}
```

## 订单相关接口

### 提交订单

- **URL**: `/order`
- **方法**: POST
- **描述**: 提交订单
- **请求参数**:

```json
{
  "venueId": 1,
  "bookingTime": "2023-07-01T09:00:00",
  "totalPrice": 100.0
}
```

- **响应示例**:

```json
{
  "id": 1,
  "orderNo": "ORD16234567890123",
  "username": "user123",
  "venueId": 1,
  "venueName": "篮球馆A",
  "bookingTime": "2023-07-01T09:00:00",
  "totalPrice": 100.0,
  "status": "PENDING",
  "createdAt": "2023-06-30T15:30:00"
}
```

### 获取订单详情

- **URL**: `/order/{id}`
- **方法**: GET
- **描述**: 获取指定ID的订单详情
- **请求参数**: 无
- **响应示例**:

```json
{
  "id": 1,
  "orderNo": "ORD16234567890123",
  "username": "user123",
  "venueId": 1,
  "venueName": "篮球馆A",
  "bookingTime": "2023-07-01T09:00:00",
  "totalPrice": 100.0,
  "status": "PENDING",
  "createdAt": "2023-06-30T15:30:00",
  "updatedAt": "2023-06-30T15:30:00"
}
```

### 获取用户订单列表

- **URL**: `/order`
- **方法**: GET
- **描述**: 根据用户名获取订单列表
- **请求参数**:
  - `username`: 用户名（可选，默认为当前登录用户）
  - `page`: 页码，默认1
  - `size`: 每页数量，默认10
- **响应示例**:

```json
{
  "content": [
    {
      "id": 1,
      "orderNo": "ORD16234567890123",
      "username": "user123",
      "venueId": 1,
      "venueName": "篮球馆A",
      "bookingTime": "2023-07-01T09:00:00",
      "totalPrice": 100.0,
      "status": "PENDING"
    }
  ],
  "totalElements": 5,
  "totalPages": 1,
  "size": 10,
  "number": 0
}
```

### 获取所有订单列表（仅限管理员）

- **URL**: `/order/all`
- **方法**: GET
- **描述**: 获取所有订单列表
- **权限**: 需要 `ROLE_SUPER_ADMIN` 或 `ROLE_VENUE_ADMIN` 角色
- **请求参数**:
  - `page`: 页码，默认1
  - `size`: 每页数量，默认10
  - `status`: 订单状态筛选（可选）
- **响应示例**:

```json
{
  "content": [
    {
      "id": 1,
      "orderNo": "ORD16234567890123",
      "username": "user123",
      "venueId": 1,
      "venueName": "篮球馆A",
      "bookingTime": "2023-07-01T09:00:00",
      "totalPrice": 100.0,
      "status": "PENDING"
    }
  ],
  "totalElements": 20,
  "totalPages": 2,
  "size": 10,
  "number": 0
}
```

### 取消订单

- **URL**: `/order/{id}/cancel`
- **方法**: PUT
- **描述**: 取消指定ID的订单
- **请求参数**: 无
- **响应示例**:

```json
{
  "id": 1,
  "orderNo": "ORD16234567890123",
  "status": "CANCELLED",
  "message": "订单已取消"
}
```

## 支付相关接口

### 支付订单（模拟）

- **URL**: `/payments/orders/{id}/pay`
- **方法**: POST
- **描述**: 支付订单（模拟）
- **请求参数**: 无
- **响应示例**:

```json
{
  "success": true,
  "message": "支付成功",
  "order": {
    "id": 1,
    "orderNo": "ORD16234567890123",
    "status": "PAID"
  },
  "paymentTime": "2023-06-30T15:35:00",
  "paymentAmount": 100.0
}
```

### 获取订单支付状态

- **URL**: `/payments/orders/{id}/status`
- **方法**: GET
- **描述**: 获取订单支付状态
- **请求参数**: 无
- **响应示例**:

```json
{
  "orderId": 1,
  "orderNo": "ORD16234567890123",
  "status": "PAID",
  "statusDescription": "已支付",
  "amount": 100.0,
  "isPaid": true
}
```

## 核销相关接口

### 核销订单（仅限管理员）

- **URL**: `/verification/orders/{id}/verify`
- **方法**: POST
- **描述**: 核销订单
- **权限**: 需要 `ROLE_SUPER_ADMIN` 或 `ROLE_VENUE_ADMIN` 角色
- **请求参数**: 无
- **响应示例**:

```json
{
  "success": true,
  "message": "订单核销成功",
  "order": {
    "id": 1,
    "orderNo": "ORD16234567890123",
    "status": "VERIFIED"
  },
  "verificationTime": "2023-07-01T09:05:00"
}
```

### 完成订单（仅限管理员）

- **URL**: `/verification/orders/{id}/complete`
- **方法**: POST
- **描述**: 完成订单
- **权限**: 需要 `ROLE_SUPER_ADMIN` 或 `ROLE_VENUE_ADMIN` 角色
- **请求参数**: 无
- **响应示例**:

```json
{
  "success": true,
  "message": "订单已完成",
  "order": {
    "id": 1,
    "orderNo": "ORD16234567890123",
    "status": "COMPLETED"
  },
  "completionTime": "2023-07-01T10:05:00"
}
```

### 获取订单核销状态

- **URL**: `/verification/orders/{id}/status`
- **方法**: GET
- **描述**: 获取订单核销状态
- **请求参数**: 无
- **响应示例**:

```json
{
  "orderId": 1,
  "orderNo": "ORD16234567890123",
  "status": "VERIFIED",
  "statusDescription": "已核销",
  "isVerified": true,
  "isCompleted": false
}
```

## 管理员相关接口

### 获取所有用户（仅限超级管理员）

- **URL**: `/admin/users`
- **方法**: GET
- **描述**: 获取所有用户列表
- **权限**: 需要 `ROLE_SUPER_ADMIN` 角色
- **请求参数**:
  - `page`: 页码，默认1
  - `size`: 每页数量，默认10
  - `sortBy`: 排序字段，默认id
  - `sortDir`: 排序方向，asc或desc，默认asc
- **响应示例**:

```json
{
  "users": [
    {
      "id": 1,
      "username": "user123",
      "nickname": "用户昵称",
      "email": "user@example.com",
      "phone": "13800138000",
      "roles": ["ROLE_USER"],
      "active": true,
      "createdAt": "2023-06-01T10:00:00",
      "updatedAt": "2023-06-01T10:00:00"
    }
  ],
  "currentPage": 1,
  "totalItems": 50,
  "totalPages": 5
}
```

### 获取用户详情（仅限超级管理员）

- **URL**: `/admin/users/{userId}`
- **方法**: GET
- **描述**: 获取用户详情
- **权限**: 需要 `ROLE_SUPER_ADMIN` 角色
- **请求参数**: 无
- **响应示例**:

```json
{
  "id": 1,
  "username": "user123",
  "nickname": "用户昵称",
  "email": "user@example.com",
  "phone": "13800138000",
  "roles": ["ROLE_USER"],
  "active": true,
  "createdAt": "2023-06-01T10:00:00",
  "updatedAt": "2023-06-01T10:00:00"
}
```

### 更新用户角色（仅限超级管理员）

- **URL**: `/admin/users/{userId}/roles`
- **方法**: PUT
- **描述**: 更新用户角色
- **权限**: 需要 `ROLE_SUPER_ADMIN` 角色
- **请求参数**:

```json
{
  "roles": ["ROLE_USER", "ROLE_VENUE_ADMIN"],
  "active": true
}
```

- **响应示例**:

```json
{
  "success": true,
  "message": "用户角色更新成功",
  "user": {
    "id": 1,
    "username": "user123",
    "roles": ["ROLE_USER", "ROLE_VENUE_ADMIN"],
    "active": true
  }
}
```

### 停用用户（仅限超级管理员）

- **URL**: `/admin/users/{userId}`
- **方法**: DELETE
- **描述**: 停用用户（软删除）
- **权限**: 需要 `ROLE_SUPER_ADMIN` 角色
- **请求参数**: 无
- **响应示例**:

```json
{
  "success": true,
  "message": "用户已停用"
}
```

### 激活用户（仅限超级管理员）

- **URL**: `/admin/users/{userId}/activate`
- **方法**: PUT
- **描述**: 激活用户
- **权限**: 需要 `ROLE_SUPER_ADMIN` 角色
- **请求参数**: 无
- **响应示例**:

```json
{
  "success": true,
  "message": "用户已激活"
}
```

## 微信小程序开发注意事项

### 使用uni-request发起请求

在微信小程序中，可以使用uni-app提供的uni.request方法发起HTTP请求：

```javascript
// 登录请求示例
uni.request({
  url: 'http://your-api-domain/api/auth/signin',
  method: 'POST',
  data: {
    username: 'user123',
    password: 'password123'
  },
  success: (res) => {
    console.log('登录成功', res.data);
    // 存储token
    uni.setStorageSync('token', res.data.token);
  },
  fail: (err) => {
    console.error('登录失败', err);
  }
});

// 带认证的请求示例
const token = uni.getStorageSync('token');
uni.request({
  url: 'http://your-api-domain/api/users/me',
  method: 'GET',
  header: {
    'Authorization': 'Bearer ' + token
  },
  success: (res) => {
    console.log('获取用户信息成功', res.data);
  },
  fail: (err) => {
    console.error('获取用户信息失败', err);
  }
});
```

### 处理认证过期

当JWT令牌过期时，服务器会返回401状态码。可以在请求拦截器中统一处理：

```javascript
// 请求拦截器
const httpInterceptor = {
  invoke(options) {
    // 添加token
    const token = uni.getStorageSync('token');
    if (token) {
      options.header = {
        ...options.header,
        'Authorization': 'Bearer ' + token
      };
    }
    
    // 克隆原始请求
    const originalRequest = {...options};
    
    // 响应拦截
    options.complete = (response) => {
      // 处理401错误
      if (response.statusCode === 401) {
        // 清除token
        uni.removeStorageSync('token');
        // 跳转到登录页
        uni.navigateTo({
          url: '/pages/login/login'
        });
      }
    };
  }
};

// 注册拦截器
uni.addInterceptor('request', httpInterceptor);
```

### 文件上传

对于文件上传（如用户头像），可以使用uni.uploadFile方法：

```javascript
uni.chooseImage({
  count: 1,
  success: (chooseImageRes) => {
    const tempFilePaths = chooseImageRes.tempFilePaths;
    const token = uni.getStorageSync('token');
    
    uni.uploadFile({
      url: 'http://your-api-domain/api/users/me/avatar',
      filePath: tempFilePaths[0],
      name: 'file',
      header: {
        'Authorization': 'Bearer ' + token
      },
      success: (uploadFileRes) => {
        const result = JSON.parse(uploadFileRes.data);
        console.log('头像上传成功', result);
      },
      fail: (err) => {
        console.error('头像上传失败', err);
      }
    });
  }
});
```

## 错误处理

所有API接口在发生错误时，会返回相应的HTTP状态码和错误信息：

- 400 Bad Request: 请求参数错误
- 401 Unauthorized: 未认证或认证已过期
- 403 Forbidden: 权限不足
- 404 Not Found: 资源不存在
- 500 Internal Server Error: 服务器内部错误

错误响应格式示例：

```json
{
  "message": "错误信息描述"
}
```

或

```json
{
  "success": false,
  "message": "错误信息描述"
}
```