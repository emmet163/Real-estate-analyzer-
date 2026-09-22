import type { Metadata } from "next";
import "./globals.css";
import './research.css';
export const metadata: Metadata = {
  title: "Midwest Property Scout",
  description:
    "Wisconsin and Illinois rental investment research — synthetic demo",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
