'use client';
import Metcon from '@/components/Metcon';
import Office from '@/components/Office';
import Whiteboard from '@/components/Whiteboard';

export default function MetconLab() {
  return (
    <div>
      <div className="flex">
        <Office />
        <Whiteboard />
      </div>
      <Metcon />
    </div>
  );
}
