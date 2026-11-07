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
import { stock } from "@/web";

export const Route = createFileRoute("/_klinik/stok")({
  head: () => ({ meta: [{ title: "Stok" }] }),
  loader: () => stock(),
  component: Stok,
});

function Stok() {
  const rows = Route.useLoaderData();

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Barang</TableHead>
          <TableHead className="text-right">Jumlah</TableHead>
          <TableHead>Dihitung</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.item}>
            <TableCell>{row.item}</TableCell>
            <TableCell className="text-right tabular-nums">
              {row.quantity} {row.unit}
            </TableCell>
            <TableCell className="text-muted-foreground">{formatDate(row.countedAt)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
