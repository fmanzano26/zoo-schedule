import MonthCalendar from "@/components/MonthCalendar";

export default function Page() {
  return (
    <main className="min-h-screen bg-neutral-950 text-gray-100">
      <div className="mx-auto w-full max-w-6xl px-4 pb-10">
        <MonthCalendar />
      </div>
    </main>
  );
}
