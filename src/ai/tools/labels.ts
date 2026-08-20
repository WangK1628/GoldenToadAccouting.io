export const TOOL_LABELS: Record<string, string> = {
  create_transaction: '记账',
  search_transactions: '查流水',
  get_period_summary: '汇总统计',
  get_category_breakdown: '分类分析',
  get_budget_status: '查预算',
  list_categories: '查分类',
  delete_transaction: '删流水',
}

export function toolStatusLabel(name: string): string {
  return TOOL_LABELS[name] ?? name
}
