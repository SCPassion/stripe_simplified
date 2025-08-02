"use client";

import { useQuery } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { api } from "@/convex/_generated/api";
import { notFound, useParams } from "next/navigation";
import { Id } from "@/convex/_generated/dataModel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import Image from "next/image";
import { Download, FileTextIcon, PlayCircle, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import PurchaseButton from "@/components/PurchaseButton";

export default function CourseDetailPage() {
  const { user, isLoaded: isUserLoaded } = useUser();
  const { courseId } = useParams<{ courseId: Id<"courses"> }>();
  const userData = useQuery(api.users.getUserByClerkId, {
    clerkId: user?.id ?? "",
  });

  const courseData = useQuery(api.courses.getCourseById, {
    courseId: courseId,
  });

  const userAccess = useQuery(
    api.users.getUserAccess,
    userData // If userData is not null, then we can use it to get the user access
      ? {
          userId: userData._id,
          courseId: courseId,
        }
      : "skip" // when skip you will get a undefined value, so we need to handle it below
  ) || { hasAccess: false }; // If userData is undefined, we can still get the hasAccess: false instead of a undefined value

  // In convex, undefined => Loading
  if (!isUserLoaded || courseData === undefined) {
    return <CourseDetailSkeleton />;
  }

  // If the courseData is null, then the course does not exist
  if (courseData === null) {
    return notFound();
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <Image
            src={courseData.imageUrl}
            alt={courseData.title}
            width={1200}
            height={600}
            className="w-full rounded-md object-cover"
          />
        </CardHeader>

        <CardContent>
          <CardTitle className="text-3xl mb-4">{courseData.title}</CardTitle>

          {userAccess.hasAccess ? (
            <>
              <p className="text-sm text-muted-foreground">
                {courseData.description}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                <Button className="flex items-center justify-center space-x-2">
                  <PlayCircle className="w-5 h-5" />
                  <span>Start Course</span>
                </Button>
                <Button
                  variant="outline"
                  className="flex items-center justify-center space-x-2"
                >
                  <Download className="w-5 h-5" />
                  <span>Download Materials</span>
                </Button>
              </div>
              <h3 className="text-xl font-semibold mb-4">Course Modules</h3>
              <ul className="space-y-2">
                <li className="flex items-center space-x-2">
                  <FileTextIcon className="size-5 text-gray-400" />
                  <span>Introduction to Advanced patterns</span>
                </li>
                <li className="flex items-center space-x-2">
                  <FileTextIcon className="size-5 text-gray-400" />
                  <span>Hooks and Custom Hooks</span>
                </li>
              </ul>
            </>
          ) : (
            <div className="text-center">
              <div className="flex flex-col items-center space-y-4">
                <Lock className="w-16 h-16 text-gray-400" />
                <p className="text-lg text-gray-600">This course is locked.</p>
                <p className="text-gray-500 mb-4">
                  Enroll in this course to access all premium content.
                </p>
                <p className="text-2xl font-bold mb-4">
                  ${courseData.price.toFixed(2)}
                </p>
                <PurchaseButton courseId={courseId} />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function CourseDetailSkeleton() {
  return (
    <div className="container mx-auto py-8 px-4">
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <Skeleton className="w-full h-[600px] rounded-md" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-10 w-3/4 mb-4" />
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-2/3 mb-6" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
