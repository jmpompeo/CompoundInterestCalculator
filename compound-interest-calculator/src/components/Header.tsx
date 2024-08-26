// src/components/Header.tsx
import React from 'react';
import Link from 'next/link';
import styles from './Header.module.css';

const Header: React.FC = () => {
  return (
    <header>
      <h1>Welcome to My Next.js App</h1>
      <nav>
        <div className={styles.link}>
          <Link href="/">Home</Link>
        </div>
        <div className={styles.link}>
          <Link href="/test">Test</Link>
        </div>
      </nav>
    </header>
  );
};

export default Header;
