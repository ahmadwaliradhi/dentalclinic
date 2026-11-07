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
import { aset } from "@/web";

export const Route = createFileRoute("/_klinik/aset")({
  head: () => ({ meta: [{ title: "Aset" }] }),
  loader: () => aset(),
  component: Aset,
});

const rupiah = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

function Aset() {
  const rows = Route.useLoaderData();
  // A Role that may not see finance gets no empty price column.
  const showsPrice = rows.some((row) => row.price !== null);

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Aset</TableHead>
          <TableHead>Dibeli</TableHead>
          {showsPrice && <TableHead className="text-right">Harga beli</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.name}>
            <TableCell>{row.name}</TableCell>
            <TableCell className="text-muted-foreground">{formatDate(row.boughtOn)}</TableCell>
            {showsPrice && (
              <TableCell className="text-right tabular-nums">
                {row.price !== null && rupiah.format(row.price)}
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
