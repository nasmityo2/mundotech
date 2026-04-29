'use client';

import Sidebar from './Sidebar';

const AdminDashboard = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="flex-grow p-8 overflow-y-auto">
        {children}
      </main>
    </div>
  );
};

export default AdminDashboard;
