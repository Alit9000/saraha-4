import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 50,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      select: false,
    },
    profileImage: {
      type: String,
      default: "",
    },
    isEmailConfirmed: {
      type: Boolean,
      default: false,
    },
    passwordChangedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    optimisticConcurrency: true,
  }
);

userSchema.set("toJSON", {
  transform: (document, returnedObject) => {
    delete returnedObject.password;
    delete returnedObject.__v;
    return returnedObject;
  },
});

export const User = mongoose.model("User", userSchema);
