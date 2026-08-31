import Link from "next/link";

export function PromoBanner({ text, link }: { text: string; link: string | null }) {
  const content = (
    <p className="w-full text-center text-sm font-medium py-2.5 px-4 bg-primary text-white truncate">
      {text}
    </p>
  );

  if (!link) return content;

  return (
    <Link href={link} className="block active:opacity-90 transition-opacity">
      {content}
    </Link>
  );
}
