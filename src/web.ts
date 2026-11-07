import { createMiddleware, createServerFn } from "@tanstack/react-start";
import { auditFor, verifyChain } from "./brain/jejak-audit";
import { devicesOf } from "./brain/pairing";
import { inbox } from "./brain/proposals";
import { asetFor, patientsFor, scheduleFor, stockCard } from "./brain/views";
import { signedIn } from "./session";

// Server functions the web app reads through. The engine decides what the caller's Role may see.

/** Every data call resolves its caller here; without a live session it gets HTTP 401. */
const withCaller = createMiddleware({ type: "function" }).server(async ({ next }) => {
  const caller = await signedIn();
  if (!caller) throw new Response(null, { status: 401 });
  return next({ context: { caller } });
});

const read = createServerFn().middleware([withCaller]);

/** The signed-in staff member, or null. */
export const me = createServerFn().handler(signedIn);

export const patients = read.handler(({ context }) => patientsFor(context.caller));

export const schedule = read.handler(({ context }) => scheduleFor(context.caller));

export const stock = read.handler(() => stockCard());

export const aset = read.handler(({ context }) => asetFor(context.caller));

export const jejakAudit = read.handler(async ({ context }) => ({
  verified: await verifyChain(),
  rows: await auditFor(context.caller),
}));

export const devices = read.handler(({ context }) => devicesOf(context.caller));

export const proposals = read.handler(({ context }) => inbox(context.caller));
