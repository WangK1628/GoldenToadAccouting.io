import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useUiStore = defineStore('ui', () => {
  const dataVersion = ref(0)
  const recordSheetOpen = ref(false)
  const editingTransactionId = ref<string | null>(null)

  function bumpData() {
    dataVersion.value += 1
  }

  function openCreateRecord() {
    editingTransactionId.value = null
    recordSheetOpen.value = true
  }

  function openEditRecord(transactionId: string) {
    editingTransactionId.value = transactionId
    recordSheetOpen.value = true
  }

  function closeRecordSheet() {
    recordSheetOpen.value = false
    editingTransactionId.value = null
  }

  return {
    dataVersion,
    recordSheetOpen,
    editingTransactionId,
    bumpData,
    openCreateRecord,
    openEditRecord,
    closeRecordSheet,
  }
})
