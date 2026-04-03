/**
 * Migration: Clean courses — keep only 'מבני נתונים ואלגוריתמים'
 *
 * Deletes all other courses and their associated data (materials, assignments,
 * submissions, assessment layers, human review queue, waitlist history).
 * Updates user enrolledCourseIds to remove stale course references.
 *
 * Usage:
 *   node migrations/20260403-clean-courses.js
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

  // Find the target course
  const targetCourse = await db.collection('courses').findOne({ name: 'מבני נתונים ואלגוריתמים' });
  if (!targetCourse) {
    console.error('Course "מבני נתונים ואלגוריתמים" not found. Aborting.');
    const allCourses = await db.collection('courses').find({}, { projection: { name: 1 } }).toArray();
    console.log('Available courses:', allCourses.map(c => `"${c.name}"`).join(', '));
    await mongoose.disconnect();
    process.exit(1);
  }

  console.log(`Found target course: "${targetCourse.name}" (${targetCourse._id})`);

  // Get all courses to delete
  const coursesToDelete = await db.collection('courses').find({ _id: { $ne: targetCourse._id } }).toArray();
  const deleteIds = coursesToDelete.map(c => c._id);
  const deleteIdStrings = deleteIds.map(id => id.toString());

  console.log(`\nCourses to delete (${coursesToDelete.length}):`);
  coursesToDelete.forEach(c => console.log(`  - "${c.name}" (${c._id})`));

  if (deleteIds.length === 0) {
    console.log('No courses to delete. Done.');
    await mongoose.disconnect();
    return;
  }

  // Delete courses
  const coursesResult = await db.collection('courses').deleteMany({ _id: { $in: deleteIds } });
  console.log(`\nDeleted ${coursesResult.deletedCount} courses`);

  // Delete materials for deleted courses
  const materialsResult = await db.collection('materials').deleteMany({ courseId: { $in: deleteIdStrings } });
  console.log(`Deleted ${materialsResult.deletedCount} materials`);

  // Find and delete assignments for deleted courses
  const assignmentsToDelete = await db.collection('assignments').find({ courseId: { $in: deleteIdStrings } }).toArray();
  const assignmentIds = assignmentsToDelete.map(a => a._id.toString());

  const assignmentsResult = await db.collection('assignments').deleteMany({ courseId: { $in: deleteIdStrings } });
  console.log(`Deleted ${assignmentsResult.deletedCount} assignments`);

  if (assignmentIds.length > 0) {
    // Find and delete submissions
    const submissionsToDelete = await db.collection('submissions').find({ assignmentId: { $in: assignmentIds } }).toArray();
    const submissionIds = submissionsToDelete.map(s => s._id.toString());

    const submissionsResult = await db.collection('submissions').deleteMany({ assignmentId: { $in: assignmentIds } });
    console.log(`Deleted ${submissionsResult.deletedCount} submissions`);

    // Delete assessment layers by submission_id
    if (submissionIds.length > 0) {
      const layersResult = await db.collection('assessmentlayers').deleteMany({ submission_id: { $in: submissionIds } });
      console.log(`Deleted ${layersResult.deletedCount} assessment layers`);

      const queueResult = await db.collection('humanreviewqueues').deleteMany({ submission_id: { $in: submissionIds } });
      console.log(`Deleted ${queueResult.deletedCount} review queue items`);
    }
  }

  // Delete waitlist history for deleted courses
  const waitlistResult = await db.collection('waitlisthistories').deleteMany({ courseId: { $in: deleteIdStrings } });
  console.log(`Deleted ${waitlistResult.deletedCount} waitlist history entries`);

  // Update users: remove deleted course IDs from enrolledCourseIds
  const usersResult = await db.collection('users').updateMany(
    { enrolledCourseIds: { $in: deleteIdStrings } },
    { $pull: { enrolledCourseIds: { $in: deleteIdStrings } } }
  );
  console.log(`Updated ${usersResult.modifiedCount} users' enrolledCourseIds`);

  // Fix activeCourseId: if it points to a deleted course, clear it
  const activeCourseFixResult = await db.collection('users').updateMany(
    { activeCourseId: { $in: deleteIdStrings } },
    { $set: { activeCourseId: null } }
  );
  console.log(`Cleared stale activeCourseId on ${activeCourseFixResult.modifiedCount} users`);

  console.log('\nCleanup complete!');
  await mongoose.disconnect();
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
