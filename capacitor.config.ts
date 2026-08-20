import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'io.goldentoad.accounting',
  appName: '金蝉记账',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
}

export default config
