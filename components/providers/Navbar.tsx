import Link from "next/link";
import {
  BookOpenIcon,
  CreditCardIcon,
  GraduationCapIcon,
  LogInIcon,
  LogOutIcon,
  ZapIcon,
} from "lucide-react";
import React from "react";
import {
  SignedIn,
  SignedOut,
  SignInButton,
  SignOutButton,
  UserButton,
} from "@clerk/nextjs";
import { Button } from "../ui/button";

export default function Navbar() {
  return (
    <nav className="flex justify-between items-center py-4 px-6 bg-background border-b">
      <Link
        href="/"
        className="text-xl font-extrabold text-primary flex items-center gap-2"
      >
        MasterClass
        <GraduationCapIcon className="size-6" />
      </Link>
      <div className="flex items-center space-x-1 sm:space-x-4">
        <Link
          href="/courses"
          className="flex items-center gap-1 px-3 py-2 rounded-md text-mute-foreground hover:text-primary hover:bg-secondary transition-colors"
        >
          <BookOpenIcon className="size-4" />
          <span className="hidden sm:inline">Courses</span>
        </Link>
        <Link
          href="/pro"
          className="flex items-center gap-1 px-3 py-2 rounded-md text-mute-foreground hover:text-primary hover:bg-secondary transition-colors"
        >
          <ZapIcon className="size-4" />
          <span className="hidden sm:inline">Pro</span>
        </Link>

        <SignedIn>
          <Link href="/billing">
            <Button variant="outline" className="flex items-center gap-2">
              <CreditCardIcon className="size-4" />
              <span className="hidden sm:inline">Billing</span>
            </Button>
          </Link>
        </SignedIn>

        <UserButton />

        <SignedIn>
          <SignOutButton>
            <Button variant="outline" className="flex items-center gap-2">
              <LogOutIcon className="size-4" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </SignOutButton>
        </SignedIn>

        <SignedOut>
          {/* allow the popup to open up in a modal */}
          <SignInButton mode="modal">
            <Button variant="outline" className="flex items-center gap-2">
              <LogInIcon className="size-4" />
              <span className="hidden sm:inline">Login</span>
            </Button>
          </SignInButton>
        </SignedOut>
      </div>
    </nav>
  );
}
