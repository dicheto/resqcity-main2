import type { Metadata } from 'next'
import HomePage from '@/components/HomePage'

export const metadata: Metadata = {
  title: 'Начало',
  description: 'Добре дошли в ResQCity - платформата за докладване и управление на градски проблеми в Благоевград. Докладвайте проблеми, следете статуса и вижте интерактивната карта.',
  keywords: ['градски проблеми', 'сигнали', 'Благоевград', 'докладване', 'карта', 'комунални услуги'],
  openGraph: {
    title: 'ResQCity - Управление на градски проблеми',
    description: 'Докладвайте проблеми в града и следете тяхното решаване в реално време.',
    images: ['/og-image.jpg'],
  },
}

export default function Page() {
  return <HomePage />
}
