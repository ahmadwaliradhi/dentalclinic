import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import type { Proposal } from "@/brain/proposals";
import { cn, formatDate, formatTime } from "@/lib/utils";
import { proposals } from "@/web";

export const Route = createFileRoute("/_klinik/persetujuan")({
  head: () => ({ meta: [{ title: "Persetujuan" }] }),
  loader: () => proposals(),
  component: Persetujuan,
});

const KIND = { recall_message: "Recall Message", stok_opname: "Stok Opname Request" };

function Persetujuan() {
  const rows = Route.useLoaderData();
  const pending = rows.filter((proposal) => proposal.status === "pending").length;

  return (
    <>
      <p className="text-sm text-muted-foreground">
        {pending
          ? `${pending} Proposal menunggu keputusan Anda. Tidak ada yang berjalan sebelum Anda terima.`
          : "Tidak ada Proposal yang menunggu keputusan Anda."}
      </p>
      <ul className="mt-4 space-y-3">
        {rows.map((proposal) => {
          const open = proposal.status === "pending";
          return (
            <li
              key={proposal.id}
              className={cn("rounded-xl border p-4 sm:p-5", open ? "bg-card" : "bg-transparent")}
            >
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="font-semibold">{proposal.name}</span>
                <span className="text-sm text-muted-foreground">{KIND[proposal.kind]}</span>
                {proposal.phone && (
                  <span className="text-sm text-muted-foreground tabular-nums">
                    {proposal.phone}
                  </span>
                )}
                <span
                  className={cn("ml-auto text-sm", open ? "text-pending" : "text-muted-foreground")}
                >
                  {open ? `Berlaku sampai ${when(proposal.expiresAt)}` : SETTLED[proposal.status]}
                </span>
              </div>
              <p
                className={cn(
                  "mt-3 max-w-prose text-sm",
                  // A Recall Message reads as the WhatsApp message it will become.
                  proposal.kind === "recall_message" &&
                    "rounded-[0.75rem_0.75rem_0.75rem_0.125rem] px-3.5 py-2.5",
                  proposal.kind === "recall_message" && (open ? "bg-bubble" : "bg-muted"),
                  !open && "text-muted-foreground",
                )}
              >
                {proposal.text}
              </p>
              <Decision proposal={proposal} />
            </li>
          );
        })}
      </ul>
    </>
  );
}

function when(iso: string) {
  return `${formatDate(iso)}, ${formatTime(iso)}`;
}

const SETTLED = {
  pending: "",
  accepted: "Diterima",
  declined: "Ditolak",
  expired: "Kedaluwarsa",
};

function Decision({ proposal }: { proposal: Proposal }) {
  if (proposal.whatsapp) {
    return (
      <div className="mt-3 flex justify-end">
        <Button asChild size="sm">
          <a href={proposal.whatsapp} target="_blank" rel="noreferrer">
            Kirim di WhatsApp
          </a>
        </Button>
      </div>
    );
  }
  if (proposal.status !== "pending") return null;
  return (
    <form
      method="post"
      action={`/persetujuan/${proposal.id}`}
      className="mt-3 flex justify-end gap-2"
    >
      <Button type="submit" name="decision" value="declined" variant="ghost" size="sm">
        Tolak
      </Button>
      <Button type="submit" name="decision" value="accepted" size="sm">
        Terima
      </Button>
    </form>
  );
}
