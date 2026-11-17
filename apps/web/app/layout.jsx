import './globals.css'
import { Providers } from './providers'
import { BRAND_NAME } from '@/lib/brand'
import ErrorLoggerInit from '@/components/ErrorLoggerInit'
import Analytics from '@/components/Analytics'

export const metadata = {
  title: `${BRAND_NAME} - Audiology & Speech Care Network`,
  description: 'Find verified audiologists and speech therapists near you',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <ErrorLoggerInit />
        <Providers>{children}</Providers>
        <Analytics />
      </body>
    </html>
  )
}


