import "server-only";
import { NextResponse } from "next/server";
import { HttpError } from "@/lib/data/server-store";

/** Map thrown errors to JSON responses with the right status code. */
export function fail(e: unknown) {
  if (e instanceof HttpError) return NextResponse.json({ error: e.message }, { status: e.status });
  const message = e instanceof Error ? e.message : "Server error";
  return NextResponse.json({ error: message }, { status: 500 });
}
