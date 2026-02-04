import mongoose from "mongoose";

const { Schema } = mongoose;

export const nationalityEnum = [
  "Natural born Indian Citizen",
  "Natural born British Subject",
  "British Subject if Indian Domicile",
  "Naturalized Indian Citizen",
  "Subject of a Foreign Government",
];

const nationalitySchema = new Schema(
  {
    name: {
      type: String,
      required: [true, "Nationality name is required"],
      unique: true,
      trim: true,
    },
  },
  { timestamps: true },
);

const Nationality = mongoose.model("Nationality", nationalitySchema);
export default Nationality;
