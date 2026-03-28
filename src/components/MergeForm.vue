<template>
  <div class="merge-form">
    <div class="merge-form__fields">
      <div class="merge-form__field">
        <label class="merge-form__label" for="title">Merged Title</label>
        <input
          id="title"
          class="merge-form__input"
          type="text"
          :value="title"
          @input="$emit('update:title', $event.target.value)"
          placeholder="Enter merged book title"
        />
      </div>
      <div class="merge-form__field">
        <label class="merge-form__label" for="author">Author</label>
        <input
          id="author"
          class="merge-form__input"
          type="text"
          :value="author"
          @input="$emit('update:author', $event.target.value)"
          placeholder="Enter author name"
        />
      </div>
    </div>
    <button
      class="merge-form__button"
      :disabled="!canMerge || merging"
      @click="$emit('merge')"
    >
      <template v-if="merging">Merging...</template>
      <template v-else>Merge & Download</template>
    </button>
  </div>
</template>

<script setup>
defineProps({
  title: { type: String, required: true },
  author: { type: String, required: true },
  canMerge: { type: Boolean, required: true },
  merging: { type: Boolean, required: true },
})

defineEmits(['update:title', 'update:author', 'merge'])
</script>

<style scoped>
.merge-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.merge-form__fields {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

@media (max-width: 500px) {
  .merge-form__fields {
    grid-template-columns: 1fr;
  }
}

.merge-form__label {
  display: block;
  font-size: 0.8rem;
  font-weight: 600;
  color: #475569;
  margin-bottom: 0.35rem;
}

.merge-form__input {
  width: 100%;
  padding: 0.6rem 0.75rem;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 0.9rem;
  color: #1e293b;
  background: white;
  transition: border-color 0.15s;
  box-sizing: border-box;
}

.merge-form__input:focus {
  outline: none;
  border-color: #6366f1;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
}

.merge-form__button {
  padding: 0.75rem 1.5rem;
  background: #6366f1;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
}

.merge-form__button:hover:not(:disabled) {
  background: #4f46e5;
}

.merge-form__button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
