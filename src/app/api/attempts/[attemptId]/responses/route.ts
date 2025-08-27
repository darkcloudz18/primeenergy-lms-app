// src/app/api/attempts/[attemptId]/responses/route.ts
import { NextResponse } from "next/server";
import { getSupabaseRSC } from "@/lib/supabase-rsc";
import { PDFDocument, rgb } from "pdf-lib";
import fs from "fs";
import path from "path";

// Input shape for quiz answers
interface AnswerInput {
  question_id: string;
  selected_option_id?: string;
  answer_text?: string;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ attemptId: string }> }
) {
  // 1️⃣ Extract attemptId
  const { attemptId } = await params;

  // 2️⃣ Parse answers
  const { answers } = (await request.json()) as { answers: AnswerInput[] };
  if (!Array.isArray(answers) || answers.length === 0) {
    return NextResponse.json(
      { error: "Please send an array of answers" },
      { status: 400 }
    );
  }

  const supabase = getSupabaseRSC();

  // 3️⃣ Load the attempt (to get quiz_id + user_id)
  const { data: attempt, error: atErr } = await supabase
    .from("quiz_attempts")
    .select("quiz_id, user_id")
    .eq("id", attemptId)
    .single();
  if (atErr || !attempt) {
    return NextResponse.json(
      { error: atErr?.message ?? "Attempt not found" },
      { status: 404 }
    );
  }

  // 4️⃣ Get passing_score
  const { data: quiz, error: qErr } = await supabase
    .from("quizzes")
    .select("passing_score")
    .eq("id", attempt.quiz_id)
    .single();
  if (qErr || !quiz) {
    return NextResponse.json(
      { error: qErr?.message ?? "Quiz not found" },
      { status: 404 }
    );
  }

  // 5️⃣ Check which options are correct
  const selectedIds = answers
    .map((a) => a.selected_option_id)
    .filter((id): id is string => !!id);
  const { data: options, error: optErr } = await supabase
    .from("options")
    .select("id, is_correct")
    .in("id", selectedIds);
  if (optErr) {
    return NextResponse.json({ error: optErr.message }, { status: 500 });
  }
  const correctMap = Object.fromEntries(
    options.map((o) => [o.id, o.is_correct])
  );

  // 6️⃣ Build & insert question_responses
  let total_score = 0;
  const responses = answers.map((a) => {
    const is_correct =
      !!a.selected_option_id && !!correctMap[a.selected_option_id];
    const score_awarded = is_correct ? 1 : 0;
    total_score += score_awarded;
    return {
      attempt_id: attemptId,
      question_id: a.question_id,
      selected_option_id: a.selected_option_id ?? null,
      answer_text: a.answer_text ?? null,
      is_correct,
      score_awarded,
    };
  });
  const { error: respErr } = await supabase
    .from("question_responses")
    .insert(responses);
  if (respErr) {
    return NextResponse.json({ error: respErr.message }, { status: 500 });
  }

  // 7️⃣ Update the attempt row
  const passed = total_score >= quiz.passing_score;
  const { error: updErr } = await supabase
    .from("quiz_attempts")
    .update({
      finished_at: new Date().toISOString(),
      total_score,
      passed,
    })
    .eq("id", attemptId);
  if (updErr) {
    return NextResponse.json({ error: updErr.message }, { status: 500 });
  }

  // 8️⃣ If passed, generate & upload certificate
  let certificate = null;
  if (passed) {
    // a) insert certificate metadata
    const { data: certRow, error: certErr } = await supabase
      .from("certificates_issued")
      .insert({
        attempt_id: attemptId,
        issued_at: new Date().toISOString(),
      })
      .select()
      .single();
    if (certErr || !certRow) {
      return NextResponse.json(
        { error: certErr?.message ?? "Failed to insert certificate" },
        { status: 500 }
      );
    }

    // b) create PDF
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([800, 600]);
    const { width, height } = page.getSize();

    // load font + logo binaries
    const lbPath = path.join(
      process.cwd(),
      "src/assets/fonts/LibreBaskerville-Regular.ttf"
    );
    const mcPath = path.join(
      process.cwd(),
      "src/assets/fonts/MonteCarlo-Regular.ttf"
    );
    const logoPath = path.join(process.cwd(), "src/assets/images/logo.png");
    const lbBytes = fs.readFileSync(lbPath);
    const mcBytes = fs.readFileSync(mcPath);
    const logoBytes = fs.readFileSync(logoPath);

    // embed
    const lbFont = await pdfDoc.embedFont(lbBytes);
    const mcFont = await pdfDoc.embedFont(mcBytes);
    const logoImage = await pdfDoc.embedPng(logoBytes);
    const logoDims = logoImage.scale(0.5);

    // draw logo top-right
    page.drawImage(logoImage, {
      x: width - logoDims.width - 50,
      y: height - logoDims.height - 50,
      width: logoDims.width,
      height: logoDims.height,
    });

    // heading
    page.drawText("Certificate of Excellence", {
      x: 50,
      y: height - 100,
      size: 36,
      font: lbFont,
      color: rgb(0.1, 0.2, 0.5),
    });

    // participant name (using user_id as placeholder)
    page.drawText(`Awarded to: ${attempt.user_id}`, {
      x: 50,
      y: height - 160,
      size: 30,
      font: mcFont,
      color: rgb(0, 0, 0),
    });

    // signature line + label
    page.drawLine({
      start: { x: 50, y: 100 },
      end: { x: 250, y: 100 },
      thickness: 1.5,
      color: rgb(0.2, 0.2, 0.2),
    });
    page.drawText("Instructor Signature", {
      x: 50,
      y: 80,
      size: 12,
      font: lbFont,
      color: rgb(0.2, 0.2, 0.2),
    });

    // c) save & upload
    const pdfBytes = await pdfDoc.save();
    const buffer = Buffer.from(pdfBytes);
    const filePath = `certificates/cert-${certRow.id}.pdf`;
    const { error: uploadErr } = await supabase.storage
      .from("certificates")
      .upload(filePath, buffer, { contentType: "application/pdf" });

    if (!uploadErr) {
      const { data: pub } = supabase.storage
        .from("certificates")
        .getPublicUrl(filePath);
      await supabase
        .from("certificates_issued")
        .update({ certificate_url: pub.publicUrl })
        .eq("id", certRow.id);
      certificate = { ...certRow, certificate_url: pub.publicUrl };
    } else {
      certificate = certRow;
    }
  }

  // 9️⃣ Return the results
  return NextResponse.json({ total_score, passed, certificate });
}
