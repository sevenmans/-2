#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
测试时间段API接口
用于测试API返回的时间段数据是否正确
"""

import requests
import json
from datetime import datetime, date, timedelta

def test_timeslot_api():
    """测试时间段API"""
    base_url = "http://localhost:8080/api"
    
    # 测试日期
    today = date.today()
    tomorrow = today + timedelta(days=1)
    day_after_tomorrow = today + timedelta(days=2)
    
    print(f"🔍 测试时间段API接口...")
    print(f"📅 测试日期:")
    print(f"   今天: {today}")
    print(f"   明天: {tomorrow}")
    print(f"   后天: {day_after_tomorrow}")
    print("\n" + "="*60)
    
    # 测试场馆ID（使用实际存在的场馆ID）
    venue_id = 40  # 梦想足球场
    
    # 测试今天的时间段
    print(f"\n🔍 测试今天 ({today}) 的时间段API:")
    try:
        response = requests.get(f"{base_url}/timeslots/venue/{venue_id}/date/{today}")
        print(f"   状态码: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"   返回数据类型: {type(data)}")
            
            if isinstance(data, dict) and 'data' in data:
                timeslots = data['data']
            elif isinstance(data, list):
                timeslots = data
            else:
                timeslots = []
            
            print(f"   时间段数量: {len(timeslots)}")
            
            # 统计状态分布
            status_count = {}
            expired_slots = []
            
            for slot in timeslots:
                status = slot.get('status', 'UNKNOWN')
                status_count[status] = status_count.get(status, 0) + 1
                
                if status == 'EXPIRED':
                    expired_slots.append(slot)
            
            print(f"   状态分布:")
            for status, count in status_count.items():
                print(f"      {status}: {count} 个")
            
            if expired_slots:
                print(f"   ⚠️  发现EXPIRED状态的时间段:")
                for slot in expired_slots[:3]:  # 只显示前3个
                    print(f"      时间: {slot.get('startTime')}-{slot.get('endTime')}, 状态: {slot.get('status')}")
        else:
            print(f"   ❌ API调用失败: {response.text}")
    
    except requests.exceptions.RequestException as e:
        print(f"   ❌ 请求异常: {e}")
    
    # 测试明天的时间段
    print(f"\n🔍 测试明天 ({tomorrow}) 的时间段API:")
    try:
        response = requests.get(f"{base_url}/timeslots/venue/{venue_id}/date/{tomorrow}")
        print(f"   状态码: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            
            if isinstance(data, dict) and 'data' in data:
                timeslots = data['data']
            elif isinstance(data, list):
                timeslots = data
            else:
                timeslots = []
            
            print(f"   时间段数量: {len(timeslots)}")
            
            # 统计状态分布
            status_count = {}
            expired_slots = []
            
            for slot in timeslots:
                status = slot.get('status', 'UNKNOWN')
                status_count[status] = status_count.get(status, 0) + 1
                
                if status == 'EXPIRED':
                    expired_slots.append(slot)
            
            print(f"   状态分布:")
            for status, count in status_count.items():
                print(f"      {status}: {count} 个")
            
            if expired_slots:
                print(f"   ⚠️  警告: 明天的时间段不应该是EXPIRED状态!")
                for slot in expired_slots[:3]:  # 只显示前3个
                    print(f"      时间: {slot.get('startTime')}-{slot.get('endTime')}, 状态: {slot.get('status')}")
            else:
                print(f"   ✅ 明天的时间段状态正常")
        else:
            print(f"   ❌ API调用失败: {response.text}")
    
    except requests.exceptions.RequestException as e:
        print(f"   ❌ 请求异常: {e}")
    
    # 测试后天的时间段（如果存在）
    print(f"\n🔍 测试后天 ({day_after_tomorrow}) 的时间段API:")
    try:
        response = requests.get(f"{base_url}/timeslots/venue/{venue_id}/date/{day_after_tomorrow}")
        print(f"   状态码: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            
            if isinstance(data, dict) and 'data' in data:
                timeslots = data['data']
            elif isinstance(data, list):
                timeslots = data
            else:
                timeslots = []
            
            print(f"   时间段数量: {len(timeslots)}")
            
            if len(timeslots) > 0:
                # 统计状态分布
                status_count = {}
                expired_slots = []
                
                for slot in timeslots:
                    status = slot.get('status', 'UNKNOWN')
                    status_count[status] = status_count.get(status, 0) + 1
                    
                    if status == 'EXPIRED':
                        expired_slots.append(slot)
                
                print(f"   状态分布:")
                for status, count in status_count.items():
                    print(f"      {status}: {count} 个")
                
                if expired_slots:
                    print(f"   ⚠️  警告: 后天的时间段不应该是EXPIRED状态!")
                    for slot in expired_slots[:3]:  # 只显示前3个
                        print(f"      时间: {slot.get('startTime')}-{slot.get('endTime')}, 状态: {slot.get('status')}")
                else:
                    print(f"   ✅ 后天的时间段状态正常")
            else:
                print(f"   📝 后天还没有生成时间段")
        else:
            print(f"   ❌ API调用失败: {response.text}")
    
    except requests.exceptions.RequestException as e:
        print(f"   ❌ 请求异常: {e}")
    
    # 测试可用时间段API
    print(f"\n🔍 测试可用时间段API:")
    try:
        response = requests.get(f"{base_url}/timeslots/available?venueId={venue_id}&date={tomorrow}")
        print(f"   状态码: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            
            if isinstance(data, dict) and 'data' in data:
                available_slots = data['data']
            elif isinstance(data, list):
                available_slots = data
            else:
                available_slots = []
            
            print(f"   可用时间段数量: {len(available_slots)}")
            
            # 检查是否有EXPIRED状态的时间段被返回
            expired_in_available = [slot for slot in available_slots if slot.get('status') == 'EXPIRED']
            if expired_in_available:
                print(f"   ⚠️  警告: 可用时间段API返回了EXPIRED状态的时间段!")
                for slot in expired_in_available[:3]:
                    print(f"      时间: {slot.get('startTime')}-{slot.get('endTime')}, 状态: {slot.get('status')}")
            else:
                print(f"   ✅ 可用时间段API没有返回EXPIRED状态的时间段")
        else:
            print(f"   ❌ API调用失败: {response.text}")
    
    except requests.exceptions.RequestException as e:
        print(f"   ❌ 请求异常: {e}")

if __name__ == "__main__":
    print("🔍 开始测试时间段API...")
    test_timeslot_api()
    print("\n✅ 测试完成")