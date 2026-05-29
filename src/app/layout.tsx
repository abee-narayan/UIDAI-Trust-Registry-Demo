import type { Metadata } from 'next';
import './globals.css';
import Navbar from './Navbar';

export const metadata: Metadata = {
  title: 'Aadhaar Trust Registry',
  description: 'European Union modeled Trust Registry for Aadhaar Verifiers',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div className="container">
          <Navbar />
          <main>
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
