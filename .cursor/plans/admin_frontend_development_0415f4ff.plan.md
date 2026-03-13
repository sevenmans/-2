---
name: Admin Frontend Development
overview: Based on the five reference documents, implement the complete sports venue admin frontend within the existing uni-app (Vue3 + Pinia) WeChat mini-program project. The admin pages, API wrappers, stores, components, and routing are all scaffolded (empty directories exist) but have zero implementation. Development follows five sequential phases (A through E) and references admin_prototype.html for layout/interaction patterns while using PRD + dev docs as the single source of truth for fields, states, and APIs.
todos:
  - id: phase-a1
    content: "Phase A1: Register 8 admin page routes in pages.json"
    status: completed
  - id: phase-a2
    content: "Phase A2: Extend router-guard.js with admin role check for /pages/admin/* paths"
    status: completed
  - id: phase-a3
    content: "Phase A3: Add admin role branching in login.vue (ROLE_VENUE_ADMIN -> reLaunch to admin dashboard)"
    status: completed
  - id: phase-a4
    content: "Phase A4: Create api/admin-dashboard.js; extend api/admin.js and api/verification.js with missing wrappers"
    status: completed
  - id: phase-a5
    content: "Phase A5: Create 5 Pinia stores (admin-dashboard, admin-orders, admin-venues, admin-verification, admin-security)"
    status: completed
  - id: phase-a6
    content: "Phase A6: Create utils/admin-adapter.js with adaptAdminStats, adaptAdminOrder, adaptParticipant"
    status: completed
  - id: phase-a7
    content: "Phase A7: Create AdminTabBar.vue component (5-tab custom bottom nav with center highlight)"
    status: completed
  - id: phase-b1
    content: "Phase B1: Build dashboard.vue (time range switcher, stat cards, quick links)"
    status: completed
  - id: phase-b2
    content: "Phase B2: Build orders/list.vue (search, filter chips, order cards, cancel action)"
    status: completed
  - id: phase-b3
    content: "Phase B3: Build orders/detail.vue (order info, sharing participants, bottom action bar)"
    status: completed
  - id: phase-b4
    content: "Phase B4: Build admin components (AdminStatCard.vue, OrderFilterBar.vue)"
    status: completed
  - id: phase-c1
    content: "Phase C1: Build venues/list.vue (managed venues, status toggle, action buttons)"
    status: completed
  - id: phase-c2
    content: "Phase C2: Build venues/create.vue (full venue creation form)"
    status: completed
  - id: phase-c3
    content: "Phase C3: Build venues/edit.vue (pre-filled form, delete action)"
    status: completed
  - id: phase-c4
    content: "Phase C4: Build timeslots/index.vue (venue+date selector, 4-col grid, lock/unlock, 409 handling)"
    status: completed
  - id: phase-d1
    content: "Phase D1: Build security/password.vue (change password form, logout button)"
    status: completed
  - id: phase-e
    content: "Phase E: Full-chain smoke test, error handling verification, style consistency check"
    status: completed
isProject: false
---

# Ball Court Admin Frontend Development Plan

## Current State

- **Existing infrastructure:** uni-app Vue3 project with Pinia, request layer (`src/utils/request.js`), auth utilities (`src/utils/auth.js`), router guard (`src/utils/router-guard.js`), user store (`src/stores/user.js`).
- **Admin scaffolding:** Empty directories exist at `src/pages/admin/{orders,security,timeslots,venues,verification}/` and `src/components/admin/`. No `.vue` files, no admin routes in `pages.json`.
- **API layer:** `src/api/admin.js` has venue CRUD + user management wrappers. `src/api/verification.js` has order-level verify/complete/status. **Missing:** dashboard stats, admin bookings, code-based verification, managed venues query.
- **Backend:** All admin APIs are fully implemented and ready for integration.

## Design Principles

- **Layout/interaction:** Follow [admin_prototype.html](admin_prototype.html) structure -- 5-tab custom bottom nav (Dashboard / Orders / Verification center / Venues / Account), sub-page slide-in navigation, card-based layouts.
- **Data truth:** All fields, enums, states, API paths per PRD + [管理员端前端开发文档.md](管理员端前端开发文档.md) + [api_documentation.md](api_documentation.md). When prototype conflicts with docs, docs win.
- **Style reuse:** Same CSS variables, card styles, status tags as user-side. No new design tokens.

---

## Phase A: Foundation Setup

### A1. Register admin routes in `pages.json`

Add all 8 admin pages under `pages` array (not in tabBar -- admin uses custom tabbar):

- `pages/admin/dashboard` -- "管理员工作台"
- `pages/admin/orders/list` -- "订单管理"
- `pages/admin/orders/detail` -- "订单详情"
- `pages/admin/verification/index` -- "核销中心"
- `pages/admin/venues/list` -- "场馆管理"
- `pages/admin/venues/create` -- "新增场馆"
- `pages/admin/venues/edit` -- "编辑场馆"
- `pages/admin/timeslots/index` -- "排期管理"
- `pages/admin/security/password` -- "账号与安全"

### A2. Extend router guard for admin role check

In [src/utils/router-guard.js](体育馆预约2.0/src/utils/router-guard.js):

- Add admin page prefix detection: paths starting with `/pages/admin/` require `ROLE_VENUE_ADMIN` in `userInfo.roles`.
- Non-admin users accessing admin pages: toast "无管理员权限", redirect to user home.
- Add admin pages to "requires auth" (they already are by default since only guest pages are whitelisted).

### A3. Login flow -- admin role branching

In the login page [src/pages/user/login.vue](体育馆预约2.0/src/pages/user/login.vue):

- After successful `POST /auth/signin`, check `roles` array in response.
- If contains `ROLE_VENUE_ADMIN`: `uni.reLaunch({ url: '/pages/admin/dashboard' })`.
- Otherwise: proceed to user home as before.
- Admin login uses username+password only (no WeChat login path).

### A4. Complete admin API layer

**New file** `src/api/admin-dashboard.js`:

- `getAdminDashboardStats(params)` -- `GET /admin/dashboard/stats`
- `getAdminBookings(params)` -- `GET /admin/bookings`
- `adminCancelBooking(id)` -- `POST /bookings/{id}/admin-cancel`

**Modify** [src/api/admin.js](体育馆预约2.0/src/api/admin.js):

- Add `getMyManagedVenues()` -- `GET /venues/manager/me`
- Keep existing `createVenue`, `updateVenue`, `updateVenueStatus`, `deleteVenue`
- Remove non-functional wrappers (user management, assignVenueManager, getManagerVenues by ID) per dev doc

**Modify** [src/api/verification.js](体育馆预约2.0/src/api/verification.js):

- Add `getOrderByVerifyCode(code)` -- `GET /verification/code/{code}`
- Add `verifyByCode(code)` -- `POST /verification/code/verify` with body `{code}`

### A5. Create Pinia stores

- `src/stores/admin-dashboard.js` -- stats, timeRange, loading
- `src/stores/admin-orders.js` -- list, filters, pagination, selectedOrder
- `src/stores/admin-venues.js` -- managerVenues, editingVenue, timeslotsByDate
- `src/stores/admin-verification.js` -- currentCode, verifyResult, verifying, history
- `src/stores/admin-security.js` -- passwordForm, submitting

### A6. Create admin adapter utilities

**New file** `src/utils/admin-adapter.js`:

- `adaptAdminStats(raw)` -- normalize dashboard stats response
- `adaptAdminOrder(raw)` -- normalize order list/detail (handle `CANCELLED + refundType=LOGIC_REFUND` -> display "已退款")
- `adaptParticipant(raw)` -- normalize participant data with null safety

### A7. Create custom admin TabBar component

**New file** `src/components/admin/AdminTabBar.vue`:

- 5 tabs matching prototype: Dashboard / Orders / Verification (center highlight circle) / Venues / Account
- Self-drawn (not native tabBar), using `uni.navigateTo` or `uni.redirectTo` between admin pages
- Active state highlighting, center button elevated style per prototype

---

## Phase B: Core Business Pages

### B1. Dashboard page `pages/admin/dashboard.vue`

**Layout (per prototype):**

- Top navbar "工作台"
- Time range switcher: today / week / month / custom (4-segment bar)
- Custom range: show date pickers; disable query if either date missing
- 2-column stat card grid: revenue (gradient purple card), total orders, pending verification (orange), verified (green), refund/cancel (red), average price
- Bottom: AdminTabBar

**Data flow:**

- On load and time range change: call `getAdminDashboardStats({ timeRange, startDate, endDate })`
- Adapt response via `adaptAdminStats`
- Store in `admin-dashboard` store

### B2. Order list page `pages/admin/orders/list.vue`

**Layout (per prototype):**

- Top navbar "订单管理"
- Fixed search input (keyword: phone / ORD / REQ)
- Horizontal scrollable status filter chips: 全部 / 待核销(PAID+SHARING_SUCCESS) / 已核销(VERIFIED) / 已完成(COMPLETED) / 已退款 / 已取消(CANCELLED) / 已过期(EXPIRED)
- Type filter: 全部 / 普通(EXCLUSIVE) / 拼场(SHARED)
- Venue filter: dropdown from managed venues list
- Date range filter: startDate ~ endDate
- Order card list with LoadMore pagination
- Each card shows: venue name, booking time, order type tag, status badge, amount, phone tail, order number
- Action buttons on card: "查看详情" (always), "管理员取消" (only PAID/SHARING_SUCCESS)

**Data flow:**

- Call `getAdminBookings({ page, pageSize, status, keyword, venueId, type, startDate, endDate })`
- Adapt each order via `adaptAdminOrder`
- Cancel triggers `adminCancelBooking(id)` with confirmation modal, then local status update + stats refresh

### B3. Order detail page `pages/admin/orders/detail.vue`

**Layout (per prototype):**

- Sub-page with back arrow navbar "订单详情"
- Scrollable body with card sections:
  - Order info: order number, status, create time, user, phone, venue, date, timeslot, amount, type
  - Sharing info (if SHARED): team name, slogan, progress (current/total), per-person cost
  - Participants list (if SHARED): nickname, masked phone, verification status, verification code
- Fixed bottom action bar (footer-actions):
  - PAID/SHARING_SUCCESS: "核销" + "取消/退款"
  - VERIFIED: "完成订单"
  - COMPLETED/CANCELLED/EXPIRED: gray status text, no action buttons

**Data flow:**

- Call `GET /bookings/{id}` (existing API) for detail + participants
- Verify via `POST /verification/orders/{id}/verify`
- Complete via `POST /verification/orders/{id}/complete`
- Cancel via `POST /bookings/{id}/admin-cancel`

### B4. Reusable admin components

- `src/components/admin/AdminStatCard.vue` -- stat value + label + optional gradient background
- `src/components/admin/OrderFilterBar.vue` -- horizontal scrollable filter chips

---

## Phase C: Venue and Schedule Management

### C1. Venue list page `pages/admin/venues/list.vue`

**Layout (per prototype):**

- Navbar "场馆管理" with right-side "新增" button
- Venue cards: name, status tag (营业中/休息中/维护中), type, price/hour, operating hours, sharing support badge
- Per-card actions: Edit, Toggle status (上架/下架), View schedule

**Data flow:**

- Call `getMyManagedVenues()` on load
- Toggle status: `updateVenueStatus(id, { status })` with confirmation

### C2. Venue create page `pages/admin/venues/create.vue`

**Layout (per prototype venue-edit form):**

- Form fields: name, type (select), coverImage (upload), location, contactPhone, facilityTags (comma-separated input), description (textarea), price, openTime/closeTime, supportSharing (switch), autoGenerateDays (select: 7/15)
- Save button calls `createVenue(data)`

### C3. Venue edit page `pages/admin/venues/edit.vue`

- Same form as create, pre-filled with venue data from `GET /venues/{id}`
- Additional: Delete button (with confirmation modal) calls `deleteVenue(id)`
- Save calls `updateVenue(id, data)`

### C4. Timeslot management page `pages/admin/timeslots/index.vue`

**Layout (per prototype):**

- Venue selector dropdown (from managed venues)
- Date picker
- Status legend: Available (green) / Maintenance (red) / Booked (gray)
- 4-column timeslot grid, each cell showing time range + status
- Click AVAILABLE -> confirm modal -> set MAINTENANCE via `PATCH /timeslots/{id}/status`
- Click MAINTENANCE -> set AVAILABLE (no confirm needed, per prototype)
- Click BOOKED -> toast "该时段已有订单，不可操作"
- 409 response -> show backend message "存在冲突订单，无法设为维护中，请先处理订单"

**Data flow:**

- Call `GET /timeslots/venue/{venueId}/date/{date}` on venue/date change
- Update via `PATCH /timeslots/{id}/status`

---

## Phase D: Account and Security

### D1. Password change page `pages/admin/security/password.vue`

**Layout (per prototype):**

- Card with "修改密码" title
- Form: old password, new password, confirm new password
- Validation: new password min length, two entries match
- Submit calls `PUT /users/me/password` with `{ oldPassword, newPassword }`
- Success: toast + clear auth + redirect to login page
- "退出登录" button below with confirmation modal

---

## Phase E: Integration and Verification

### E1. Full-chain smoke test

- Login with admin credentials -> Dashboard loads with stats
- Navigate all tabs via AdminTabBar
- Order list: search, filter by status/type/venue/date
- Order detail: view participants for shared orders
- Verification center: input code -> query -> verify -> history update
- Venue management: create, edit, toggle status, delete
- Timeslot: select venue+date, lock/unlock, conflict handling
- Password change -> re-login

### E2. Error handling verification

- 400: parameter errors, invalid verification code -> show backend message
- 401: token expired -> redirect to login (handled by request layer)
- 403: unauthorized -> toast "无权限操作该资源", stay on page
- 404: resource not found -> toast + go back
- 409: schedule conflict -> show "存在冲突订单，请先处理订单"

### E3. Style consistency check

- Admin pages match user-side visual density (font sizes, card padding, button heights)
- Empty states, loading skeletons, error retry paths all present
- Status colors consistent with user-side conventions

---

## Key File References


| File                                                                                     | Role                                                     |
| ---------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| [体育馆预约2.0/src/utils/request.js](体育馆预约2.0/src/utils/request.js)                           | Request layer (token injection, error handling, retry)   |
| [体育馆预约2.0/src/utils/auth.js](体育馆预约2.0/src/utils/auth.js)                                 | Token/userInfo storage                                   |
| [体育馆预约2.0/src/utils/router-guard.js](体育馆预约2.0/src/utils/router-guard.js)                 | Route interception (needs admin extension)               |
| [体育馆预约2.0/src/stores/user.js](体育馆预约2.0/src/stores/user.js)                               | User state (roles source)                                |
| [体育馆预约2.0/src/api/admin.js](体育馆预约2.0/src/api/admin.js)                                   | Existing venue CRUD wrappers (needs cleanup + additions) |
| [体育馆预约2.0/src/api/verification.js](体育馆预约2.0/src/api/verification.js)                     | Existing order verify/complete (needs code-based APIs)   |
| [体育馆预约2.0/src/components/NavBar.vue](体育馆预约2.0/src/components/NavBar.vue)                 | Reusable navbar                                          |
| [体育馆预约2.0/src/components/BookingCard.vue](体育馆预约2.0/src/components/BookingCard.vue)       | Order card (adapt for admin)                             |
| [体育馆预约2.0/src/components/LoadMore.vue](体育馆预约2.0/src/components/LoadMore.vue)             | Pagination component                                     |
| [体育馆预约2.0/src/components/SkeletonScreen.vue](体育馆预约2.0/src/components/SkeletonScreen.vue) | Loading skeleton                                         |


## Estimated New Files

- 9 page `.vue` files (dashboard, orders/list, orders/detail, verification/index, venues/list, venues/create, venues/edit, timeslots/index, security/password)
- 1 API file (`api/admin-dashboard.js`)
- 5 store files (`stores/admin-*.js`)
- 1 utility file (`utils/admin-adapter.js`)
- 3-4 component files (`components/admin/AdminTabBar.vue`, `AdminStatCard.vue`, `OrderFilterBar.vue`, optionally `VerifyCodeInput.vue`, `TimeslotStatusLegend.vue`)
- Modifications to 4 existing files (`pages.json`, `router-guard.js`, `api/admin.js`, `api/verification.js`, `pages/user/login.vue`)

