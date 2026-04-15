import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "-");
}

export async function POST(request: Request) {
  const supabaseAdmin = getSupabaseAdmin();
  const {
    assignmentId,
    fileName,
    fileType,
  } = (await request.json()) as {
    assignmentId?: string;
    fileName?: string;
    fileType?: string;
  };

  if (!assignmentId?.trim() || !fileName?.trim()) {
    return NextResponse.json(
      { error: "Missing assignment or file details." },
      { status: 400 },
    );
  }

  const { data: assignment, error: assignmentError } = await supabaseAdmin
    .from("assignments")
    .select("id, allowed_file_types")
    .eq("id", assignmentId)
    .single();

  if (assignmentError || !assignment) {
    return NextResponse.json(
      { error: "Could not find that assignment." },
      { status: 404 },
    );
  }

  const extension = fileName.split(".").pop()?.toLowerCase() ?? "";

  if (!assignment.allowed_file_types.includes(extension)) {
    return NextResponse.json(
      { error: "That file type is not allowed for this assignment." },
      { status: 400 },
    );
  }

  const safeFileName = sanitizeFileName(fileName);
  const filePath = `${assignmentId}/${Date.now()}-${safeFileName}`;

  const { data, error } = await supabaseAdmin.storage
    .from("assignment-files")
    .createSignedUploadUrl(filePath);

  if (error || !data) {
    return NextResponse.json(
      { error: `Could not prepare upload: ${error?.message}` },
      { status: 500 },
    );
  }

  return NextResponse.json({
    filePath,
    signedUrl: data.signedUrl,
    token: data.token,
    fileType: fileType || null,
  });
}
