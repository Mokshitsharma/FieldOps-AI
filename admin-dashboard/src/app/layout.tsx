import { ReactNode } from 'react';
import './globals.css';

export const metadata = {
  title: 'Movigo FieldOps Admin',
  description: 'Admin Portal for Field Officers and Calling Teams',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full antialiased bg-gray-50 text-gray-900">
        {children}
      </body>
    </html>
  );
}
