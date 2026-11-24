import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://nigamsetu.org';

  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/map', '/report', '/sign-in', '/sign-up'],
        disallow: ['/api/', '/dashboard', '/facility', '/admin/'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
