import { SignedIn, SignedOut } from "@clerk/nextjs";

export default function Home() {
  return (
    <main className="p-4">
      <SignedOut>
        <h1 className="text-2xl font-bold flex justify-center">
          Please Sign in to use the app
        </h1>
      </SignedOut>
      <SignedIn>
        <h1 className="text-2xl font-bold flex justify-center">
          Welcome to your app
        </h1>
      </SignedIn>
    </main>
  );
}
