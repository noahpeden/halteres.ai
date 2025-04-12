import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

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
          background: '#152e56',
          borderRadius: '22%',
        }}
      >
        <svg width="120" height="120" viewBox="0 0 24 24" fill="white">
          <path d="M13.1992 3.73918V10.7329H20.0323V13.7518H13.1992V20.7455H10.1068V13.7518H3.27365V10.7329H10.1068V3.73918H13.1992Z" />
        </svg>
      </div>
    ),
    { width: 180, height: 180 }
  );
}
