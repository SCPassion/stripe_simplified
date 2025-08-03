"use client";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useUser } from "@clerk/nextjs";
import { useAction, useQuery } from "convex/react";
import { Button } from "./ui/button";
import { Loader2Icon } from "lucide-react";
import { useState } from "react";
import { ConvexError } from "convex/values";
import { toast } from "sonner";

export default function PurchaseButton({
  courseId,
}: {
  courseId: Id<"courses">;
}) {
  const { user } = useUser();
  const userData = useQuery(
    api.users.getUserByClerkId,
    user
      ? {
          clerkId: user.id,
        }
      : "skip"
  );
  const [isLoading, setIsLoading] = useState(false);
  const createCheckoutSession = useAction(api.stripe.createCheckoutSession);

  const userAccess = useQuery(
    api.users.getUserAccess,
    userData
      ? {
          userId: userData._id,
          courseId: courseId,
        }
      : "skip"
  ) || { hasAccess: false };

  const handlePurchase = async () => {
    if (!user) {
      alert("Please log in to purchase");
    }

    setIsLoading(true);

    try {
      const { checkoutUrl } = await createCheckoutSession({ courseId });
      // if there is a checkoutUrl, push the user to the checkout page
      if (checkoutUrl) {
        window.location.href = checkoutUrl;
      } else {
        throw new Error("Failed to create checkout session");
      }
    } catch (error) {
      // todo: handle error
      if (error instanceof ConvexError) {
        if (error.message.includes("Rate limit exceeded")) {
          toast.error(
            error.message || "Something went wrong. Please try again later."
          );
        }
      }
      console.log(error);
    }

    // await api.users.purchaseCourse({ courseId });
    setIsLoading(false);
  };

  if (!userAccess.hasAccess) {
    return (
      <Button variant="outline" onClick={handlePurchase} disabled={isLoading}>
        Enroll Now
      </Button>
    );
  }

  if (userAccess.hasAccess) {
    return <Button variant="outline">Enrolled</Button>;
  }

  if (isLoading) {
    return (
      <Button variant="outline">
        <Loader2Icon className="mr-2 size-4 animate-spin" />
        Processing...
      </Button>
    );
  }

  return <Button variant="outline">Enroll Now</Button>;
}
