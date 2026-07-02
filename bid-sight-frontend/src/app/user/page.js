export default function UserPage() {
  return (
    <section className="min-h-screen bg-background px-6 py-12">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">Account</p>
          <h1 className="text-3xl font-semibold tracking-tight">User Page</h1>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
            This area is ready for profile details, settings, and personal progress.
          </p>
        </div>

        <div className="rounded-lg border border-border bg-card p-8 text-card-foreground shadow-sm">
          <p className="text-sm leading-6 text-muted-foreground">
            Add user information and account actions here when the profile flow is ready.
          </p>
        </div>
      </div>
    </section>
  );
}
