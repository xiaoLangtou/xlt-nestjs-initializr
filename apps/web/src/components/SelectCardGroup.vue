<script setup lang="ts" generic="T extends string">
interface Option {
  value: T;
  name: string;
  desc?: string;
}

const props = defineProps<{
  label: string;
  options: Option[];
  modelValue: T;
  cols?: 2 | 3;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: T];
}>();

function select(value: T) {
  emit('update:modelValue', value);
}
</script>

<template>
  <div class="select-group">
    <div class="select-label">{{ props.label }}</div>
    <div class="select-cards" :class="`cols-${props.cols ?? 2}`">
      <div
        v-for="opt in props.options"
        :key="opt.value"
        class="select-card"
        :class="{ active: props.modelValue === opt.value }"
        @click="select(opt.value)"
      >
        <div class="sc-radio" />
        <div class="sc-info">
          <div class="sc-name">{{ opt.name }}</div>
          <div v-if="opt.desc" class="sc-desc">{{ opt.desc }}</div>
        </div>
      </div>
    </div>
  </div>
</template>
