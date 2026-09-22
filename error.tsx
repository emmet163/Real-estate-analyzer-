"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="loading">
      <h1>We couldn’t open this workspace.</h1>
      <p>Your saved research remains on disk. Try again.</p>
      <button onClick={reset}>Retry</button>
    </main>
  );
}
