/**
 * Migration: Add feedback_released field to submissions
 *
 * Sets feedback_released = false for all existing submissions that lack this field.
 *
 * Usage:
 *   MONGODB_URI=<your-uri> node migrations/20260403-add-feedback-released-field.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function migrate() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI not set');
    process.exit(1);
  }

  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  const result = await db.collection('submissions').updateMany(
    { feedback_released: { $exists: false } },
    { $set: { feedback_released: false } }
  );

  console.log(`Updated ${result.modifiedCount} submissions with feedback_released = false`);
  await mongoose.disconnect();
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
