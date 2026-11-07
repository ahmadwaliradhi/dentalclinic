import { createFileRoute } from "@tanstack/react-router";
import { formatDay, formatTime } from "@/lib/utils";
import { schedule } from "@/web";

export const Route = createFileRoute("/_klinik/jadwal")({
  head: () => ({ meta: [{ title: "Jadwal" }] }),
  loader: () => schedule(),
  component: Jadwal,
});

function Jadwal() {
  const appointments = Route.useLoaderData();
  const days = new Map<string, typeof appointments>();
  for (const appointment of appointments) {
    const day = formatDay(appointment.startsAt);
    days.set(day, [...(days.get(day) ?? []), appointment]);
  }

  return (
    <div className="space-y-8">
      {[...days].map(([day, rows]) => (
        <section key={day}>
          <h2 className="mb-2 text-sm font-medium">{day}</h2>
          <ul className="divide-y border-y text-sm">
            {rows.map((row) => (
              <li key={row.startsAt + row.noRm} className="flex gap-4 py-2">
                <span className="w-12 font-mono text-muted-foreground">
                  {formatTime(row.startsAt)}
                </span>
                <span className="flex-1">
                  <span className="font-mono">{row.noRm}</span> {row.patient}
                </span>
                <span className="text-muted-foreground">{row.dentist}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
