export default function Coaches({
  handleAddCoach,
  newCoachName,
  setNewCoachName,
  newCoachExperience,
  setNewCoachExperience,
  coachList,
  removeCoach,
}) {
  return (
    <section>
      <h2 className="text-xl mb-4">Coaching Staff</h2>
      <div className="flex align-center justify-evenly mb-4 space-x-4">
        <input
          type="text"
          className="input input-info input-bordered w-full"
          value={newCoachName}
          onChange={(e) => setNewCoachName(e.target.value)}
          placeholder="Coach name"
        />
        <input
          type="text"
          className="input input-info input-bordered w-full"
          value={newCoachExperience}
          onChange={(e) => setNewCoachExperience(e.target.value)}
          placeholder="Experience"
        />

        <button
          type="button"
          className="btn btn-primary text-white"
          onClick={handleAddCoach}
        >
          Add Coach
        </button>
      </div>
      <div className="flex flex-col gap-2 space-y-2">
        {coachList.map((coach, index) => (
          <div key={index} className="flex gap-2 items-center space-x-2">
            <input
              type="text"
              className="input input-info input-bordered flex-1"
              value={coach.name}
              readOnly
            />
            <input
              type="text"
              className="input input-info input-bordered flex-1"
              value={coach.experience}
              readOnly
            />
            <button
              type="button"
              className="btn btn-error  text-white"
              onClick={() => removeCoach(index)}
            >
              X
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
