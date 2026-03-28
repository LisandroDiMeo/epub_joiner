<template>
  <div class="book-list" v-if="modelValue.length">
    <h3 class="book-list__heading">Books to merge ({{ modelValue.length }})</h3>
    <draggable
      :model-value="modelValue"
      @update:model-value="$emit('update:modelValue', $event)"
      item-key="id"
      handle=".book-item__handle"
      :animation="200"
      ghost-class="book-list__ghost"
      class="book-list__items"
    >
      <template #item="{ element, index }">
        <BookItem
          :book="element"
          :index="index"
          @remove="$emit('remove', index)"
        />
      </template>
    </draggable>
  </div>
</template>

<script setup>
import draggable from 'vuedraggable'
import BookItem from './BookItem.vue'

defineProps({
  modelValue: { type: Array, required: true },
})

defineEmits(['update:modelValue', 'remove'])
</script>

<style scoped>
.book-list__heading {
  font-size: 0.9rem;
  font-weight: 600;
  color: #475569;
  margin: 0 0 0.75rem 0;
}

.book-list__items {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.book-list__ghost {
  opacity: 0.4;
}
</style>
