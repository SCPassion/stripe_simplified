import { v } from "convex/values";
import { query } from "./_generated/server";

// So all in all, only query and mutation can access the database in convex.
// This prevents us from accessing the database from the frontend, which is good.
export const getCourses = query({
  handler: async (ctx) => {
    const courses = await ctx.db.query("courses").collect();
    return courses;
  },
});

export const getCourseById = query({
  args: {
    courseId: v.id("courses"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.courseId); // get don't need "courses" string because we are using id from courses table
  },
});
