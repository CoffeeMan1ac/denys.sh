import Image from "next/image";

// Hero portrait: fixed 4:3 crop (900×675). Full width when the hero stacks on
// small screens, 432px beside the intro from md up.
export default function HeroImage() {
  return (
    <div className="w-full shrink-0 md:w-auto">
      <Image
        src="/denys-4x3.jpg"
        alt="Denys"
        width={900}
        height={675}
        priority
        sizes="(min-width: 768px) 432px, 100vw"
        className="w-full rounded-lg border border-zinc-400 object-cover shadow-sm md:w-[432px] dark:border-zinc-600"
      />
    </div>
  );
}
