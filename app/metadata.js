export const siteConfig = {
  name: 'HalteresAI',
  description: 'AI-Powered, Personalized Workouts for Fitness Professionals',
  url: 'https://halteres.ai',
  ogImage: '/favicon.ico',
  logo: '/images/logo.png',
  links: {
    twitter: 'https://twitter.com/halteresai',
    github: 'https://github.com/halteresai',
  },
};

export const metadata = {
  title: {
    default: 'HalteresAI - AI-Powered Fitness Programming',
    template: '%s | HalteresAI',
  },
  description:
    'Create personalized, AI-generated workout programs for your gym or clients. Save time and deliver better results with HalteresAI.',
  keywords: [
    'fitness programming',
    'AI workouts',
    'gym programming',
    'workout generator',
    'fitness AI',
    'personal trainer software',
    'gym management',
    'CrossFit programming',
  ],
  authors: [
    {
      name: 'HalteresAI Team',
      url: 'https://halteres.ai',
    },
  ],
  creator: 'HalteresAI',
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/favicon.ico',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://halteres.ai',
    title: 'HalteresAI - AI-Powered Fitness Programming',
    description:
      'Create personalized, AI-generated workout programs for your gym or clients. Save time and deliver better results with HalteresAI.',
    siteName: 'HalteresAI',
    images: [
      {
        url: '/favicon.ico',
        width: 48,
        height: 48,
        alt: 'HalteresAI - AI-Powered Fitness Programming',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'HalteresAI - AI-Powered Fitness Programming',
    description:
      'Create personalized, AI-generated workout programs for your gym or clients. Save time and deliver better results with HalteresAI.',
    images: ['/favicon.ico'],
    creator: '@halteresai',
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
};
