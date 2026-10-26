import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { requireAdminOrNotFound } from "@/server/auth/current-user";
import { RoomForm } from "../room-form";

export const metadata: Metadata = { title: "Nova sala" };

export default function NovaSalaPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <Link
          href="/admin/salas"
          className="text-sm text-accent-600 hover:underline"
        >
          ← Salas
        </Link>
        <h1 className="text-2xl font-semibold text-brand-900">Nova sala</h1>
      </header>
      <Suspense fallback={<div className="h-64 max-w-xl animate-pulse rounded-2xl border border-line bg-white" aria-hidden="true" />}>
        <NewRoomContent />
      </Suspense>
    </div>
  );
}

async function NewRoomContent() {
  // Quem não é admin nem vê o formulário (a Action também confere).
  await requireAdminOrNotFound();
  return (
    <div className="max-w-xl rounded-2xl border border-line bg-white p-6 shadow-sm">
      <RoomForm />
    </div>
  );
}
