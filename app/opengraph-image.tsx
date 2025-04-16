import { ImageResponse } from 'next/og';

export const runtime = 'edge';

// Define the type for the size object
export const size: { width: number; height: number } = {
  width: 1200,
  height: 630,
};

// Define the type for the contentType string
export const contentType: string = 'image/png';

// The function returns an ImageResponse
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          fontSize: 60,
          color: 'white',
          background: 'linear-gradient(to bottom, #2563eb, #1e40af)', // Consider CSS variables or Tailwind classes if possible
          width: '100%',
          height: '100%',
          paddingTop: 50,
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          textAlign: 'center',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {/* You might want to use a more specific logo SVG or image here */}
          <svg width="120" height="120" viewBox="0 0 24 24" fill="white">
            {/* This SVG seems to be a generic "add" icon, consider replacing with your actual logo */}
            <path d="M13 9h-3v2h3v3h2v-3h3v-2h-3V6h-2v3zm-9 2c0-4.97 4.03-9 9-9s9 4.03 9 9-4.03 9-9 9-9-4.03-9-9zm16 0c0-3.87-3.13-7-7-7s-7 3.13-7 7 3.13 7 7 7 7-3.13 7-7z" />
          </svg>
          <span style={{ marginLeft: 20, fontWeight: 600 }}>HalteresAI</span>{' '}
          {/* Added font weight */}
        </div>
        <div
          style={{
            fontSize: 30,
            marginTop: 30,
            maxWidth: '80%',
            lineHeight: 1.4, // Improved line height
          }}
        >
          AI-Powered Fitness Programming for Professionals
        </div>
      </div>
    ),
    {
      // Use the defined size object
      ...size,
      // You could potentially load fonts here if needed
      // fonts: [...],
    }
  );
}
