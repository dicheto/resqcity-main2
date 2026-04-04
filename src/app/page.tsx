import type { Metadata } from 'next'
import HomePage from '@/components/HomePage'

export const metadata: Metadata = {
  title: 'Начало — ResQ София',
  description: 'Подай сигнал за проблем в квартала за 60 секунди. Интерактивна карта, live статистики и проследяване на статуса до решаване — ResQ София.',
  keywords: ['градски проблеми', 'сигнали', 'София', 'докладване', 'карта', 'община', 'граждани'],
  openGraph: {
    title: 'ResQ София — сигнали и карта на живо',
    description: 'Платформа за докладване на градски проблеми с интерактивна карта и проследяване в реално време.',
    images: ['/og-image.jpg'],
  },
}

export default function Page() {
  return <HomePage />
}
