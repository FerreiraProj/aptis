// Root layout — minimal, only sets up HTML structure
// Locale-specific providers are in [locale]/layout.tsx
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
