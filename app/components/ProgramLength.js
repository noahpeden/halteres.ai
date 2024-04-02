import { InformationCircleIcon } from '@heroicons/react/24/outline';

export default function ProgramLength({ programLength, setProgramLength }) {
  return (
    <div className="my-6">
      <div className="flex">
        <h2 className="text-xl">How long will this program be?</h2>
        <div
          className="ml-[6px] tooltip tooltip-info cursor-pointer"
          data-tip="This determines how long the generated Program will be an how many workouts it will write for you."
        >
          <InformationCircleIcon className="h-6 w-6 text-gray-500" />
        </div>
      </div>
      <select
        value={programLength}
        onChange={(e) => setProgramLength(e.target.value)}
        className="select select-bordered w-full max-w-xs"
      >
        <option disabled selected>
          Select program length
        </option>
        {['1 Day', '6 days', '2 weeks', '6 weeks', '8 weeks'].map(
          (length, index) => (
            <option key={index} value={length}>
              {length}
            </option>
          )
        )}
      </select>
    </div>
  );
}
