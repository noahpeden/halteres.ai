export default function manifest() {
  return {
    name: 'Halteres AI',
    short_name: 'Halteres AI',
    description: 'AI-Powered Fitness Programming for Professionals',
    start_url: '/',
    display: 'standalone',
    background_color: '#152e56',
    theme_color: '#152e56',
    icons: [
      {
        src: '/icon.png',
        sizes: '32x32',
        type: 'image/png',
      },
      {
        src: '/apple-icon.png',
        sizes: '180x180',
        type: 'image/png',
      },
    ],
  };
}
