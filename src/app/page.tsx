import { Nav } from "@/components/Nav";

export default function Home() {
  return (
    <>
      <Nav />
      <main className="p-8">
        <h1 className="text-3xl font-bold">RPOS Studio</h1>
        <p className="mt-3 text-slate-600">
          AI-assisted publishing operating system for rithm.info.
        </p>
      </main>
    </>
  );
}
