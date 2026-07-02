import Link from "next/link";
import { Montserrat, Geist_Mono } from "next/font/google";
import "./globals.css";

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Bid Sight",
  description: "Bid Sight learning and simulation workspace",
};

function UserIcon(props) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M18 20a6 6 0 0 0-12 0" />
      <circle cx="12" cy="10" r="4" />
    </svg>
  );
}

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${montserrat.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-background text-foreground">
        <div className="min-h-screen bg-background">
          <header className="px-6 py-5">
            <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-6">
              <div className="flex items-center gap-8">
                <Link href="/" className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sidebar-primary text-xl font-semibold text-sidebar-primary-foreground">
                    BS
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Drill your bids
                    </p>
                    <p className="text-4xl font-semibold tracking-tight text-sidebar-foreground">
                      Bid Sight
                    </p>
                  </div>
                </Link>

                <nav className="flex items-center gap-2">
                  <Link
                    href="/bid-simulation"
                    className="rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  >
                    Bid Simulation
                  </Link>
                  <Link
                    href="/leaderboard"
                    className="rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  >
                    Leaderboard
                  </Link>
                </nav>
              </div>

              <Link
                href="/user"
                aria-label="User page"
                className="flex h-11 w-11 items-center justify-center rounded-full text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              >
                <UserIcon className="h-5 w-5" />
              </Link>
            </div>
          </header>

          <main className="min-w-0">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
