-- 插入场馆数据
INSERT INTO venues (name, type, location, description, facilities, image, features, price, status, open_time, close_time, manager_id, support_sharing, created_at, updated_at) VALUES
('阳光体育馆', '篮球', '北京市朝阳区体育路1号', '专业篮球场地，设施齐全', '篮球架,更衣室,淋浴间,停车场', 'https://example.com/basketball1.jpg', '室内场地,专业地板,空调', 80.00, 'OPEN', '08:00:00', '22:00:00', 1, true, NOW(), NOW()),
('绿茵足球场', '足球', '北京市海淀区足球街2号', '标准足球场，草坪优质', '足球门,更衣室,观众席,停车场', 'https://example.com/football1.jpg', '天然草坪,夜间照明,观众席', 120.00, 'OPEN', '06:00:00', '23:00:00', 1, true, NOW(), NOW()),
('健身中心', '健身', '北京市西城区健身大道3号', '综合健身场所，器械齐全', '跑步机,哑铃,更衣室,淋浴间', 'https://example.com/gym1.jpg', '空调,专业器械,私教服务', 50.00, 'OPEN', '06:00:00', '23:59:59', 1, false, NOW(), NOW()),
('水上运动中心', '游泳', '北京市东城区游泳路4号', '标准游泳池，水质清澈', '游泳池,更衣室,淋浴间,救生设备', 'https://example.com/swimming1.jpg', '恒温水池,专业泳道,救生员', 60.00, 'OPEN', '06:00:00', '22:00:00', 1, false, NOW(), NOW()),
('羽毛球馆', '羽毛球', '北京市丰台区羽毛球街5号', '专业羽毛球场地，灯光充足', '羽毛球网,更衣室,休息区,停车场', 'https://example.com/badminton1.jpg', '专业地胶,无风环境,高度适宜', 40.00, 'OPEN', '08:00:00', '22:00:00', 1, false, NOW(), NOW()),
('网球俱乐部', '网球', '北京市石景山区网球路6号', '标准网球场，环境优美', '网球网,更衣室,休息区,停车场', 'https://example.com/tennis1.jpg', '硬地场地,夜间照明,专业网高', 100.00, 'OPEN', '07:00:00', '21:00:00', 1, false, NOW(), NOW()),
('星光篮球场', '篮球', '北京市昌平区篮球大道7号', '室外篮球场，视野开阔', '篮球架,更衣室,休息区,停车场', 'https://example.com/basketball2.jpg', '室外场地,夜间照明,环境优美', 60.00, 'OPEN', '06:00:00', '23:00:00', 1, true, NOW(), NOW()),
('梦想足球场', '足球', '北京市大兴区足球公园8号', '人工草坪足球场，设施现代', '足球门,更衣室,观众席,停车场', 'https://example.com/football2.jpg', '人工草坪,专业照明,现代设施', 100.00, 'OPEN', '07:00:00', '22:00:00', 1, true, NOW(), NOW());

-- 插入拼单数据（只为足球和篮球场）
INSERT INTO sharing_orders (venue_id, venue_name, booking_date, start_time, end_time, team_name, contact_info, max_participants, current_participants, description, price_per_person, status, creator_username, order_no, created_at, updated_at) VALUES
(1, '阳光体育馆', '2025-06-25', '19:00:00', '21:00:00', '雷霆篮球队', '13800138001', 10, 3, '寻找篮球爱好者一起打球，欢迎各种水平的朋友加入！', 25.00, 'OPEN', 'user001', 'S1719123456001', NOW(), NOW()),
(2, '绿茵足球场', '2025-06-26', '20:00:00', '22:00:00', '飞鹰足球队', '13900139002', 22, 8, '11人制足球比赛，还需要14人，有兴趣的朋友快来！', 15.00, 'OPEN', 'user002', 'S1719123456002', NOW(), NOW()),
(7, '星光篮球场', '2025-06-27', '18:00:00', '20:00:00', '闪电篮球队', '13700137003', 8, 2, '3V3篮球赛，技术不限，重在参与和交流！', 30.00, 'OPEN', 'user003', 'S1719123456003', NOW(), NOW()),
(8, '梦想足球场', '2025-06-28', '19:30:00', '21:30:00', '烈火足球队', '13600136004', 16, 6, '8人制足球，寻找志同道合的球友！', 20.00, 'OPEN', 'user004', 'S1719123456004', NOW(), NOW());

-- 插入拼单申请数据
INSERT INTO sharing_request (order_id, applicant_username, applicant_team_name, applicant_contact, participants_count, message, status, created_at, updated_at) VALUES
(1, 'user005', '个人', '13500135005', 1, '希望加入篮球活动，有一定基础', 'APPROVED', NOW(), NOW()),
(1, 'user006', '个人', '13400134006', 1, '篮球爱好者，想要参与', 'APPROVED', NOW(), NOW()),
(2, 'user007', '雄鹰队', '13300133007', 3, '我们队想要参加足球比赛', 'APPROVED', NOW(), NOW()),
(2, 'user008', '猛虎队', '13200132008', 2, '两个人一起参加足球', 'APPROVED', NOW(), NOW()),
(2, 'user009', '个人', '13100131009', 2, '和朋友一起踢球', 'APPROVED', NOW(), NOW()),
(3, 'user010', '个人', '13000130010', 1, '想要参加篮球活动', 'APPROVED', NOW(), NOW()),
(4, 'user011', '风暴队', '12900129011', 2, '两人组队参加足球', 'APPROVED', NOW(), NOW()),
(4, 'user012', '闪电队', '12800128012', 3, '三人小队加入足球比赛', 'APPROVED', NOW(), NOW());

-- 更新场馆评分（模拟数据）
-- 注意：venues表中没有rating字段，此部分注释掉
-- UPDATE venues SET 
--     rating = CASE 
--         WHEN id = 1 THEN 4.5
--         WHEN id = 2 THEN 4.8
--         WHEN id = 3 THEN 4.2
--         WHEN id = 4 THEN 4.6
--         WHEN id = 5 THEN 4.3
--         WHEN id = 6 THEN 4.7
--         WHEN id = 7 THEN 4.4
--         WHEN id = 8 THEN 4.9
--         ELSE rating
--     END
-- WHERE id IN (1, 2, 3, 4, 5, 6, 7, 8);