import { Suspense } from "react";
import ClientRequestForm from "../../components/ClientRequestForm";

export default function ClientRequestPage() {
  return (
    <Suspense fallback={<main className="client-shell"><div className="client-loading">Loading project request…</div></main>}>
      <ClientRequestForm />
    </Suspense>
  );
}
