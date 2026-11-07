import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { confirmPairing, unpair } from "@/brain/pairing";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/lib/utils";
import { signedIn } from "@/session";
import { devices } from "@/web";

/** Hubungkan WorkBuddy and Perangkat terhubung. Plain forms, so they work before JavaScript loads. */
export const Route = createFileRoute("/_klinik/perangkat")({
  validateSearch: z.object({
    kode: z.string().optional(),
    galat: z.literal(1).optional(),
    terhubung: z.literal(1).optional(),
  }),
  head: () => ({ meta: [{ title: "Perangkat" }] }),
  loader: () => devices(),
  component: Perangkat,
  server: {
    handlers: {
      POST: async ({ request }) => {
        const staff = await signedIn();
        if (!staff) return new Response(null, { status: 401 });
        const form = await request.formData();
        const code = form.get("kode");
        const device = form.get("putuskan");

        let location = "/perangkat";
        if (typeof code === "string") {
          location = (await confirmPairing(code, staff))
            ? "/perangkat?terhubung=1"
            : `/perangkat?${new URLSearchParams({ kode: code, galat: "1" })}`;
        } else if (typeof device === "string") {
          await unpair(staff, Number(device));
        }
        return new Response(null, { status: 303, headers: { Location: location } });
      },
    },
  },
});

function Perangkat() {
  const rows = Route.useLoaderData();
  const { kode, galat, terhubung } = Route.useSearch();

  return (
    <div className="space-y-10">
      <form method="post" className="max-w-sm space-y-2">
        <div className="flex gap-2">
          <Input
            name="kode"
            defaultValue={kode}
            aria-label="Kode"
            aria-invalid={galat ? true : undefined}
            aria-describedby={galat ? "kode-galat" : undefined}
            placeholder="Kode"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            required
            className="font-mono uppercase"
          />
          <Button type="submit">Hubungkan WorkBuddy</Button>
        </div>
        {galat && (
          <p id="kode-galat" className="text-sm text-destructive">
            Kode tidak berlaku
          </p>
        )}
        {terhubung && <p className="text-sm text-muted-foreground">Kode dikonfirmasi</p>}
      </form>
      {rows.length > 0 && (
        <section aria-labelledby="perangkat-title" className="space-y-3">
          <h2 id="perangkat-title" className="font-medium">
            Perangkat terhubung
          </h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Dihubungkan</TableHead>
                <TableHead>Berakhir</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{formatDate(row.pairedAt)}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(row.expiresAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <form method="post">
                      <input type="hidden" name="putuskan" value={row.id} />
                      <Button type="submit" variant="ghost" size="sm">
                        Putuskan
                      </Button>
                    </form>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </section>
      )}
    </div>
  );
}
