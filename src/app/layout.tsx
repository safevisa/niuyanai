import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '牛眼AI — 专业AI股票分析平台',
  description: '基于AI深度分析的A股投资参考工具，提供五维评分、买卖点识别、套牢解套路径分析。投资有风险，仅供参考。',
  keywords: ['AI股票分析', '牛眼AI', 'A股分析', '买卖点', '套牢分析', '股票评分'],
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
