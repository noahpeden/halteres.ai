export default function Sidebar() {
  return (
    <div class="w-[175px] h-[982px] bg-white bg-opacity-70 backdrop-blur-md justify-start items-start inline-flex">
      <div class="h-[918px] px-4 py-8 flex-col justify-between items-center inline-flex">
        <div class="flex-col justify-start items-start flex">
          <div class="self-stretch h-[100px] opacity-60 justify-start items-start gap-3 inline-flex">
            <div class="self-stretch pb-1 flex-col justify-start items-center gap-1 inline-flex">
              <div class="w-12 h-12 p-3 bg-white rounded-[10px] shadow border border-gray-200 justify-center items-center inline-flex">
                <div class="w-6 h-6 relative flex-col justify-start items-start flex"></div>
              </div>
              <div class="w-0.5 grow shrink basis-0 bg-gray-200 rounded-sm"></div>
            </div>
            <div class="h-[68px] pt-1 pb-6 flex-col justify-center items-start inline-flex">
              <div class="self-stretch text-slate-700 text-sm font-semibold font-['Inter'] leading-tight">
                Office
              </div>
            </div>
          </div>
          <div class="self-stretch h-[100px] opacity-60 justify-start items-start gap-3 inline-flex">
            <div class="self-stretch pb-1 flex-col justify-start items-center gap-1 inline-flex">
              <div class="w-12 h-12 p-3 bg-white rounded-[10px] shadow border border-gray-200 justify-center items-center inline-flex">
                <div class="w-6 h-6 relative flex-col justify-start items-start flex"></div>
              </div>
              <div class="w-0.5 grow shrink basis-0 bg-gray-200 rounded-sm"></div>
            </div>
            <div class="h-[68px] pt-1 pb-6 flex-col justify-center items-start inline-flex">
              <div class="text-slate-700 text-sm font-semibold font-['Inter'] leading-tight">
                Whiteboard
              </div>
            </div>
          </div>
          <div class="self-stretch h-[100px] opacity-60 justify-start items-start gap-3 inline-flex">
            <div class="self-stretch pb-1 flex-col justify-start items-center gap-1 inline-flex">
              <div class="w-12 h-12 p-3 bg-white rounded-[10px] shadow border border-gray-200 justify-center items-center inline-flex">
                <div class="w-6 h-6 relative flex-col justify-start items-start flex"></div>
              </div>
            </div>
            <div class="h-[68px] pt-1 pb-6 flex-col justify-center items-start inline-flex">
              <div class="self-stretch text-slate-700 text-sm font-semibold font-['Inter'] leading-tight">
                Metcon
              </div>
            </div>
          </div>
        </div>
        <div class="w-12 h-12 bg-slate-400 rounded-full justify-center items-center gap-2.5 inline-flex">
          <img class="w-8 h-[38px]" src="https://via.placeholder.com/32x38" />
          <div class="w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
        </div>
      </div>
      <div class="w-[3px] h-[982px] bg-slate-100 flex-col justify-start items-start gap-2.5 inline-flex">
        <div class="w-1 h-px bg-blue-500"></div>
      </div>
    </div>
  );
}
