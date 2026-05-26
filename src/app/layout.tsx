import type { Metadata } from 'next';
import './globals.css';

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
          <nav className="navbar animate-fade-in">
            <div className="navbar-brand">
              <span className="gradient-text">Aadhaar Trust Registry</span>
            </div>
            <div className="navbar-links">
              <a href="/" className="active">Dashboard</a>
              <a href="/docs">Developer Docs</a>
              <a href="/api/lote" target="_blank">LoTE API</a>
              <a href="/api/crl" target="_blank">Revocation List (CRL)</a>
              <a href="/.well-known/openid-federation" target="_blank">OpenID Federation</a>
              <a href="/onboarding">Onboard</a>
            </div>
          </nav>
          <main>
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
