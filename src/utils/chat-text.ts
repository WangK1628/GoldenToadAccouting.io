/** 助手消息展示：保留换行，把挤在一行的「 - 标签」拆成多行 */
export function formatAssistantText(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\s+-\s+(?=\*\*|[\u4e00-\u9fff])/g, '\n')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .trim()
}
