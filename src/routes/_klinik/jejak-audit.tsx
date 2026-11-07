import { createFileRoute } from "@tanstack/react-router";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn, formatDate, formatTime } from "@/lib/utils";
import { jejakAudit } from "@/web";

export const Route = createFileRoute("/_klinik/jejak-audit")({
  head: () => ({ meta: [{ title: "Jejak Audit" }] }),
  loader: () => jejakAudit(),
  component: JejakAudit,
});

const DECISION = {
  answered: "Dijawab",
  refusal: "Refusal",
  unknown_routed: "Tidak tahu",
  proposed: "Diusulkan",
  accepted: "Diterima",
  declined: "Ditolak",
};

function JejakAudit() {
  const { verified, rows } = Route.useLoaderData();
  // A Role that sees only its own rows gets no column repeating its name.
  const showsStaff = new Set(rows.map((row) => row.staff)).size > 1;

  return (
    <>
      <p
        className={cn(
          "mb-4 flex items-center gap-2 text-sm",
          verified ? "text-muted-foreground" : "text-destructive",
        )}
      >
        <span
          className={cn("size-2 rounded-full", verified ? "bg-emerald-500" : "bg-destructive")}
        />
        {verified ? "Rantai terverifikasi" : "Rantai rusak"}
      </p>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Waktu</TableHead>
            {showsStaff && <TableHead>Staf</TableHead>}
            <TableHead>Pertanyaan</TableHead>
            <TableHead>Hasil</TableHead>
            <TableHead>Sumber</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id} className="align-top">
              <TableCell className="text-muted-foreground tabular-nums">
                {formatDate(row.askedAt)} {formatTime(row.askedAt)}
              </TableCell>
              {showsStaff && <TableCell>{row.staff}</TableCell>}
              <TableCell className="min-w-56 whitespace-normal">{row.question}</TableCell>
              <TableCell className="min-w-40 whitespace-normal">
                {DECISION[row.decision]}
                {row.reason && (
                  <span className="ml-2 font-mono text-muted-foreground">{row.reason}</span>
                )}
                {row.flags.map((flag) => (
                  // A flag raised in a medical record is stored by its reference alone.
                  <p key={flag.uri + flag.text} title={flag.uri} className="mt-1 text-destructive">
                    {flag.text ? `“${flag.text}”` : flag.uri}
                  </p>
                ))}
              </TableCell>
              <TableCell className="font-mono text-muted-foreground">
                {row.cited.map((uri) => (
                  <div key={uri}>{uri}</div>
                ))}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  );
}
