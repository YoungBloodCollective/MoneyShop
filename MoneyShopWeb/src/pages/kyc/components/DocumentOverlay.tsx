export default function DocumentOverlay() {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      <div
        className="relative w-[92%] max-w-lg aspect-[1.586/1] rounded-xl"
        style={{ boxShadow: "0 0 40px 2000px rgba(0,0,0,0.75)" }}
      >
        <div className="absolute inset-0 border border-white/20 rounded-xl" />

        <div className="absolute -top-0.5 -left-0.5 w-10 h-10 border-t-[3px] border-l-[3px] border-white rounded-tl-xl" />
        <div className="absolute -top-0.5 -right-0.5 w-10 h-10 border-t-[3px] border-r-[3px] border-white rounded-tr-xl" />
        <div className="absolute -bottom-0.5 -left-0.5 w-10 h-10 border-b-[3px] border-l-[3px] border-white rounded-bl-xl" />
        <div className="absolute -bottom-0.5 -right-0.5 w-10 h-10 border-b-[3px] border-r-[3px] border-white rounded-br-xl" />
      </div>
    </div>
  );
}
