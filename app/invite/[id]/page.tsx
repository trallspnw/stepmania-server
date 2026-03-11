interface InvitePageProps {
  params: Promise<{ id: string }>;
}

export default async function InvitePage({ params }: InvitePageProps) {
  const { id } = await params;

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,rgba(232,138,89,0.28),transparent_28%),radial-gradient(circle_at_top_right,rgba(111,154,214,0.2),transparent_22%),linear-gradient(180deg,#f5f0e8_0%,#ece8df_100%)] px-4 py-10">
      <section className="w-full max-w-lg rounded-2xl border border-stone-200 bg-white/85 p-6 shadow-2xl shadow-stone-900/10">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-700/80">
          StepMania Server
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-stone-950">
          Invite Ready
        </h1>
        <p className="mt-3 text-sm text-stone-600">
          Invite acceptance is not implemented yet in this sprint.
        </p>
        <p className="mt-4 text-sm text-stone-600">
          Invite token: <span className="font-mono text-stone-900">{id}</span>
        </p>
      </section>
    </main>
  );
}
