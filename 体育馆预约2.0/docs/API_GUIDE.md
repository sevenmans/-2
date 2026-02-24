# 前端 API 维护与 Agent 编程指南

本文档旨在规范前端 API 模块的维护方式，确保前后端接口的一致性，并帮助 AI Agent 快速、准确地理解和生成代码。

## 1. 核心原则

1.  **一一对应**：前端 API 函数名应与后端 Controller 方法或资源操作保持语义一致。
2.  **模块化**：每个业务领域（如 User, Booking, Venue, Sharing）应有独立的 API 文件。
3.  **自解释**：通过详细的 JSDoc 注释，明确 API 的 URL、Method、参数和返回值。
4.  **显式导出**：所有 API 函数必须显式导出，禁止使用 `export default` 导出匿名对象（除非用于兼容性汇总）。

## 2. API 文件结构

推荐的文件结构如下：

```
src/
  api/
    user.js        // 用户相关接口 (UserController)
    venue.js       // 场馆相关接口 (VenueController)
    booking.js     // 预约相关接口 (BookingController)
    sharing.js     // 拼场相关接口 (SharingController + SharingOrderController)
    ...
```

## 3. 编码规范 (Agent Friendly)

为了让 AI Agent 能够准确识别 API，请遵循以下注释规范：

### 3.1 必须包含 JSDoc 注释

每个导出的 API 函数上方**必须**包含 JSDoc 注释，说明：
*   **功能描述**：一句话描述该接口做什么。
*   **@url**：后端接口的完整路径（相对于 Base URL）。
*   **@method**：HTTP 方法（GET, POST, PUT, DELETE）。(如果函数名不明显包含动词)
*   **@param**：参数说明，特别是对象参数内部的结构。
*   **@returns**：返回值说明。

### 3.2 示例代码 (src/api/sharing.js)

```javascript
import { get, post, put } from '../utils/request'

/**
 * 获取拼场订单详情
 * @url GET /api/sharing-orders/{id}
 * @param {Number|String} id - 拼场订单ID
 * @returns {Promise} 返回包含订单详情的对象
 */
export function getSharingOrderById(id) {
  return get(`/sharing-orders/${id}`)
}

/**
 * 创建拼场订单
 * @url POST /api/sharing-orders
 * @param {Object} data - 拼场订单数据
 * @param {Number} data.venueId - 场馆ID
 * @param {String} data.bookingDate - 预约日期 (YYYY-MM-DD)
 * @returns {Promise}
 */
export function createSharingOrder(data) {
  return post('/sharing-orders', data)
}
```

## 4. 如何使用 Agent 进行编程

当您要求 Agent 编写涉及后端交互的代码时，请遵循以下步骤：

1.  **提示 Agent 阅读 API 定义**：
    > "请先阅读 `src/api/sharing.js`，确认可用的 API 方法。"

2.  **如果 API 不存在**：
    > "我需要调用后端 `POST /api/some-resource` 接口，请先在 `src/api/some-module.js` 中添加对应的 API 函数，并遵循 API_GUIDE.md 中的注释规范。"

3.  **如果报错 "(void 0) is not a function"**：
    这通常意味着调用的 API 函数未导出或拼写错误。请指示 Agent：
    > "请检查 `src/stores/xxx.js` 中引用的 API 函数名是否与 `src/api/xxx.js` 中的导出函数名完全一致。"

## 5. 常见问题排查

*   **报错 `TypeError: (void 0) is not a function`**
    *   **原因**：import 的函数名在源文件中不存在（Tree-shaking 导致的 undefined）。
    *   **解决**：核对 `import { funcName } from '@/api/module'` 中的 `funcName` 是否在 API 文件中被 `export function funcName(...)` 定义。

*   **参数传递错误**
    *   **原因**：Agent 猜测了参数结构。
    *   **解决**：在 API 文件的 JSDoc 中明确 `@param` 结构，Agent 会优先参考注释。

---
**维护者提示**：定期使用 AI 扫描 `src/api` 目录，检查是否有缺少注释或命名不规范的函数。
