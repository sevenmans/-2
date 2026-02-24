#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
检查时间段状态脚本
用于检查数据库中时间段的状态，特别是未来日期是否被错误标记为EXPIRED
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

def check_timeslot_status():
    """检查时间段状态"""
    connection = connect_to_database()
    if not connection:
        return
    
    try:
        cursor = connection.cursor(dictionary=True)
        
        # 获取今天和未来几天的日期
        today = date.today()
        tomorrow = today + timedelta(days=1)
        day_after_tomorrow = today + timedelta(days=2)
        
        print(f"📅 检查日期范围:")
        print(f"   今天: {today}")
        print(f"   明天: {tomorrow}")
        print(f"   后天: {day_after_tomorrow}")
        print("\n" + "="*60)
        
        # 查询今天的时间段状态分布
        print(f"\n🔍 今天 ({today}) 的时间段状态分布:")
        cursor.execute("""
            SELECT status, COUNT(*) as count 
            FROM time_slots 
            WHERE date = %s 
            GROUP BY status
            ORDER BY status
        """, (today,))
        
        today_results = cursor.fetchall()
        if today_results:
            for row in today_results:
                print(f"   {row['status']}: {row['count']} 个")
        else:
            print("   没有找到今天的时间段")
        
        # 查询明天的时间段状态分布
        print(f"\n🔍 明天 ({tomorrow}) 的时间段状态分布:")
        cursor.execute("""
            SELECT status, COUNT(*) as count 
            FROM time_slots 
            WHERE date = %s 
            GROUP BY status
            ORDER BY status
        """, (tomorrow,))
        
        tomorrow_results = cursor.fetchall()
        if tomorrow_results:
            for row in tomorrow_results:
                print(f"   {row['status']}: {row['count']} 个")
                if row['status'] == 'EXPIRED':
                    print(f"   ⚠️  警告: 明天的时间段不应该是EXPIRED状态!")
        else:
            print("   没有找到明天的时间段")
        
        # 查询后天的时间段状态分布
        print(f"\n🔍 后天 ({day_after_tomorrow}) 的时间段状态分布:")
        cursor.execute("""
            SELECT status, COUNT(*) as count 
            FROM time_slots 
            WHERE date = %s 
            GROUP BY status
            ORDER BY status
        """, (day_after_tomorrow,))
        
        day_after_results = cursor.fetchall()
        if day_after_results:
            for row in day_after_results:
                print(f"   {row['status']}: {row['count']} 个")
                if row['status'] == 'EXPIRED':
                    print(f"   ⚠️  警告: 后天的时间段不应该是EXPIRED状态!")
        else:
            print("   没有找到后天的时间段")
        
        # 查询所有未来日期中状态为EXPIRED的时间段
        print(f"\n🚨 检查未来日期中错误的EXPIRED状态:")
        cursor.execute("""
            SELECT venue_id, date, start_time, end_time, status, created_at, updated_at
            FROM time_slots 
            WHERE date > %s AND status = 'EXPIRED'
            ORDER BY date, start_time
            LIMIT 10
        """, (today,))
        
        expired_future_slots = cursor.fetchall()
        if expired_future_slots:
            print(f"   ❌ 发现 {len(expired_future_slots)} 个未来日期被错误标记为EXPIRED的时间段:")
            for slot in expired_future_slots:
                print(f"      场馆ID: {slot['venue_id']}, 日期: {slot['date']}, 时间: {slot['start_time']}-{slot['end_time']}")
                print(f"      创建时间: {slot['created_at']}, 更新时间: {slot['updated_at']}")
                print()
        else:
            print("   ✅ 没有发现未来日期被错误标记为EXPIRED的时间段")
        
        # 查询总体统计
        print(f"\n📊 总体统计:")
        cursor.execute("""
            SELECT 
                DATE(date) as slot_date,
                status,
                COUNT(*) as count
            FROM time_slots 
            WHERE date BETWEEN %s AND %s
            GROUP BY DATE(date), status
            ORDER BY slot_date, status
        """, (today, today + timedelta(days=7)))
        
        all_results = cursor.fetchall()
        current_date = None
        for row in all_results:
            if row['slot_date'] != current_date:
                current_date = row['slot_date']
                print(f"\n   📅 {current_date}:")
            print(f"      {row['status']}: {row['count']} 个")
        
    except mysql.connector.Error as error:
        print(f"❌ 查询失败: {error}")
    
    finally:
        if connection.is_connected():
            cursor.close()
            connection.close()
            print(f"\n✅ 数据库连接已关闭")

if __name__ == "__main__":
    print("🔍 开始检查时间段状态...")
    check_timeslot_status()
    print("\n✅ 检查完成")