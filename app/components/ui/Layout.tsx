'use client';

import React, { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import Header from './Header';
import { cn } from '@/app/lib/utils';
import { useMediaQuery } from '../hooks/useMediaQuery';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const isMobile = useMediaQuery('(max-width: 768px)');

  useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false);
    } else {
      setSidebarOpen(true);
    }
  }, [isMobile]);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const closeSidebar = () => {
    if (isMobile) {
      setSidebarOpen(false);
    }
  };

  return (
    <div className="h-screen overflow-hidden bg-gray-50 dark:bg-gray-950 flex">
      <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} />

      <div
        className={cn(
          'flex-1 flex flex-col h-full transition-all duration-300',
          !isMobile && sidebarOpen ? 'ml-64' : 'ml-0',
          isMobile && 'w-full'
        )}
        style={{
          marginLeft: !isMobile && sidebarOpen ? '16rem' : '0px',
        }}
      >
        <Header onMenuClick={toggleSidebar} />
        
        {/* ✅ Add inline styles to hide scrollbar */}
        <main 
          className="flex-1 overflow-y-auto p-4 md:p-6"
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
        >
          <div className="w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}