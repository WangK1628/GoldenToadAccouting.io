import type { ToolDefinition } from '@/ai/providers/types'

export const AI_TOOLS: ToolDefinition[] = [
  {
    type: 'function',
    function: {
      name: 'create_transaction',
      description: '创建一条记账流水（支出或收入）',
      parameters: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['expense', 'income'], description: '流水类型' },
          amount_yuan: { type: 'number', description: '金额（元）' },
          category_name: { type: 'string', description: '一级分类名称，如「餐饮」' },
          subcategory_name: { type: 'string', description: '二级分类名称，如「午餐」，可选' },
          date: { type: 'string', description: '日期 YYYY-MM-DD，默认今天' },
          note: { type: 'string', description: '备注' },
          tags: {
            type: 'array',
            items: { type: 'string' },
            description: '标签名称列表',
          },
        },
        required: ['type', 'amount_yuan', 'category_name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_transactions',
      description: '查询流水记录，可按日期、类型、分类、备注搜索',
      parameters: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['expense', 'income'], description: '流水类型' },
          date_from: { type: 'string', description: '开始日期 YYYY-MM-DD' },
          date_to: { type: 'string', description: '结束日期 YYYY-MM-DD' },
          category_name: { type: 'string', description: '一级分类名称' },
          search: { type: 'string', description: '搜索备注关键词' },
          limit: { type: 'number', description: '返回条数，默认 10' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_period_summary',
      description: '获取某段时间的总支出、总收入、结余与笔数',
      parameters: {
        type: 'object',
        properties: {
          date_from: { type: 'string', description: '开始日期 YYYY-MM-DD' },
          date_to: { type: 'string', description: '结束日期 YYYY-MM-DD' },
        },
        required: ['date_from', 'date_to'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_category_breakdown',
      description: '获取某段时间内按分类汇总的支出或收入排行',
      parameters: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['expense', 'income'], description: '统计类型' },
          date_from: { type: 'string', description: '开始日期 YYYY-MM-DD' },
          date_to: { type: 'string', description: '结束日期 YYYY-MM-DD' },
        },
        required: ['type', 'date_from', 'date_to'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_budget_status',
      description: '获取指定月份的预算使用情况',
      parameters: {
        type: 'object',
        properties: {
          year_month: { type: 'string', description: '月份 YYYY-MM，默认本月' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_categories',
      description: '列出当前账本可用的分类（含二级分类）',
      parameters: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['expense', 'income'], description: '分类类型' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'delete_transaction',
      description: '删除一条流水（需要 transaction_id）',
      parameters: {
        type: 'object',
        properties: {
          transaction_id: { type: 'string', description: '流水 ID' },
        },
        required: ['transaction_id'],
      },
    },
  },
]
