import { ImageResponse } from 'next/og';

export const runtime = 'edge';

// Define the type for the size object
export const size: { width: number; height: number } = {
  width: 32,
  height: 32,
};

// Define the type for the contentType string
export const contentType: string = 'image/png';

// The function returns an ImageResponse, no explicit : ImageResponse is needed here
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          width: '100%',
          height: '100%',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#152e56', // Consider using CSS variables for colors if applicable
          borderRadius: '16%',
        }}
      >
        {/* Simple SVG Cross */}
        <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
          <path d="M13.1992 3.73918V10.7329H20.0323V13.7518H13.1992V20.7455H10.1068V13.7518H3.27365V10.7329H10.1068V3.73918H13.1992Z" />
        </svg>
      </div>
    ),
    {
      // Use the defined size object
      ...size,
    }
  );
}
