import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import Blacklist from "@/models/Blacklist";
import { invalidateBlacklistCache } from "@/lib/blacklist";

function checkSuperadmin(req) {
  let token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) {
    token = req.cookies.get("token")?.value;
  }
  const decoded = verifyToken(token);
  if (!decoded || decoded.role !== "superadmin") {
    return null;
  }
  return decoded;
}

export async function GET(req) {
  const superadmin = checkSuperadmin(req);
  if (!superadmin) {
    return NextResponse.json(
      { error: "Akses ditolak: Hanya superadmin yang diizinkan." },
      { status: 403 }
    );
  }

  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const mediaType = searchParams.get("mediaType"); // movie, tv, person
    const search = searchParams.get("search") || "";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    const filter = {};
    if (mediaType && ["movie", "tv", "person"].includes(mediaType)) {
      filter.mediaType = mediaType;
    }
    if (search.trim()) {
      filter.$or = [
        { title: { $regex: search.trim(), $options: "i" } },
        { originalTitle: { $regex: search.trim(), $options: "i" } },
        { reason: { $regex: search.trim(), $options: "i" } },
      ];
    }

    const total = await Blacklist.countDocuments(filter);
    const items = await Blacklist.find(filter)
      .sort({ updatedAt: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    return NextResponse.json({
      items,
      total,
      page,
      totalPages: Math.ceil(total / limit) || 1,
    });
  } catch (error) {
    console.error("Error fetching blacklist items:", error);
    return NextResponse.json(
      { error: "Gagal mengambil daftar blacklist" },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  const superadmin = checkSuperadmin(req);
  if (!superadmin) {
    return NextResponse.json(
      { error: "Akses ditolak: Hanya superadmin yang diizinkan." },
      { status: 403 }
    );
  }

  try {
    await connectDB();
    const body = await req.json();
    const {
      tmdbId,
      mediaType,
      title,
      originalTitle = "",
      posterPath = "",
      releaseYear = null,
      department = "",
      reason = "",
      isActive = true,
    } = body;

    if (!tmdbId || !mediaType || !title) {
      return NextResponse.json(
        { error: "Parameter tmdbId, mediaType, dan title wajib diisi." },
        { status: 400 }
      );
    }

    const numId = Number(tmdbId);
    if (isNaN(numId)) {
      return NextResponse.json(
        { error: "tmdbId harus berupa angka valid." },
        { status: 400 }
      );
    }

    const updated = await Blacklist.findOneAndUpdate(
      { tmdbId: numId, mediaType },
      {
        tmdbId: numId,
        mediaType,
        title,
        originalTitle,
        posterPath,
        releaseYear,
        department,
        reason,
        isActive: Boolean(isActive),
        blacklistedBy: {
          id: superadmin.id,
          name: superadmin.name,
          email: superadmin.email,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    invalidateBlacklistCache();

    return NextResponse.json({
      success: true,
      message: "Data blacklist berhasil disimpan.",
      item: updated,
    });
  } catch (error) {
    console.error("Error creating/updating blacklist item:", error);
    return NextResponse.json(
      { error: "Gagal menyimpan data blacklist" },
      { status: 500 }
    );
  }
}
