import { NextResponse } from "next/server";
import { getSessionUserRecord } from "@/lib/admin";
import { deleteUserAndOwnedData } from "@/lib/user-deletion";

export async function DELETE() {
  const result = await getSessionUserRecord();

  if (!result) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await deleteUserAndOwnedData(result.user.id);

  return NextResponse.json({ ok: true });
}
