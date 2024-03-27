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
      <div className="grid grid-cols-5 gap-x-10">
        <div>
          <label className="label cursor-pointer">
            <span className="label-text">1 Day</span>
            <input
              type="radio"
              name="programLength"
              className="radio checked:bg-primary"
              checked={programLength === '1 Day'}
              onChange={() => setProgramLength('1 Day')}
            />
          </label>
        </div>
        <div>
          <label className="label cursor-pointer">
            <span className="label-text">2 Weeks</span>
            <input
              type="radio"
              name="programLength"
              className="radio checked:bg-primary"
              checked={programLength === '2 Weeks'}
              onChange={() => setProgramLength('2 Weeks')}
            />
          </label>
        </div>
        <div>
          <label className="label cursor-pointer">
            <span className="label-text">4 Weeks</span>
            <input
              type="radio"
              name="programLength"
              className="radio checked:bg-primary"
              checked={programLength === '4 Weeks'}
              onChange={() => setProgramLength('4 Weeks')}
            />
          </label>
        </div>
        <div>
          <label className="label cursor-pointer">
            <span className="label-text">6 Weeks</span>
            <input
              type="radio"
              name="programLength"
              className="radio checked:bg-primary"
              checked={programLength === '6 Weeks'}
              onChange={() => setProgramLength('6 Weeks')}
            />
          </label>
        </div>
        <div>
          <label className="label cursor-pointer">
            <span className="label-text">8 Weeks</span>
            <input
              type="radio"
              name="programLength"
              className="radio checked:bg-primary"
              checked={programLength === '8 Weeks'}
              onChange={() => setProgramLength('8 Weeks')}
            />
          </label>
        </div>
      </div>
    </div>
  );
}
