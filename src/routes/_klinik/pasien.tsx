import { createFileRoute } from "@tanstack/react-router";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/lib/utils";
import { patients } from "@/web";

export const Route = createFileRoute("/_klinik/pasien")({
  head: () => ({ meta: [{ title: "Pasien" }] }),
  loader: () => patients(),
  component: Pasien,
});

function Pasien() {
  const rows = Route.useLoaderData();
  // A Role that may see no visit records gets no empty column for them.
  const showsVisits = rows.some((row) => row.lastVisit);

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>No RM</TableHead>
          <TableHead>Nama</TableHead>
          <TableHead>NIK</TableHead>
          <TableHead>HP</TableHead>
          <TableHead>Dokter</TableHead>
          {showsVisits && <TableHead>Kunjungan terakhir</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.noRm} className="align-top">
            <TableCell className="font-mono">{row.noRm}</TableCell>
            <TableCell>{row.name}</TableCell>
            <TableCell className="font-mono">{row.nik}</TableCell>
            <TableCell className="font-mono">{row.phone}</TableCell>
            <TableCell>{row.dentist}</TableCell>
            {showsVisits && (
              <TableCell className="min-w-72 whitespace-normal">
                {row.lastVisit && (
                  <>
                    <span className="text-muted-foreground">{formatDate(row.lastVisit.on)}</span>{" "}
                    {row.lastVisit.notes}
                  </>
                )}
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
