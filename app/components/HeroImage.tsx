import Image from "next/image";

// Hero portrait: fixed 4:3 crop (900×675), rendered at 432px wide.
export default function HeroImage() {
  return (
    <div className="shrink-0">
      <Image
        src="/denys-4x3.jpg"
        alt="Denys"
        width={900}
        height={675}
        priority
        className="w-[432px] rounded-lg border border-zinc-400 object-cover shadow-sm"
      />
    </div>
  );
}
