export default function TextArea({ label, placeholder }) {
  return (
    <div class="w-[640px] h-[131px] flex-col justify-start items-start gap-1.5 inline-flex">
      <div class="self-stretch grow shrink basis-0 flex-col justify-start items-start gap-1.5 flex">
        <div class="text-slate-700 text-sm font-medium font-['Inter'] leading-tight">
          {label}
        </div>
        <div class="self-stretch grow shrink basis-0 px-3.5 py-3 bg-white rounded-lg shadow border border-gray-300 justify-start items-start gap-2 inline-flex">
          <div class="grow shrink basis-0 self-stretch text-gray-500 text-base font-normal font-['Inter'] leading-normal">
            {placeholder}
          </div>
        </div>
      </div>
    </div>
  );
}
