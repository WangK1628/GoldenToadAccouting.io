<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import PageHeader from '@/components/layout/PageHeader.vue'
import { useAppStore } from '@/stores/app.store'
import { bookService } from '@/services'
import { useToast } from '@/composables/useToast'

const router = useRouter()
const appStore = useAppStore()
const toast = useToast()

const newName = ref('')
const newNote = ref('')

onMounted(async () => {
  await appStore.initialize()
})

async function selectBook(bookId: string) {
  try {
    await bookService.setCurrent(bookId)
    await appStore.refreshBooks()
    toast.success('已切换账本')
    router.push('/')
  } catch (e) {
    toast.error(e instanceof Error ? e.message : '切换失败')
  }
}

async function createBook() {
  if (!newName.value.trim()) return
  try {
    const book = await bookService.create(newName.value, newNote.value)
    await bookService.setCurrent(book.id)
    await appStore.refreshBooks()
    newName.value = ''
    newNote.value = ''
    toast.success('账本已创建')
    router.push('/')
  } catch (e) {
    toast.error(e instanceof Error ? e.message : '创建失败')
  }
}
</script>

<template>
  <div class="ledgers-page">
    <PageHeader title="账本" />

    <ul class="book-list">
      <li
        v-for="book in appStore.books"
        :key="book.id"
        :class="{ active: book.id === appStore.currentBook?.id }"
      >
        <button type="button" class="book-btn" @click="selectBook(book.id)">
          <strong>{{ book.name }}</strong>
          <span v-if="book.note" class="note">{{ book.note }}</span>
          <span v-if="book.id === appStore.currentBook?.id" class="badge">当前</span>
        </button>
      </li>
    </ul>

    <section class="add-box">
      <h3>新建账本</h3>
      <input v-model="newName" type="text" placeholder="账本名称" />
      <input v-model="newNote" type="text" placeholder="备注（可选）" />
      <button type="button" class="primary" @click="createBook">创建并切换</button>
    </section>
  </div>
</template>

<style scoped>
.book-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.45rem;
}

.book-list li {
  border-radius: 12px;
  border: 1px solid var(--line);
  background: var(--panel);
}

.book-list li.active {
  border-color: var(--brand);
  background: var(--accent-soft);
}

.book-btn {
  width: 100%;
  padding: 0.85rem;
  border: none;
  background: transparent;
  text-align: left;
  cursor: pointer;
}

.note {
  display: block;
  margin-top: 0.2rem;
  font-size: 0.78rem;
  color: var(--muted);
}

.badge {
  display: inline-block;
  margin-top: 0.35rem;
  padding: 0.15rem 0.45rem;
  border-radius: 999px;
  background: var(--brand);
  color: #fff;
  font-size: 0.68rem;
}

.add-box {
  margin-top: 1rem;
  padding: 0.85rem;
  border-radius: 12px;
  background: var(--cream);
  display: grid;
  gap: 0.45rem;
}

.add-box h3 {
  margin: 0;
  font-size: 0.82rem;
  color: var(--muted);
}

.add-box input {
  padding: 0.55rem 0.65rem;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: var(--panel);
}

.primary {
  padding: 0.65rem;
  border: none;
  border-radius: 10px;
  background: var(--brand);
  color: #fff;
  font-weight: 600;
  cursor: pointer;
}
</style>
