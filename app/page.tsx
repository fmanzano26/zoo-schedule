
'use client';
import MonthCalendar from "@/components/MonthCalendar";

export default function Page(){
  return (
    <div className="min-h-screen bg-neutral-950 text-gray-100">
      <div className="container pb-10">
        <main className="mt-4">
          <MonthCalendar />
        </main>
      </div>
    </div>
  );
}
