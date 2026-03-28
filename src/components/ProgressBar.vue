<template>
  <div class="progress" v-if="visible">
    <div class="progress__bar">
      <div class="progress__fill" :style="{ width: `${percent}%` }"></div>
    </div>
    <span class="progress__text">{{ Math.round(percent) }}%</span>
  </div>
</template>

<script setup>
defineProps({
  percent: { type: Number, required: true },
  visible: { type: Boolean, required: true },
})
</script>

<style scoped>
.progress {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.progress__bar {
  flex: 1;
  height: 8px;
  background: #e2e8f0;
  border-radius: 4px;
  overflow: hidden;
}

.progress__fill {
  height: 100%;
  background: #6366f1;
  border-radius: 4px;
  transition: width 0.3s ease;
}

.progress__text {
  font-size: 0.8rem;
  font-weight: 600;
  color: #6366f1;
  min-width: 3rem;
  text-align: right;
}
</style>
