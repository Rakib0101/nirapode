import Link from "next/link";
import { Logo } from "@/components/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-muted flex flex-col">
      <header className="py-5 px-6">
        <Link href="/" className="inline-block">
          <Logo size="lg" />
        </Link>
      </header>

      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          {children}
        </div>
      </div>

      <footer className="py-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Nirapode Expatriate Platform
      </footer>
    </div>
  );
}
