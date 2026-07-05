import Link from "next/link";

export function Nav() {
  return (
    <nav className="border-b bg-white px-8 py-4">
      <div className="flex gap-6">
        <Link href="/" className="font-bold">RPOS Studio</Link>
        <Link href="/dashboard">Dashboard</Link>
        <Link href="/keywords">Keywords</Link>
        <Link href="/articles">Articles</Link>
      </div>
    </nav>
  );
}
