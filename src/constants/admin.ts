export const ADMIN_ACCOUNT = {
  username: 'kevin',
  email: 'kevin@local',
  password: '0810',
  displayName: '管理员',
} as const

export function isAdminAccount(value: string): boolean {
  const key = value.trim().toLowerCase()
  return key === ADMIN_ACCOUNT.username || key === ADMIN_ACCOUNT.email
}
