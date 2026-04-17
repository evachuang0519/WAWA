<template>
  <span class="badge" :class="badgeClass">{{ label }}</span>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  status: {
    type: String,
    required: true
  }
})

const statusMap = {
  待指派: { label: '待指派', cls: 'bg-secondary' },
  已指派: { label: '已指派', cls: 'bg-primary' },
  進行中: { label: '進行中', cls: 'bg-warning text-dark' },
  已完成: { label: '已完成', cls: 'bg-success' },
  取消: { label: '取消', cls: 'bg-danger' },
  // English variants
  pending: { label: '待指派', cls: 'bg-secondary' },
  assigned: { label: '已指派', cls: 'bg-primary' },
  in_progress: { label: '進行中', cls: 'bg-warning text-dark' },
  completed: { label: '已完成', cls: 'bg-success' },
  cancelled: { label: '取消', cls: 'bg-danger' },
  // Driver/vehicle status
  active: { label: '在職', cls: 'bg-success' },
  inactive: { label: '停用', cls: 'bg-secondary' },
  on_leave: { label: '休假', cls: 'bg-info text-dark' },
  available: { label: '可用', cls: 'bg-success' },
  in_use: { label: '使用中', cls: 'bg-warning text-dark' },
  maintenance: { label: '維修中', cls: 'bg-danger' }
}

const info = computed(() => statusMap[props.status] ?? { label: props.status, cls: 'bg-secondary' })
const badgeClass = computed(() => info.value.cls)
const label = computed(() => info.value.label)
</script>
