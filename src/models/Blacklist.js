import mongoose from "mongoose";

const BlacklistSchema = new mongoose.Schema(
  {
    tmdbId: {
      type: Number,
      required: true,
      index: true,
    },
    mediaType: {
      type: String,
      enum: ["movie", "tv", "person"],
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
    },
    originalTitle: {
      type: String,
      default: "",
    },
    posterPath: {
      type: String,
      default: "",
    },
    releaseYear: {
      type: Number,
      default: null,
    },
    department: {
      type: String,
      default: "",
    },
    reason: {
      type: String,
      default: "",
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    blacklistedBy: {
      id: { type: String },
      name: { type: String },
      email: { type: String },
    },
  },
  { timestamps: true }
);

BlacklistSchema.index({ tmdbId: 1, mediaType: 1 }, { unique: true });

export default mongoose.models.Blacklist || mongoose.model("Blacklist", BlacklistSchema);
