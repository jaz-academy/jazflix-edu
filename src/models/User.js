import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    jazacademyId: { type: Number, unique: true, sparse: true, index: true },
    name: { type: String, required: true },
    username: { type: String },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    avatar: { type: String, default: null },
    role: {
      type: String,
      enum: ["superadmin", "admin", "member", "guest"],
      default: "member",
    },
    memberType: {
      type: String,
      default: "Member", // "Student" | "Teacher" | "Admin" | "Member"
    },
    bio: { type: String, default: "" },
    skills: { type: [mongoose.Schema.Types.Mixed], default: [] },
    favorites: { type: [String], default: [] },
    provider: { type: String, default: "jazacademy" },
    isApproved: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.models.User || mongoose.model("User", UserSchema);

