// tdc-backend/seeders/seedRegistrationCategories.js
import mongoose from "mongoose";
import dotenv from "dotenv";
import RegistrationCategory from "../src/models/RegistrationCategory.js"; // IMPORTANT: Changed to RegistrationCategory

dotenv.config();

const categories = [
  {
    name: "Provisional Registration",
    regular_amount: 1000,
    renewal_regular_amount: 500,
    tatkal_amount: 2000,
    renewal_tatkal_amount: 1000,
  },
  {
    name: "Bachelor of Dental Surgery (BDS) from Telangana",
    regular_amount: 1500,
    renewal_regular_amount: 700,
    tatkal_amount: 2500,
    renewal_tatkal_amount: 1200,
  },
  {
    name: "Transfer BDS (BDS registrant - from other state dental councils in India)",
    regular_amount: 1600,
    renewal_regular_amount: 800,
    tatkal_amount: 2700,
    renewal_tatkal_amount: 1300,
  },
  {
    name: "Transfer BDS + New MDS",
    regular_amount: 1800,
    renewal_regular_amount: 900,
    tatkal_amount: 2800,
    renewal_tatkal_amount: 1400,
  },
  {
    name: "Transfer MDS (MDS registrant - from other state dental councils in India)",
    regular_amount: 1900,
    renewal_regular_amount: 950,
    tatkal_amount: 2900,
    renewal_tatkal_amount: 1450,
  },
  {
    name: "Master of Dental Surgery (MDS) from Telangana",
    regular_amount: 2000,
    renewal_regular_amount: 1000,
    tatkal_amount: 3000,
    renewal_tatkal_amount: 1500,
  },
  {
    name: "Non Indian Dentist Registration (Temporary)",
    regular_amount: 3000,
    renewal_regular_amount: 1500,
    tatkal_amount: 4000,
    renewal_tatkal_amount: 2000,
  },
];

const seedCategories = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB Connected for Category seeding");

    await RegistrationCategory.deleteMany();
    console.log("🗑️  Existing Categories cleared");

    await RegistrationCategory.insertMany(categories);

    console.log("📚 Registration Categories seeded successfully");
  } catch (err) {
    console.error("❌ Category seeding error:", err.message);
  } finally {
    mongoose.disconnect();
  }
};

seedCategories();
