import '../styles/globals.css';
import { QueryProvider } from '../providers/QueryProvider';
import { ThemeProvider } from '../providers/ThemeProvider';
import { AuthProvider } from '../providers/AuthProvider';
import { ModalProvider } from '../providers/ModalProvider';
import { ReactNode } from 'react';

export const metadata = {
  title: 'Expense Tracker',
  description: 'Enterprise expense management and compliance platform',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans antialiased">
        <QueryProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <AuthProvider>
              <ModalProvider>{children}</ModalProvider>
            </AuthProvider>
          </ThemeProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
