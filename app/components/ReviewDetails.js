export default function ReviewDetails({ office, whiteboard }) {
  return (
    <div className="review-details">
      <div className="drawer ">
        <input id="my-drawer" type="checkbox" className="drawer-toggle" />
        <div className="drawer-content">
          <label htmlFor="my-drawer" className="btn btn-primary drawer-button">
            Review Details
          </label>
        </div>
        <div className="drawer-side">
          <label
            htmlFor="my-drawer"
            aria-label="close sidebar"
            className="drawer-overlay"
          ></label>
          <div className="menu p-4 w-80 min-h-full bg-white text-base-content pt-40">
            <h3 className="text-lg font-semibold">Office Details</h3>
            <ul>
              <li>
                Equipment List:
                <ul>
                  {office?.equipmentList?.map((item, index) => (
                    <li key={index}>
                      {item.quantity}x {item.name}
                    </li>
                  ))}
                </ul>
              </li>
              <li>
                Coaching Staff:
                <ul>
                  {office?.coachList?.map((coach, index) => (
                    <li key={index}>
                      {coach.name} - {coach.experience}
                    </li>
                  ))}
                </ul>
              </li>
              <li>Class Schedule: {office.classSchedule}</li>
              <li>Class Duration: {office.classDuration}</li>
            </ul>
            <div>
              <h3 className="text-lg font-semibold">Whiteboard Details</h3>
              <ul>
                <li>Cycle Length: {whiteboard.cycleLength}</li>
                <li>Workout Format: {whiteboard.workoutFormat}</li>
                <li>Focus: {whiteboard.focus}</li>
                <li>Example Workout: {whiteboard.exampleWorkout}</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
