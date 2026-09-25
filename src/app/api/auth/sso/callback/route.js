import { NextResponse } from "next/server";
import { upsertJazAcademyUser, signToken } from "@/lib/auth";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || "localhost:3000";
  const proto = request.headers.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || `${proto}://${host}`;

  if (error || !code) {
    console.error("SSO Callback error from IDP:", error, errorDescription);
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(errorDescription || error || "Akses ditolak")}`, baseUrl)
    );
  }

  const idpUrl = (process.env.JAZACADEMY_IDP_URL || "https://jazacademy.id").replace(/\/$/, "");
  const clientId = process.env.JAZACADEMY_CLIENT_ID || "4";
  const clientSecret = process.env.JAZACADEMY_CLIENT_SECRET || "IxD5VbEp3FcmFCngAYaVKbY9gYMSsU4laVx3fD5W";

  // Use the exact redirect_uri stored in the cookie during authorize, or fallback
  const redirectUri =
    request.cookies.get("jaz_oauth_redirect_uri")?.value ||
    process.env.JAZACADEMY_REDIRECT_URI ||
    `${proto}://${host}/api/auth/sso/callback`;

  try {
    // 1. Exchange authorization code for access_token using standard URL-encoded form
    const tokenParams = new URLSearchParams({
      grant_type: "authorization_code",
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      code,
    });

    const tokenResponse = await fetch(`${idpUrl}/oauth/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: tokenParams.toString(),
    });

    if (!tokenResponse.ok) {
      const errBody = await tokenResponse.text();
      console.error("Token exchange failed:", tokenResponse.status, errBody);
      let errMsg = "Gagal menukar kode otorisasi";
      try {
        const parsed = JSON.parse(errBody);
        if (parsed.message || parsed.error_description) {
          errMsg = parsed.message || parsed.error_description;
        }
      } catch (_) {}
      return NextResponse.redirect(
        new URL(`/login?error=${encodeURIComponent(errMsg)}`, baseUrl)
      );
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      return NextResponse.redirect(
        new URL("/login?error=Access+token+tidak+ditemukan", baseUrl)
      );
    }

    // 2. Fetch UserInfo from JazAcademy
    const userinfoResponse = await fetch(`${idpUrl}/api/oauth/user`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    });

    if (!userinfoResponse.ok) {
      console.error("Failed to fetch userinfo:", userinfoResponse.status);
      return NextResponse.redirect(
        new URL("/login?error=Gagal+mengambil+data+profil", baseUrl)
      );
    }

    const ssoUser = await userinfoResponse.json();

    // 3. Upsert into JazFlix MongoDB
    const user = await upsertJazAcademyUser(ssoUser);

    // 4. Generate JazFlix JWT Token
    const jazflixToken = signToken(user);

    // 5. Determine destination URL
    const returnToCookie = request.cookies.get("jaz_oauth_return_to")?.value;
    let targetPath = returnToCookie && returnToCookie !== "/login" ? returnToCookie : null;

    if (!targetPath) {
      if (user.role === "admin" || user.role === "superadmin") {
        targetPath = "/admin";
      } else {
        targetPath = "/";
      }
    }

    const response = NextResponse.redirect(new URL(targetPath, baseUrl));

    // Set cookie token for session
    response.cookies.set("token", jazflixToken, {
      path: "/",
      httpOnly: false, // Accessible by client scripts & components
      maxAge: 60 * 60 * 24 * 7, // 7 days
      sameSite: "lax",
    });

    // Clean up temporary cookies
    response.cookies.delete("jaz_oauth_state");
    response.cookies.delete("jaz_oauth_return_to");
    response.cookies.delete("jaz_oauth_redirect_uri");

    return response;
  } catch (err) {
    console.error("Unexpected error in SSO callback:", err);
    return NextResponse.redirect(
      new URL("/login?error=Terjadi+kesalahan+sistem+saat+login", baseUrl)
    );
  }
}
