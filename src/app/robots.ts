import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://zerocloud.app';

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/send', '/receive', '/thank-you', '/ws', '/signaling'],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
