import { NextResponse } from "next/server";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const returnTo = searchParams.get("returnTo") || "/";

  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || "localhost:3000";
  const proto = request.headers.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");

  const idpUrl = (process.env.JAZACADEMY_IDP_URL || "https://jazacademy.id").replace(/\/$/, "");
  const clientId = process.env.JAZACADEMY_CLIENT_ID || "4";

  let redirectUri = process.env.JAZACADEMY_REDIRECT_URI;
  if (!redirectUri) {
    redirectUri = `${proto}://${host}/api/auth/sso/callback`;
  }

  const state = Math.random().toString(36).substring(2, 15);

  const authUrl = new URL(`${idpUrl}/oauth/authorize`);
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", "profile email");
  authUrl.searchParams.set("state", state);

  const response = NextResponse.redirect(authUrl.toString());

  // Store state, returnTo, and exact redirectUri in cookie for verification
  response.cookies.set("jaz_oauth_state", state, {
    path: "/",
    httpOnly: true,
    maxAge: 60 * 10, // 10 minutes
    sameSite: "lax",
  });

  response.cookies.set("jaz_oauth_return_to", returnTo, {
    path: "/",
    httpOnly: true,
    maxAge: 60 * 10,
    sameSite: "lax",
  });

  response.cookies.set("jaz_oauth_redirect_uri", redirectUri, {
    path: "/",
    httpOnly: true,
    maxAge: 60 * 10,
    sameSite: "lax",
  });

  return response;
}
