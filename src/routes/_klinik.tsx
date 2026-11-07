import { createFileRoute, Link, Outlet, redirect } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { me } from "@/web";

// Convenience only: every server function checks the session again.
export const Route = createFileRoute("/_klinik")({
  beforeLoad: async () => {
    const staff = await me();
    if (!staff) throw redirect({ to: "/", hash: "demo-login" });
    return { staff };
  },
  component: Klinik,
});

const views = [
  { to: "/pasien", label: "Pasien" },
  { to: "/jadwal", label: "Jadwal" },
  { to: "/stok", label: "Stok" },
  { to: "/aset", label: "Aset" },
  { to: "/jejak-audit", label: "Jejak Audit" },
] as const;

function Klinik() {
  const { staff } = Route.useRouteContext();

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6">
      <header className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b py-3 text-sm">
        <nav className="flex gap-1">
          {views.map((view) => (
            <Link
              key={view.to}
              to={view.to}
              className="rounded-md px-2.5 py-1.5 text-muted-foreground hover:text-foreground"
              activeProps={{ className: "bg-secondary text-foreground" }}
            >
              {view.label}
            </Link>
          ))}
        </nav>
        <form method="post" action="/keluar" className="ml-auto flex items-center gap-3">
          <span>
            {staff.name} <span className="text-muted-foreground">{staff.role}</span>
          </span>
          <Button type="submit" variant="ghost" size="sm">
            Keluar
          </Button>
        </form>
      </header>
      <main className="py-6">
        <Outlet />
      </main>
    </div>
  );
}
