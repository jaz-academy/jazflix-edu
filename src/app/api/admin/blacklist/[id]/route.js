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

export async function PATCH(req, context) {
  const superadmin = checkSuperadmin(req);
  if (!superadmin) {
    return NextResponse.json(
      { error: "Akses ditolak: Hanya superadmin yang diizinkan." },
      { status: 403 }
    );
  }

  try {
    await connectDB();
    const { params } = context;
    const { id } = await params;
    const body = await req.json();

    const updateFields = {};
    if (typeof body.isActive === "boolean") {
      updateFields.isActive = body.isActive;
    }
    if (typeof body.reason === "string") {
      updateFields.reason = body.reason.trim();
    }

    const item = await Blacklist.findByIdAndUpdate(
      id,
      {
        $set: {
          ...updateFields,
          blacklistedBy: {
            id: superadmin.id,
            name: superadmin.name,
            email: superadmin.email,
          },
        },
      },
      { new: true }
    );

    if (!item) {
      return NextResponse.json(
        { error: "Item blacklist tidak ditemukan." },
        { status: 404 }
      );
    }

    invalidateBlacklistCache();

    return NextResponse.json({
      success: true,
      message: "Data blacklist berhasil diperbarui.",
      item,
    });
  } catch (error) {
    console.error("Error updating blacklist item:", error);
    return NextResponse.json(
      { error: "Gagal memperbarui item blacklist" },
      { status: 500 }
    );
  }
}

export async function DELETE(req, context) {
  const superadmin = checkSuperadmin(req);
  if (!superadmin) {
    return NextResponse.json(
      { error: "Akses ditolak: Hanya superadmin yang diizinkan." },
      { status: 403 }
    );
  }

  try {
    await connectDB();
    const { params } = context;
    const { id } = await params;

    const item = await Blacklist.findByIdAndDelete(id);
    if (!item) {
      return NextResponse.json(
        { error: "Item blacklist tidak ditemukan." },
        { status: 404 }
      );
    }

    invalidateBlacklistCache();

    return NextResponse.json({
      success: true,
      message: "Item berhasil dihapus dari blacklist.",
    });
  } catch (error) {
    console.error("Error deleting blacklist item:", error);
    return NextResponse.json(
      { error: "Gagal menghapus item dari blacklist" },
      { status: 500 }
    );
  }
}
