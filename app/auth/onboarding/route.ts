import { NextResponse } from "next/server";
import { completeOnboardingAction } from "@/lib/actions/auth";

/** Creates the membership/organization after email confirmation. Route handler so cookies can be set. */
export async function GET(request: Request) {
  const result = await completeOnboardingAction();
  if (result.ok) return NextResponse.redirect(new URL("/id/dashboard", request.url));
  const url = new URL("/id/onboarding", request.url);
  url.searchParams.set("error", result.error);
  return NextResponse.redirect(url);
}
