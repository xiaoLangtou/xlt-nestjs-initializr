<script setup lang="ts">
import { computed } from 'vue';
import { ModuleId } from '@nestjs-initializr/generator';
import { DB_TYPES, MODULES } from '@/data/modules';
import { useProjectConfigStore } from '@/stores/projectConfig';

const store = useProjectConfigStore();

const needDb = computed(
  () => store.state.modules.has(ModuleId.TypeORM) || store.state.modules.has(ModuleId.Prisma),
);

const dbOwner = computed(() =>
  store.state.modules.has(ModuleId.TypeORM) ? 'TypeORM' : 'Prisma',
);

function moduleClass(id: ModuleId): string {
  const isActive = store.state.modules.has(id);
  const isAuto = store.state.autoModules.has(id) && !isActive;
  const isConflict = store.isConflict(id) && !isActive;
  return [
    'module-card',
    isActive && 'active',
    isAuto && 'auto-added',
    isConflict && 'conflict',
  ]
    .filter(Boolean)
    .join(' ');
}
</script>

<template>
  <div class="config-card">
    <div class="card-header">
      <div class="card-header-icon" style="background: var(--blue-soft); color: var(--blue)">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="3" width="7" height="7" />
          <rect x="14" y="3" width="7" height="7" />
          <rect x="3" y="14" width="7" height="7" />
          <rect x="14" y="14" width="7" height="7" />
        </svg>
      </div>
      <h3>功能模块</h3>
      <span class="card-desc">选择需要集成的模块</span>
    </div>
    <div class="card-body">
      <div class="module-grid">
        <div
          v-for="m in MODULES"
          :key="m.id"
          :class="moduleClass(m.id)"
          @click="store.toggleModule(m.id)"
        >
          <span
            v-if="store.state.autoModules.has(m.id) && !store.state.modules.has(m.id)"
            class="mc-auto-tag"
          >auto</span>
          <span
            v-else-if="store.isConflict(m.id) && !store.state.modules.has(m.id)"
            class="mc-conflict-tag"
          >互斥</span>
          <div
            v-if="store.state.modules.has(m.id)"
            class="mc-check-indicator"
            :title="`点击移除 ${m.name}`"
          >
            <svg class="ic-check" viewBox="0 0 24 24">
              <polyline points="20 6 9 17 4 12" fill="none" stroke="white" stroke-width="3" />
            </svg>
            <svg class="ic-x" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round">
              <line x1="6" y1="6" x2="18" y2="18" />
              <line x1="18" y1="6" x2="6" y2="18" />
            </svg>
          </div>
          <div class="mc-top">
            <div class="mc-icon" :style="{ background: m.bg, color: m.color }">{{ m.icon }}</div>
            <span class="mc-name">{{ m.name }}</span>
          </div>
          <div class="mc-desc">{{ m.desc }}</div>
        </div>
      </div>

      <div v-if="needDb" class="db-section">
        <div class="select-label">
          数据库类型 <span class="dep-tag">{{ dbOwner }} 需要</span>
        </div>
        <div class="select-cards cols-3">
          <div
            v-for="db in DB_TYPES"
            :key="db.id"
            class="select-card"
            :class="{ active: store.state.databaseType === db.id }"
            @click="store.setDatabaseType(db.id)"
          >
            <div class="sc-radio" />
            <div class="sc-info">
              <div class="sc-name">{{ db.icon }} {{ db.name }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
