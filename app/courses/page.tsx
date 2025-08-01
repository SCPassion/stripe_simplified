"use client";

import { api } from "../../convex/_generated/api";
import {
  Card,
  CardTitle,
  CardHeader,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import Link from "next/link";
import Image from "next/image";
import { useQuery } from "convex/react";
import { Button } from "@/components/ui/button";
import { SignedIn, SignedOut, SignInButton } from "@clerk/nextjs";
import { Badge } from "@/components/ui/badge";

export default function CoursesPage() {
  const courses = useQuery(api.courses.getCourses);

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-8">All Courses</h1>
      <div className="grid grid-cols-1 md-:grid-cols-2 lg:grid-cols-3 gap-6">
        {courses?.map((course) => (
          <Card key={course._id} className="flex flex-col">
            <Link href={`/courses/${course._id}`} className="cursor-pointer">
              <CardHeader>
                <Image
                  src={course.imageUrl}
                  alt={course.title}
                  width={640}
                  height={360}
                  className="rounded-md object-cover"
                />
              </CardHeader>
              <CardContent className="flex-grow">
                <CardTitle className="text-xl mb-2 hover:underline">
                  {course.title}
                </CardTitle>
              </CardContent>
            </Link>

            <CardFooter className="flex justify-between items-center">
              <Badge variant="default" className="text-lg px-3 py-1">
                {course.price}
              </Badge>

              <SignedIn>Purchase</SignedIn>

              <SignedOut>
                <SignInButton mode="modal">
                  <Button variant="outline">Enroll Now</Button>
                </SignInButton>
              </SignedOut>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
