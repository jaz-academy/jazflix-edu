import { NextResponse } from "next/server";

// In-memory cache for resolved confirm URLs and cookies to avoid re-resolving on every chunk request
// Map<fileId, { confirmUrl: string, cookie: string, expires: number }>
const streamCache = new Map();
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

function extractDriveId(input) {
  if (!input) return null;
  // If already pure fileId (no slashes or query params, typically 20-50 alphanumeric characters)
  if (/^[a-zA-Z0-9_-]{20,50}$/.test(input.trim())) {
    return input.trim();
  }
  const patterns = [
    /\/d\/([^/]+)/,
    /id=([^&]+)/,
    /\/file\/([^/?]+)/,
    /\/open\?id=([^&]+)/,
  ];
  for (const p of patterns) {
    const match = input.match(p);
    if (match) return match[1];
  }
  return null;
}

async function resolveDriveDownloadUrl(fileId) {
  // Check cache first
  const cached = streamCache.get(fileId);
  if (cached && Date.now() < cached.expires) {
    return cached;
  }

  const initialUrl = `https://drive.usercontent.google.com/download?id=${fileId}&export=download`;
  const res1 = await fetch(initialUrl, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    },
    redirect: "manual",
  });

  // If status is redirect, follow
  if (res1.status === 302 || res1.status === 303) {
    const loc = res1.headers.get("location");
    if (loc && !loc.includes("drive.usercontent.google.com/download")) {
      const data = { confirmUrl: loc, cookie: "", expires: Date.now() + CACHE_TTL_MS };
      streamCache.set(fileId, data);
      return data;
    }
  }

  const cookie = res1.headers.get("set-cookie") || "";
  const html = await res1.text();

  // Extract uuid if warning page is returned
  const uuidMatch = html.match(/name="uuid"\s+value="([^"]+)"/);
  const uuid = uuidMatch ? uuidMatch[1] : "";

  const confirmUrl = `https://drive.usercontent.google.com/download?id=${fileId}&export=download&confirm=t${
    uuid ? `&uuid=${uuid}` : ""
  }`;

  const resolved = {
    confirmUrl,
    cookie,
    expires: Date.now() + CACHE_TTL_MS,
  };

  streamCache.set(fileId, resolved);
  return resolved;
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const rawId = searchParams.get("fileId") || searchParams.get("id") || searchParams.get("url") || "";
    const fileId = extractDriveId(rawId);

    if (!fileId) {
      return NextResponse.json({ error: "Invalid Google Drive file ID" }, { status: 400 });
    }

    const rangeHeader = request.headers.get("range");

    // Check optional Google API Key
    const apiKey = process.env.GOOGLE_DRIVE_API_KEY || process.env.GOOGLE_API_KEY;
    let upstreamUrl = "";
    let upstreamHeaders = {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    };

    if (apiKey) {
      upstreamUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&key=${apiKey}`;
      if (rangeHeader) upstreamHeaders["Range"] = rangeHeader;
    } else {
      const resolved = await resolveDriveDownloadUrl(fileId);
      upstreamUrl = resolved.confirmUrl;
      if (resolved.cookie) {
        upstreamHeaders["Cookie"] = resolved.cookie;
      }
      if (rangeHeader) {
        upstreamHeaders["Range"] = rangeHeader;
      }
    }

    const upstreamRes = await fetch(upstreamUrl, {
      headers: upstreamHeaders,
    });

    // If initial cached URL failed with 403 or 404, bust cache and try once more
    if (!upstreamRes.ok && upstreamRes.status !== 206) {
      streamCache.delete(fileId);
      if (!apiKey) {
        const fresh = await resolveDriveDownloadUrl(fileId);
        const retryHeaders = {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        };
        if (fresh.cookie) retryHeaders["Cookie"] = fresh.cookie;
        if (rangeHeader) retryHeaders["Range"] = rangeHeader;

        const retryRes = await fetch(fresh.confirmUrl, { headers: retryHeaders });
        if (retryRes.ok || retryRes.status === 206) {
          const resHeaders = new Headers();
          resHeaders.set("Content-Type", retryRes.headers.get("content-type") || "video/mp4");
          if (retryRes.headers.get("content-length")) {
            resHeaders.set("Content-Length", retryRes.headers.get("content-length"));
          }
          if (retryRes.headers.get("content-range")) {
            resHeaders.set("Content-Range", retryRes.headers.get("content-range"));
          }
          resHeaders.set("Accept-Ranges", "bytes");
          resHeaders.set("Cache-Control", "public, max-age=3600");

          return new Response(retryRes.body, {
            status: retryRes.status,
            headers: resHeaders,
          });
        }
      }
    }

    const responseHeaders = new Headers();
    responseHeaders.set("Content-Type", upstreamRes.headers.get("content-type") || "video/mp4");
    if (upstreamRes.headers.get("content-length")) {
      responseHeaders.set("Content-Length", upstreamRes.headers.get("content-length"));
    }
    if (upstreamRes.headers.get("content-range")) {
      responseHeaders.set("Content-Range", upstreamRes.headers.get("content-range"));
    }
    responseHeaders.set("Accept-Ranges", "bytes");
    responseHeaders.set("Cache-Control", "public, max-age=3600");

    return new Response(upstreamRes.body, {
      status: upstreamRes.status,
      headers: responseHeaders,
    });
  } catch (err) {
    console.error("Error in /api/stream/gdrive:", err);
    return NextResponse.json({ error: "Failed to stream Google Drive file" }, { status: 500 });
  }
}
