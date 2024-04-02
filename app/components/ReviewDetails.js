export default function ReviewDetails({ office, whiteboard }) {
  return (
    <div className="review-details">
      <div className="drawer">
        <input id="my-drawer" type="checkbox" className="drawer-toggle" />
        <div className="drawer-content flex flex-col items-center justify-start">
          <label
            htmlFor="my-drawer"
            className="btn btn-secondary text-white my-4"
          >
            Review Details
          </label>
        </div>
        <div className="drawer-side">
          <label
            htmlFor="my-drawer"
            aria-label="close sidebar"
            className="drawer-overlay"
          ></label>
          <ul className="menu p-4 overflow-y-auto min-h-full bg-white w-80 text-base-content pt-[7rem]">
            <li className="py-2">
              <div className="font-semibold">Equipment</div>
              <ul className="pl-4">
                {office?.equipmentList?.map((item, index) => (
                  <li key={index} className="py-1">
                    <div className="flex items-center justify-between bg-base-100 p-2 rounded">
                      <span>{item}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </li>
            <li className="py-2">
              <div className="font-semibold">Coaches</div>
              <ul className="pl-4">
                {office?.coachList?.map((coach, index) => (
                  <li key={index} className="py-1">
                    <div className="flex items-center justify-between bg-base-100 p-2 rounded">
                      <span>
                        {coach.name} - {coach.experience}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </li>
            <li className="py-2">
              <div className="font-semibold">Schedule:</div>
              <ul className="pl-4">
                {office.classSchedule.map((day) => (
                  <li key={day} className="py-1">
                    <div className="flex items-center justify-between bg-base-100 p-2 rounded">
                      {day}
                    </div>
                  </li>
                ))}
              </ul>
            </li>
            <li className="py-2">
              <div className="font-semibold">Duration</div>
              <div className="bg-base-100 p-2 rounded">
                {office.classDuration}
              </div>
            </li>

            <li className="menu-title">
              <span className="text-lg font-bold">Workout Details</span>
            </li>
            <li className="py-2">
              <div className="font-semibold">Program Length</div>
              <div className="bg-base-100 p-2 rounded">
                {whiteboard.programLength}
              </div>
            </li>
            <li className="py-2">
              <div className="font-semibold">Format</div>
              <div className="bg-base-100 p-2 rounded">
                {whiteboard.workoutFormat}
              </div>
            </li>
            <li className="py-2">
              <div className="font-semibold">Focus</div>
              <div className="bg-base-100 p-2 rounded">{whiteboard.focus}</div>
            </li>
            <li className="py-2">
              <div className="font-semibold">Example Workout</div>
              <div className="bg-base-100 p-2 rounded">
                {whiteboard.exampleWorkout}
              </div>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
