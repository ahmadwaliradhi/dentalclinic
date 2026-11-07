import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import type { Proposal } from "@/brain/proposals";
import { cn } from "@/lib/utils";
import { proposals } from "@/web";

export const Route = createFileRoute("/_klinik/persetujuan")({
  head: () => ({ meta: [{ title: "Persetujuan" }] }),
  loader: () => proposals(),
  component: Persetujuan,
});

function Persetujuan() {
  const rows = Route.useLoaderData();

  return (
    <ul className="divide-y">
      {rows.map((proposal) => (
        <li key={proposal.id} className="grid gap-2 py-4">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <span className="font-medium">{proposal.name}</span>
            {proposal.phone && (
              <span className="font-mono text-sm text-muted-foreground">{proposal.phone}</span>
            )}
            <div className="ml-auto flex gap-2">
              <Decision proposal={proposal} />
            </div>
          </div>
          <p
            className={cn(
              "max-w-prose text-sm",
              proposal.status !== "pending" && "text-muted-foreground",
            )}
          >
            {proposal.text}
          </p>
        </li>
      ))}
    </ul>
  );
}

const SETTLED = { accepted: "Diterima", declined: "Ditolak", expired: "Kedaluwarsa" };

function Decision({ proposal }: { proposal: Proposal }) {
  if (proposal.whatsapp) {
    return (
      <Button asChild size="sm">
        <a href={proposal.whatsapp} target="_blank" rel="noreferrer">
          Kirim di WhatsApp
        </a>
      </Button>
    );
  }
  if (proposal.status !== "pending") {
    return <span className="text-sm text-muted-foreground">{SETTLED[proposal.status]}</span>;
  }
  return (
    <form method="post" action={`/persetujuan/${proposal.id}`} className="flex gap-2">
      <Button type="submit" name="decision" value="declined" variant="ghost" size="sm">
        Tolak
      </Button>
      <Button type="submit" name="decision" value="accepted" size="sm">
        Terima
      </Button>
    </form>
  );
}
