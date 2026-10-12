import { ArrowRight, LogIn, UserPlus } from "lucide-react";
import { Link } from "react-router-dom";

export default function AuthPage() {
  return (
    <main className="min-h-screen bg-neutral-950 px-6 py-10 text-white">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-5xl items-center justify-center">
        <section className="grid w-full overflow-hidden rounded-3xl border border-neutral-800 bg-neutral-900 shadow-2xl lg:grid-cols-[1.1fr_0.9fr]">
          <div className="relative overflow-hidden bg-yellow-400 p-8 text-neutral-950 sm:p-12">
            <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full border-28 border-yellow-300/70" />
            <div className="relative max-w-md">
              <div className="mb-14 flex h-12 w-12 items-center justify-center rounded-2xl bg-neutral-950 text-xl font-bold text-yellow-400">
                B
              </div>
              <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-neutral-800">
                Welcome to bchat
              </p>
              <h1 className="text-4xl font-bold leading-tight sm:text-5xl">
                Make room for better conversations.
              </h1>
              <p className="mt-5 max-w-sm text-neutral-800/80">
                Keep up with your people, share what matters, and find your next great conversation.
              </p>
            </div>
          </div>

          <div className="flex flex-col justify-center p-8 sm:p-12">
            <p className="text-sm text-neutral-400">Your community is waiting</p>
            <h2 className="mt-2 text-2xl font-semibold">How would you like to continue?</h2>

            <div className="mt-8 space-y-3">
              <Link
                to="/login"
                className="group flex items-center justify-between rounded-2xl border border-neutral-700 bg-neutral-800 p-4 transition hover:border-yellow-400 hover:bg-neutral-750"
              >
                <span className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-yellow-400 text-neutral-950">
                    <LogIn size={19} />
                  </span>
                  <span>
                    <span className="block font-semibold">Log in</span>
                    <span className="block text-sm text-neutral-400">Continue where you left off</span>
                  </span>
                </span>
                <ArrowRight size={18} className="text-neutral-500 transition group-hover:translate-x-1 group-hover:text-yellow-400" />
              </Link>

              <Link
                to="/register"
                className="group flex items-center justify-between rounded-2xl border border-neutral-700 bg-neutral-800 p-4 transition hover:border-yellow-400 hover:bg-neutral-750"
              >
                <span className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-700 text-yellow-400">
                    <UserPlus size={19} />
                  </span>
                  <span>
                    <span className="block font-semibold">Create an account</span>
                    <span className="block text-sm text-neutral-400">Join the conversation</span>
                  </span>
                </span>
                <ArrowRight size={18} className="text-neutral-500 transition group-hover:translate-x-1 group-hover:text-yellow-400" />
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
