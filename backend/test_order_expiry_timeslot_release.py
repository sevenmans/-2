#!/usr/bin/env python3
"""
测试订单过期后时间段释放功能
"""

import requests
import json
import time
from datetime import datetime, timedelta

# 配置
BASE_URL = "http://localhost:8080"
VENUE_ID = 1
TIMESLOT_ID = 1

def create_order():
    """创建订单"""
    url = f"{BASE_URL}/api/bookings"
    data = {
        "venueId": VENUE_ID,
        "bookingDate": (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d"),
        "startTime": "10:00",
        "endTime": "12:00",
        "bookingType": "EXCLUSIVE",
        "totalPrice": 100.0
    }
    
    print(f"创建订单请求: {json.dumps(data, ensure_ascii=False)}")
    response = requests.post(url, json=data)
    print(f"创建订单响应状态码: {response.status_code}")
    print(f"创建订单响应内容: {response.text}")
    
    if response.status_code == 200:
        result = response.json()
        order_id = result.get('id')
        print(f"订单创建成功，订单ID: {order_id}")
        return order_id
    else:
        print(f"订单创建失败: {response.text}")
        return None

def force_expire_order(order_id):
    """强制订单过期"""
    url = f"{BASE_URL}/api/test/order-status/{order_id}/simulate-timeout"
    
    print(f"模拟订单过期请求: {url}")
    response = requests.post(url)
    print(f"模拟订单过期响应状态码: {response.status_code}")
    print(f"模拟订单过期响应内容: {response.text}")
    
    return response.status_code == 200

def get_order_status(order_id):
    """获取订单状态"""
    # 尝试使用订单API获取状态
    url = f"{BASE_URL}/api/order/{order_id}"
    print(f"获取订单状态请求: {url}")
    response = requests.get(url)
    print(f"获取订单状态响应状态码: {response.status_code}")
    print(f"获取订单状态响应内容: {response.text}")
    
    if response.status_code == 200:
        result = response.json()
        status = result.get('status')
        print(f"订单状态: {status}")
        return status
    else:
        print(f"获取订单状态失败: {response.text}")
        return None

def get_timeslot_status(timeslot_id):
    """获取时间段状态"""
    url = f"{BASE_URL}/api/timeslots/{timeslot_id}"
    
    print(f"获取时间段状态请求: {url}")
    response = requests.get(url)
    print(f"获取时间段状态响应状态码: {response.status_code}")
    print(f"获取时间段状态响应内容: {response.text}")
    
    if response.status_code == 200:
        result = response.json()
        status = result.get('status')
        print(f"时间段状态: {status}")
        return status
    else:
        print(f"获取时间段状态失败: {response.text}")
        return None

def main():
    """主测试流程"""
    print("=== 开始测试订单过期后时间段释放功能 ===")
    
    # 1. 创建订单
    print("\n1. 创建订单...")
    order_id = create_order()
    if not order_id:
        print("测试失败：无法创建订单")
        return
    
    # 2. 检查时间段状态（应该是RESERVED）
    print("\n2. 检查时间段状态（预期：RESERVED）...")
    timeslot_status = get_timeslot_status(TIMESLOT_ID)
    if timeslot_status != "RESERVED":
        print(f"警告：时间段状态不是RESERVED，而是{timeslot_status}")
    
    # 3. 强制订单过期
    print("\n3. 强制订单过期...")
    if not force_expire_order(order_id):
        print("测试失败：无法强制订单过期")
        return
    
    # 4. 等待一下，让系统处理
    print("\n4. 等待系统处理...")
    time.sleep(2)
    
    # 5. 检查订单状态（应该是EXPIRED）
    print("\n5. 检查订单状态（预期：EXPIRED）...")
    order_status = get_order_status(order_id)
    
    # 6. 检查时间段状态（应该是AVAILABLE）
    print("\n6. 检查时间段状态（预期：AVAILABLE）...")
    timeslot_status_after = get_timeslot_status(TIMESLOT_ID)
    
    # 7. 验证结果
    print("\n=== 测试结果 ===")
    print(f"订单ID: {order_id}")
    print(f"订单状态: {order_status} (预期: EXPIRED)")
    print(f"时间段状态: {timeslot_status_after} (预期: AVAILABLE)")
    
    success = True
    if order_status != "EXPIRED":
        print("❌ 订单状态不正确")
        success = False
    
    if timeslot_status_after != "AVAILABLE":
        print("❌ 时间段状态不正确，时间段未被释放")
        success = False
    
    if success:
        print("✅ 测试通过：订单过期后时间段成功释放")
    else:
        print("❌ 测试失败：订单过期后时间段未正确释放")

if __name__ == "__main__":
    main()