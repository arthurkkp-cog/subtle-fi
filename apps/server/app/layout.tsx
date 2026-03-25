export const metadata = {
  title: "SubtleTech Banking API",
  description: "SubtleTech Banking API Server",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
