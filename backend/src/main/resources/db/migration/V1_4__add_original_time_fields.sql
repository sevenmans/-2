-- 添加原始时间字段到订单表
-- 用于保存已取消订单的原始预约时间信息

ALTER TABLE `order` 
ADD COLUMN `original_start_time` TIME NULL COMMENT '原始开始时间（用于已取消订单显示）',
ADD COLUMN `original_end_time` TIME NULL COMMENT '原始结束时间（用于已取消订单显示）';

-- 为现有的已取消订单填充原始时间信息（如果可能的话）
-- 注意：这个脚本只能为那些还有关联时间段的已取消订单填充数据
UPDATE `order` o
SET 
    original_start_time = (
        SELECT MIN(ts.start_time) 
        FROM time_slot ts 
        WHERE ts.order_id = o.id
    ),
    original_end_time = (
        SELECT MAX(ts.end_time) 
        FROM time_slot ts 
        WHERE ts.order_id = o.id
    )
WHERE o.status = 'CANCELLED' 
  AND o.original_start_time IS NULL 
  AND o.original_end_time IS NULL
  AND EXISTS (
      SELECT 1 FROM time_slot ts WHERE ts.order_id = o.id
  );
