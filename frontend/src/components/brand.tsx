import Link from "next/link";
import { Sparkles } from "lucide-react";
export function Brand() {
  return (
    <Link href="/" className="brand" aria-label="AI Sana — главная">
      <span className="brand-icon">
        <Sparkles size={21} />
      </span>
      <span>
        AI <b>Sana</b>
        <small>CHALLENGE HUB</small>
      </span>
    </Link>
  );
}
