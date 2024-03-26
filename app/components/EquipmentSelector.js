'use client';
import equipmentList from '@/utils/equipmentList';

function EquipmentSelector({ selected, setSelected }) {
  return (
    <div className="flex flex-wrap w-full">
      <button
        className="btn btn-primary text-white"
        onClick={() => document.getElementById('my_modal_4').showModal()}
      >
        Configure Equipment
      </button>
      <dialog id="my_modal_4" className="modal">
        <div className="modal-box w-11/12 max-w-5xl">
          <h3 className="font-bold text-lg">Configure your gym</h3>
          <p className="py-4">
            Select the equipment your gym has to add it as a reference for
            HalteresAI to use when writing your program.
          </p>

          <div className="form-control">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {equipmentList.map((equipment) => {
                return (
                  <label
                    className="label cursor-pointer px-6"
                    key={equipment.value}
                  >
                    <span className="label-text">{equipment.label}</span>
                    <input
                      type="checkbox"
                      checked={selected.includes(equipment.label)}
                      className="checkbox checkbox-primary"
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelected([...selected, equipment.label]);
                        } else {
                          setSelected(
                            selected.filter((item) => item !== equipment.label)
                          );
                        }
                      }}
                    />
                  </label>
                );
              })}
            </div>
          </div>
          <div className="modal-action">
            <button
              onClick={() => document.getElementById('my_modal_4').close()}
              className="btn btn-accent text-white"
            >
              Save & Close
            </button>
          </div>
        </div>
      </dialog>
    </div>
  );
}

export default EquipmentSelector;
