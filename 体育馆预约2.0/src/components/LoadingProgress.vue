<template>
  <div class="loading-progress" v-if="visible">
    <div class="loading-container">
      <!-- 简单加载提示 -->
      <div class="loading-text">{{ text || '加载中...' }}</div>
    </div>
  </div>
</template>

<script setup>
// Props
const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  text: {
    type: String,
    default: '加载中...'
  }
})
</script>

<style scoped>
.loading-progress {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.loading-container {
  text-align: center;
  padding: 30rpx;
  background: white;
  border-radius: 10rpx;
  box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.1);
}

.loading-text {
  font-size: 28rpx;
  color: #666;
}
</style>