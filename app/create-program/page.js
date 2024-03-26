import Metcon from '@/components/Metcon';
import Office from '@/components/Office';
import Whiteboard from '@/components/Whiteboard';

export default function CreateGym() {
  return (
    <div>
      <Office />
      <div className="p-40"></div>
      <Whiteboard />
      <div className="p-40"></div>
      <Metcon />
    </div>
  );
}
