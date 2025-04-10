import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          fontSize: 60,
          color: 'white',
          background: 'linear-gradient(to bottom, #2563eb, #1e40af)',
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
          <svg width="120" height="120" viewBox="0 0 24 24" fill="white">
            <path d="M13 9h-3v2h3v3h2v-3h3v-2h-3V6h-2v3zm-9 2c0-4.97 4.03-9 9-9s9 4.03 9 9-4.03 9-9 9-9-4.03-9-9zm16 0c0-3.87-3.13-7-7-7s-7 3.13-7 7 3.13 7 7 7 7-3.13 7-7z" />
          </svg>
          <span style={{ marginLeft: 20 }}>HalteresAI</span>
        </div>
        <div
          style={{
            fontSize: 30,
            marginTop: 30,
            maxWidth: '80%',
          }}
        >
          AI-Powered Fitness Programming for Professionals
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
