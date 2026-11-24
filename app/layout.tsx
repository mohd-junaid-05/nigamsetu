import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { ClerkProvider } from '@clerk/nextjs';
import { Suspense } from 'react';
import { ThemeProvider } from '@/components/theme/ThemeContext';
import { PWARegister } from '@/components/PWARegister';
import { AppHeader } from '@/components/shell/AppHeader';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://nigamsetu.org';

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#071D49' },
    { media: '(prefers-color-scheme: dark)', color: '#070b14' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'NigamSetu — AI Civic Fix & Municipal Verification Platform',
    template: '%s | NigamSetu',
  },
  description:
    'Official civic infrastructure defect tracking platform for Hyderabad municipal wards (GHMC). Report potholes, drainage blocks, and sanitation hazards with AI photographic verification and PostGIS spatial audit before closure.',
  applicationName: 'NigamSetu',
  authors: [{ name: 'GHMC Municipal Infrastructure & NigamSetu Engineering' }],
  generator: 'Next.js',
  keywords: [
    'NigamSetu',
    'Nigam Setu',
    'GHMC Hyderabad',
    'Hyderabad civic grievance',
    'pothole complaint hyderabad',
    'AI civic verification',
    'municipal infrastructure tracking',
    'swachh hyderabad',
    'drainage overflow complaint',
    'citizen grievance portal',
    'road defect fix tracker',
    'evidence based civic repairs',
  ],
  creator: 'NigamSetu',
  publisher: 'Greater Hyderabad Municipal Corporation (GHMC)',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  alternates: {
    canonical: siteUrl,
  },
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/icon.png?v=2', type: 'image/png', sizes: 'any' },
      { url: '/favicon-32x32.png?v=2', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16x16.png?v=2', sizes: '16x16', type: 'image/png' },
      { url: '/favicon.ico?v=2', sizes: 'any' },
      { url: '/icon-192.png?v=2', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png?v=2', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png?v=2', sizes: '180x180', type: 'image/png' },
    ],
    shortcut: ['/favicon.ico?v=2'],
  },
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    url: siteUrl,
    title: 'NigamSetu — AI Civic Fix & Municipal Verification Platform',
    description:
      'Official citizen grievance filing platform for Hyderabad municipal wards (GHMC). Report potholes, drainage blocks, and waste with AI photographic verification and PostGIS spatial audit before closure.',
    siteName: 'NigamSetu',
    images: [
      {
        url: '/images/og-image.png',
        width: 1200,
        height: 630,
        alt: 'NigamSetu — Official AI Civic Fix Platform Logo and Overview',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'NigamSetu — AI Civic Fix & Municipal Verification Platform',
    description:
      'Citizen grievance filing with AI-verified photographic evidence. Repairs undergo 4-point visual and spatial audit before closure across Hyderabad municipal wards.',
    images: ['/images/og-image.png'],
    creator: '@NigamSetu',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'NigamSetu',
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'GovernmentOrganization',
      '@id': `${siteUrl}/#organization`,
      name: 'NigamSetu - Greater Hyderabad Municipal Corporation (GHMC) Redressal Portal',
      url: siteUrl,
      logo: `${siteUrl}/images/logo.png`,
      image: `${siteUrl}/images/og-image.png`,
      description:
        'AI-verified municipal civic grievance redressal and spatial audit platform for Greater Hyderabad Municipal Corporation (GHMC).',
      areaServed: {
        '@type': 'City',
        name: 'Hyderabad',
      },
    },
    {
      '@type': 'WebSite',
      '@id': `${siteUrl}/#website`,
      url: siteUrl,
      name: 'NigamSetu',
      publisher: {
        '@id': `${siteUrl}/#organization`,
      },
      potentialAction: {
        '@type': 'SearchAction',
        target: `${siteUrl}/map?q={search_term_string}`,
        'query-input': 'required name=search_term_string',
      },
    },
    {
      '@type': 'GovernmentService',
      '@id': `${siteUrl}/#service`,
      name: 'Civic Infrastructure Defect Reporting & AI Verification Service',
      serviceType: 'Public Infrastructure Maintenance & Grievance Redressal',
      provider: {
        '@id': `${siteUrl}/#organization`,
      },
      areaServed: {
        '@type': 'AdministrativeArea',
        name: 'Hyderabad Municipal Wards (GHMC)',
      },
      url: `${siteUrl}/report`,
      description:
        'Citizen platform for reporting road potholes, sanitation hazards, waterlogging, and public infrastructure defects with camera GPS verification and automated SLA tracking.',
    },
  ],
};

const themeInitScript = `
(function() {
  try {
    var stored = localStorage.getItem('nigamsetu-theme');
    var theme = stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system';
    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    var isDark = theme === 'dark' || (theme === 'system' && prefersDark);
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    document.documentElement.setAttribute('data-theme', theme);
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <link rel="icon" href="/icon.png?v=2" type="image/png" sizes="any" />
        <link rel="icon" href="/favicon-32x32.png?v=2" type="image/png" sizes="32x32" />
        <link rel="icon" href="/favicon-16x16.png?v=2" type="image/png" sizes="16x16" />
        <link rel="shortcut icon" href="/favicon.ico?v=2" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png?v=2" sizes="180x180" />
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground transition-colors duration-150">
        <ClerkProvider>
          <ThemeProvider>
            <PWARegister />
            <Suspense fallback={<div className="h-16 border-b border-border bg-surface-card" />}>
              <AppHeader />
            </Suspense>
            <main className="flex-1 flex flex-col">{children}</main>
          </ThemeProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
