<script setup lang="ts">
import { onMounted, ref } from 'vue'
import PageHeader from '@/components/layout/PageHeader.vue'
import BottomSheet from '@/components/sheet/BottomSheet.vue'
import { useToast } from '@/composables/useToast'
import { useAppStore } from '@/stores/app.store'
import { useUiStore } from '@/stores/ui.store'
import { exportService, importService } from '@/services'
import type { ExportFormat } from '@/models/export'
import type { ImportResult } from '@/models/export'

const appStore = useAppStore()
const uiStore = useUiStore()
const toast = useToast()

const exporting = ref(false)
const importing = ref(false)
const clearOpen = ref(false)
const clearConfirm = ref('')
const lastResult = ref<ImportResult | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)

onMounted(async () => {
  await appStore.initialize()
})

const exportOptions: Array<{ format: ExportFormat; label: string; desc: string }> = [
  { format: 'json', label: 'JSON', desc: '完整备份' },
  { format: 'csv', label: 'CSV', desc: 'Excel 可打开' },
  { format: 'xlsx', label: 'Excel', desc: '.xlsx 表格' },
  { format: 'txt', label: 'TXT', desc: '文本流水' },
]

async function onExport(format: ExportFormat) {
  if (!appStore.currentBook || exporting.value) return
  exporting.value = true
  try {
    await exportService.export(format, appStore.currentBook.id)
    toast.success('导出已开始下载')
  } catch (e) {
    toast.error(e instanceof Error ? e.message : '导出失败')
  } finally {
    exporting.value = false
  }
}

function pickImportFile() {
  fileInput.value?.click()
}

async function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file || !appStore.currentBook || importing.value) return

  importing.value = true
  lastResult.value = null
  try {
    const result = await importService.importFile(file, appStore.currentBook.id)
    lastResult.value = result
    uiStore.bumpData()
    await appStore.refreshBooks()
    if (result.imported > 0) {
      toast.success(`成功导入 ${result.imported} 笔`)
    } else {
      toast.error('没有导入任何流水')
    }
  } catch (e) {
    toast.error(e instanceof Error ? e.message : '导入失败')
  } finally {
    importing.value = false
  }
}

async function confirmClear() {
  if (clearConfirm.value !== '清空') {
    toast.error('请输入「清空」以确认')
    return
  }
  try {
    await importService.clearAllData()
    clearOpen.value = false
    clearConfirm.value = ''
    await appStore.refreshBooks()
    uiStore.bumpData()
    toast.success('数据已重置')
  } catch (e) {
    toast.error(e instanceof Error ? e.message : '清空失败')
  }
}
</script>

<template>
  <div class="data-page">
    <PageHeader title="数据管理" />

    <section class="panel">
      <h2>导出</h2>
      <p class="hint">导出当前账本「{{ appStore.currentBook?.name ?? '—' }}」的流水数据</p>
      <div class="btn-grid">
        <button
          v-for="opt in exportOptions"
          :key="opt.format"
          type="button"
          class="export-btn"
          :disabled="exporting || !appStore.currentBook"
          @click="onExport(opt.format)"
        >
          <span class="label">{{ opt.label }}</span>
          <span class="desc">{{ opt.desc }}</span>
        </button>
      </div>
    </section>

    <section class="panel">
      <h2>导入</h2>
      <p class="hint">支持 JSON 备份、CSV、TXT、Excel（.xlsx / .xls），导入到当前账本</p>
      <input
        ref="fileInput"
        type="file"
        accept=".json,.csv,.txt,.xlsx,.xls"
        class="hidden-input"
        @change="onFileChange"
      />
      <button
        type="button"
        class="primary-btn"
        :disabled="importing || !appStore.currentBook"
        @click="pickImportFile"
      >
        {{ importing ? '导入中…' : '选择文件导入' }}
      </button>
      <div v-if="lastResult" class="result">
        <p>导入 {{ lastResult.imported }} 笔，跳过 {{ lastResult.skipped }} 笔</p>
        <ul v-if="lastResult.errors.length">
          <li v-for="(err, i) in lastResult.errors.slice(0, 5)" :key="i">{{ err }}</li>
        </ul>
      </div>
    </section>

    <section class="panel danger">
      <h2>清空数据</h2>
      <p class="hint">删除所有账本与流水，恢复为初始演示数据。AI 设置与主题会保留。</p>
      <button type="button" class="danger-btn" @click="clearOpen = true">清空全部数据</button>
    </section>

    <BottomSheet :open="clearOpen" title="确认清空" @close="clearOpen = false">
      <p class="warn-text">此操作不可撤销，将删除所有账本、流水、分类与预算。</p>
      <label class="confirm-field">
        输入「清空」确认
        <input v-model="clearConfirm" type="text" autocomplete="off" placeholder="清空" />
      </label>
      <template #footer>
        <div class="sheet-actions">
          <button type="button" class="ghost-btn" @click="clearOpen = false">取消</button>
          <button type="button" class="danger-btn" @click="confirmClear">确认清空</button>
        </div>
      </template>
    </BottomSheet>
  </div>
</template>

<style scoped>
.panel {
  margin-bottom: 0.85rem;
  padding: 0.85rem;
  border-radius: 12px;
  background: var(--panel);
  border: 1px solid var(--line);
}

.panel.danger {
  border-color: #c0392b44;
}

.panel h2 {
  margin: 0 0 0.35rem;
  font-size: 0.92rem;
  font-weight: 600;
}

.hint {
  margin: 0 0 0.65rem;
  font-size: 0.78rem;
  color: var(--muted);
  line-height: 1.45;
}

.btn-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.45rem;
}

.export-btn {
  display: grid;
  gap: 0.15rem;
  padding: 0.7rem 0.75rem;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: var(--cream);
  text-align: left;
  cursor: pointer;
}

.export-btn:disabled {
  opacity: 0.55;
  cursor: default;
}

.export-btn .label {
  font-size: 0.92rem;
  font-weight: 600;
}

.export-btn .desc {
  font-size: 0.72rem;
  color: var(--muted);
}

.hidden-input {
  display: none;
}

.primary-btn {
  width: 100%;
  padding: 0.75rem;
  border: none;
  border-radius: 12px;
  background: var(--brand);
  color: #fff;
  font-size: 0.92rem;
  font-weight: 600;
  cursor: pointer;
}

.primary-btn:disabled {
  opacity: 0.6;
  cursor: default;
}

.result {
  margin-top: 0.65rem;
  padding: 0.55rem 0.65rem;
  border-radius: 10px;
  background: var(--cream);
  font-size: 0.78rem;
  color: var(--muted);
}

.result ul {
  margin: 0.35rem 0 0;
  padding-left: 1.1rem;
}

.danger-btn {
  width: 100%;
  padding: 0.75rem;
  border: none;
  border-radius: 12px;
  background: var(--expense);
  color: #fff;
  font-size: 0.92rem;
  font-weight: 600;
  cursor: pointer;
}

.warn-text {
  margin: 0 0 0.75rem;
  font-size: 0.85rem;
  color: var(--expense);
  line-height: 1.5;
}

.confirm-field {
  display: grid;
  gap: 0.35rem;
  font-size: 0.82rem;
  color: var(--muted);
}

.confirm-field input {
  padding: 0.6rem 0.75rem;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: var(--cream);
  color: var(--ink);
}

.sheet-actions {
  display: flex;
  gap: 0.5rem;
}

.ghost-btn {
  flex: 1;
  padding: 0.65rem;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: transparent;
  color: var(--muted);
  cursor: pointer;
}

.sheet-actions .danger-btn {
  flex: 1;
}
</style>
