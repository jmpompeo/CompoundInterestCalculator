// src/app/test/layout.tsx
import React, { ReactNode } from 'react';
import Header from '../../components/Header';
import styles from './layout.module.css';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Test Page - My Next.js App',
  description: 'This is a test page',
};

interface LayoutProps {
  children: ReactNode;
}

const TestLayout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className={styles.layout}>
      <Header />
      <main className={styles.main}>
        {children}
      </main>
    </div>
  );
};

export default TestLayout;
