// src/app/api/quizzes/[quizId]/attempts/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { PostgrestError } from "@supabase/supabase-js"; // Import for Supabase specific errors

// Define a more specific type for the expected profile structure
interface Profile {
  id: string;
}

// Define a more specific type for the expected attempt structure
interface QuizAttempt {
  id: string;
  // Add other attempt fields if necessary, e.g., quiz_id, user_id, started_at
  quiz_id?: string;
  user_id?: string;
  started_at?: string;
}

// Define the specific error shape that TypeScript seems to infer for the data part
interface SupabaseDataError {
  Error: string;
}

// Route handler for POST requests to /api/quizzes/[quizId]/attempts
export async function POST(
  request: NextRequest,
  routeContext: { params: { quizId: string } }
) {
  // 1) Extract quizId from the URL
  const { quizId } = routeContext.params;

  // 2) Create a Supabase server‐side client
  const supabase = createServerClient();

  // 3) (Optional) Grab a “dummy” profile so we can insert a fake user_id
  let dummyUserId: string;
  try {
    const { data: profiles, error: profErr } = await supabase
      .from("profiles")
      .select("id")
      .limit(1)
      .returns<Profile[]>(); // Specify the expected return type

    if (profErr) throw profErr; // Supabase errors are already typed (PostgrestError)
    if (!profiles || profiles.length === 0) {
      throw new Error("No user_profiles found to use as dummy user_id");
    }
    dummyUserId = profiles[0].id;
  } catch (error) {
    const errorMessage = "Failed to fetch dummy user profile"; // Changed to const
    let errorDetails = "An unknown error occurred.";

    if (error instanceof Error) {
      errorDetails = error.message;
    }
    // Check if it's a PostgrestError (from Supabase)
    // PostgrestError is an interface, so instanceof won't work directly.
    // We check for common properties of PostgrestError.
    const potentialPostgrestError = error as Partial<PostgrestError>;
    if (potentialPostgrestError.message && potentialPostgrestError.code) {
      errorDetails = `Supabase error: ${potentialPostgrestError.message} (Code: ${potentialPostgrestError.code})`;
    }

    console.error("Error fetching dummy profile:", errorDetails, error);
    return NextResponse.json(
      { error: errorMessage, details: errorDetails },
      { status: 500 }
    );
  }

  // 4) Insert a new quiz_attempt row, returning the inserted row
  try {
    const { data: attemptObject, error: insertError } = await supabase
      .from("quiz_attempts")
      .insert({
        quiz_id: quizId,
        user_id: dummyUserId, // Ensure this user_id exists in your 'profiles' table
        started_at: new Date().toISOString(),
      })
      .select() // ask Supabase to return the newly inserted row
      .single()
      // Explicitly type the union that TS infers from the error message
      .returns<QuizAttempt | SupabaseDataError>();

    if (insertError) {
      // This should be a PostgrestError
      throw insertError;
    }

    if (!attemptObject) {
      // This case should ideally be covered by insertError or .single() throwing
      throw new Error(
        "Quiz attempt data is null after insert despite no explicit error from Supabase."
      );
    }

    // Type guard to differentiate between QuizAttempt and SupabaseDataError
    if (
      "id" in attemptObject &&
      typeof (attemptObject as QuizAttempt).id === "string"
    ) {
      // It's a valid QuizAttempt object
      const validAttempt = attemptObject as QuizAttempt;
      // 5) Return the new attempt’s ID
      return NextResponse.json({ id: validAttempt.id }, { status: 201 });
    } else if (
      "Error" in attemptObject &&
      typeof (attemptObject as SupabaseDataError).Error === "string"
    ) {
      // It's the SupabaseDataError structure
      const dataError = attemptObject as SupabaseDataError;
      console.error(
        "Supabase returned an error structure within the data object:",
        dataError.Error
      );
      throw new Error(`Failed to create quiz attempt: ${dataError.Error}`);
    } else {
      // Fallback for an unexpected structure of attemptObject
      console.error(
        "Unexpected data structure received for quiz attempt:",
        attemptObject
      );
      throw new Error(
        "Failed to process quiz attempt due to unexpected data structure."
      );
    }
  } catch (error) {
    const errorMessage = "Failed to create quiz attempt"; // Changed to const
    let errorDetails = "An unknown error occurred.";

    if (error instanceof Error) {
      errorDetails = error.message;
    }
    const potentialPostgrestError = error as Partial<PostgrestError>;
    if (potentialPostgrestError.message && potentialPostgrestError.code) {
      errorDetails = `Supabase error: ${potentialPostgrestError.message} (Code: ${potentialPostgrestError.code})`;
    }

    console.error("Error inserting quiz attempt:", errorDetails, error);
    return NextResponse.json(
      { error: errorMessage, details: errorDetails },
      { status: 500 }
    );
  }
}
