#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
检查场馆和时间段数据
用于检查数据库中的场馆和时间段数据
"""

import mysql.connector
from datetime import datetime, date, timedelta
import json

def connect_to_database():
    """连接到MySQL数据库"""
    try:
        connection = mysql.connector.connect(
            host='localhost',
            database='gym_booking',
            user='root',
            password='yanyu123..'
        )
        return connection
    except mysql.connector.Error as error:
        print(f"❌ 数据库连接失败: {error}")
        return None

def check_venues_and_timeslots():
    """检查场馆和时间段数据"""
    connection = connect_to_database()
    if not connection:
        return
    
    try:
        cursor = connection.cursor(dictionary=True)
        
        # 检查场馆表
        print(f"🏟️ 检查场馆数据:")
        cursor.execute("SELECT id, name, status FROM venues ORDER BY id")
        venues = cursor.fetchall()
        
        if venues:
            print(f"   找到 {len(venues)} 个场馆:")
            for venue in venues:
                print(f"      ID: {venue['id']}, 名称: {venue['name']}, 状态: {venue['status']}")
        else:
            print("   ❌ 没有找到任何场馆")
            return
        
        # 获取今天和明天的日期
        today = date.today()
        tomorrow = today + timedelta(days=1)
        
        print(f"\n📅 检查时间段数据 (今天: {today}, 明天: {tomorrow}):")
        
        # 检查每个场馆的时间段
        for venue in venues:
            venue_id = venue['id']
            venue_name = venue['name']
            
            print(f"\n🏟️ 场馆 {venue_id} ({venue_name}):")
            
            # 检查今天的时间段
            cursor.execute("""
                SELECT COUNT(*) as count, status
                FROM time_slots 
                WHERE venue_id = %s AND date = %s
                GROUP BY status
                ORDER BY status
            """, (venue_id, today))
            
            today_slots = cursor.fetchall()
            if today_slots:
                print(f"   今天 ({today}):")
                for slot in today_slots:
                    print(f"      {slot['status']}: {slot['count']} 个")
            else:
                print(f"   今天 ({today}): 没有时间段")
            
            # 检查明天的时间段
            cursor.execute("""
                SELECT COUNT(*) as count, status
                FROM time_slots 
                WHERE venue_id = %s AND date = %s
                GROUP BY status
                ORDER BY status
            """, (venue_id, tomorrow))
            
            tomorrow_slots = cursor.fetchall()
            if tomorrow_slots:
                print(f"   明天 ({tomorrow}):")
                for slot in tomorrow_slots:
                    print(f"      {slot['status']}: {slot['count']} 个")
                    if slot['status'] == 'EXPIRED':
                        print(f"      ⚠️  警告: 明天的时间段不应该是EXPIRED状态!")
            else:
                print(f"   明天 ({tomorrow}): 没有时间段")
            
            # 检查该场馆是否有EXPIRED状态的未来时间段
            cursor.execute("""
                SELECT COUNT(*) as count
                FROM time_slots 
                WHERE venue_id = %s AND date > %s AND status = 'EXPIRED'
            """, (venue_id, today))
            
            expired_future = cursor.fetchone()
            if expired_future and expired_future['count'] > 0:
                print(f"   ❌ 发现 {expired_future['count']} 个未来日期被错误标记为EXPIRED的时间段")
                
                # 显示具体的EXPIRED时间段
                cursor.execute("""
                    SELECT date, start_time, end_time, status, created_at, updated_at
                    FROM time_slots 
                    WHERE venue_id = %s AND date > %s AND status = 'EXPIRED'
                    ORDER BY date, start_time
                    LIMIT 5
                """, (venue_id, today))
                
                expired_details = cursor.fetchall()
                for detail in expired_details:
                    print(f"      日期: {detail['date']}, 时间: {detail['start_time']}-{detail['end_time']}")
                    print(f"      创建: {detail['created_at']}, 更新: {detail['updated_at']}")
            else:
                print(f"   ✅ 没有未来日期被错误标记为EXPIRED的时间段")
        
        # 检查总体时间段统计
        print(f"\n📊 总体时间段统计:")
        cursor.execute("""
            SELECT 
                DATE(date) as slot_date,
                COUNT(*) as total_count,
                SUM(CASE WHEN status = 'AVAILABLE' THEN 1 ELSE 0 END) as available_count,
                SUM(CASE WHEN status = 'EXPIRED' THEN 1 ELSE 0 END) as expired_count,
                SUM(CASE WHEN status = 'RESERVED' THEN 1 ELSE 0 END) as reserved_count
            FROM time_slots 
            WHERE date BETWEEN %s AND %s
            GROUP BY DATE(date)
            ORDER BY slot_date
        """, (today, today + timedelta(days=7)))
        
        stats = cursor.fetchall()
        for stat in stats:
            print(f"   {stat['slot_date']}: 总计 {stat['total_count']}, 可用 {stat['available_count']}, 已预约 {stat['reserved_count']}, 过期 {stat['expired_count']}")
            if stat['expired_count'] > 0 and stat['slot_date'] > today:
                print(f"      ⚠️  警告: {stat['slot_date']} 有 {stat['expired_count']} 个过期时间段")
        
    except mysql.connector.Error as error:
        print(f"❌ 查询失败: {error}")
    
    finally:
        if connection.is_connected():
            cursor.close()
            connection.close()
            print(f"\n✅ 数据库连接已关闭")

if __name__ == "__main__":
    print("🔍 开始检查场馆和时间段数据...")
    check_venues_and_timeslots()
    print("\n✅ 检查完成")