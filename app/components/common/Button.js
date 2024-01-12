export default function Button({ text, icon, color = 'orange', onClick }) {
  return (
    <button
      onClick={onClick}
      class={`w-[113px] h-12 px-6 bg-${color}-500 rounded-md justify-center items-center gap-2 inline-flex`}
    >
      <div class="text-white text-lg font-semibold font-lato leading-7">
        {text}
      </div>
      <div class="w-4 h-4 relative">{icon}</div>
    </button>
  );
}
