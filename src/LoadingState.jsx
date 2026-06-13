export default function LoadingState({ lines = 4 }) {
  return (
    <div className="panel rounded-[24px] p-5">
      <div className="h-5 w-40 animate-pulse rounded-full bg-[#dfe8e3]" />
      <div className="mt-5 space-y-3">
        {Array.from({ length: lines }).map((_, index) => (
          <div key={index} className="h-12 animate-pulse rounded-2xl bg-[#edf5ef]" />
        ))}
      </div>
    </div>
  );
}
