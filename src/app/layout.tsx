import type { Metadata } from 'next';
import './globals.css';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import CookieConsent from '@/components/CookieConsent';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  title: {
    default: 'ZeroCloud - Zero-Store Peer-to-Peer Encrypted File Transfer',
    template: '%s | ZeroCloud',
  },
  description:
    'Send up to 10 GB directly peer-to-peer with AES-256-GCM end-to-end encryption. Files stream directly between devices and are never uploaded to any cloud server.',
  keywords: [
    'p2p file transfer',
    'webrtc file transfer',
    'large file sharing',
    '10gb file transfer',
    'encrypted file sharing',
    'zero-knowledge transfer',
    'peer to peer share',
  ],
  authors: [{ name: 'Akash' }],
  creator: 'Akash',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: '/',
    title: 'ZeroCloud - Direct Peer-to-Peer Encrypted Transfers Up to 10 GB',
    description:
      'Send large files directly from your browser to your recipient. Zero cloud uploads. End-to-end encrypted with AES-256-GCM.',
    siteName: 'ZeroCloud',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'ZeroCloud - Peer-to-Peer Encrypted File Transfer',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ZeroCloud - P2P Encrypted File Transfer Up to 10 GB',
    description:
      'Transfer files up to 10 GB directly between browsers. End-to-end encrypted. Zero servers involved.',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/manifest.json',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'ZeroCloud',
    url: 'https://zerocloud.app',
    applicationCategory: 'UtilityApplication',
    operatingSystem: 'All',
    description:
      'Direct peer-to-peer file transfer up to 10 GB with client-side AES-256-GCM encryption and zero cloud storage.',
    browserRequirements: 'Requires WebRTC and Web Crypto API support',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    author: {
      '@type': 'Person',
      name: 'Akash',
    },
  };

  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var theme = localStorage.getItem('zerocloud_theme');
                if (theme === 'light') {
                  document.documentElement.classList.remove('dark');
                } else {
                  document.documentElement.classList.add('dark');
                }
              } catch (_) {}
            `,
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 flex flex-col">{children}</main>
        <Footer />
        <CookieConsent />
      </body>
    </html>
  );
}
