import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: '小红书 Markdown 自动排版工具',
  description: '将 Markdown 长文本自动排版为 3:4 的有序图片，支持在线编辑、预览、微调，并一键导出到 iPhone 相册或电脑 ZIP。',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh">
      <body className={inter.className}>
        <main className="min-h-screen bg-gray-50">
          {children}
        </main>
      </body>
    </html>
  )
} 