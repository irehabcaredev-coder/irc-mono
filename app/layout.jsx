import './globals.css'
import { Providers } from './providers'

export const metadata = {
  title: 'eCare Plus - Audiology & Speech Care Network',
  description: 'Find verified audiologists and speech therapists near you',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}


