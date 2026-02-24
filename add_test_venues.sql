USE gym_booking;

INSERT INTO venues (name, type, location, description, facilities, price, status, open_time, close_time, support_sharing, created_at, updated_at)
VALUES 
('测试篮球馆', '篮球', '北京市海淀区', '室内篮球场，设施完善', '更衣室,淋浴,饮水机', 100.0, 'OPEN', '09:00:00', '22:00:00', true, NOW(), NOW()),
('测试足球场', '足球', '北京市朝阳区', '标准11人制足球场', '更衣室,淋浴,停车场', 200.0, 'OPEN', '08:00:00', '21:00:00', true, NOW(), NOW()),
('测试羽毛球馆', '羽毛球', '北京市西城区', '室内羽毛球场，共8片场地', '更衣室,淋浴,休息区', 80.0, 'OPEN', '10:00:00', '22:00:00', false, NOW(), NOW());

SELECT * FROM venues;
