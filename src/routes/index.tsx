import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "DentalClinic Brain" }] }),
  component: Placeholder,
});

function Placeholder() {
  return (
    <main className="flex min-h-svh items-center justify-center px-6">
      <h1 className="text-center text-3xl font-medium tracking-tight sm:text-4xl">
        DentalClinic Brain
      </h1>
    </main>
  );
}
