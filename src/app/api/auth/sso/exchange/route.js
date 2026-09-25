import { NextResponse } from "next/server";
import { upsertJazAcademyUser, signToken } from "@/lib/auth";

export async function POST(request) {
  try {
    const body = await request.json();
    const { code, redirect_uri } = body;

    if (!code) {
      return NextResponse.json({ error: "Authorization code is required" }, { status: 400 });
    }

    const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || "localhost:3000";
    const proto = request.headers.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");

    const idpUrl = (process.env.JAZACADEMY_IDP_URL || "https://jazacademy.id").replace(/\/$/, "");
    const clientId = process.env.JAZACADEMY_CLIENT_ID || "4";
    const clientSecret = process.env.JAZACADEMY_CLIENT_SECRET || "IxD5VbEp3FcmFCngAYaVKbY9gYMSsU4laVx3fD5W";
    const redirectUri =
      redirect_uri ||
      process.env.JAZACADEMY_REDIRECT_URI ||
      `${proto}://${host}/api/auth/sso/callback`;

    // 1. Exchange code
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
      const err = await tokenResponse.text();
      return NextResponse.json(
        { error: "Gagal menukar kode otorisasi", details: err },
        { status: 400 }
      );
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // 2. Fetch UserInfo
    const userinfoResponse = await fetch(`${idpUrl}/api/oauth/user`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    });

    if (!userinfoResponse.ok) {
      return NextResponse.json(
        { error: "Gagal mengambil data profil dari Jaz Academy" },
        { status: 400 }
      );
    }

    const ssoUser = await userinfoResponse.json();

    // 3. Upsert user in JazFlix
    const user = await upsertJazAcademyUser(ssoUser);

    // 4. Generate JWT
    const token = signToken(user);

    const redirectPath =
      user.role === "admin" || user.role === "superadmin" ? "/admin" : "/";

    const response = NextResponse.json({
      success: true,
      token,
      user: {
        id: user._id,
        jazacademyId: user.jazacademyId,
        name: user.name,
        email: user.email,
        role: user.role,
        memberType: user.memberType,
        avatar: user.avatar,
      },
      redirectUrl: redirectPath,
    });

    response.cookies.set("token", token, {
      path: "/",
      httpOnly: false,
      maxAge: 60 * 60 * 24 * 7,
      sameSite: "lax",
    });

    return response;
  } catch (error) {
    console.error("Error in SSO exchange:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan pada server saat autentikasi SSO" },
      { status: 500 }
    );
  }
}
