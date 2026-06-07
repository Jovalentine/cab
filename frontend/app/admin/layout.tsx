"use client";

import Link from "next/link";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {

  return (

    <div className="
      min-h-screen
      flex
      bg-gray-100
    ">

      {/* SIDEBAR */}

      <aside className="
        w-72
        bg-black
        text-white
        p-6
        flex
        flex-col
      ">

        <h1 className="
          text-3xl
          font-bold
          mb-10
        ">

          Admin Panel

        </h1>

        <nav className="
          flex
          flex-col
          gap-4
        ">

          <SidebarLink
            href="/admin"
            label="Dashboard"
          />

          <SidebarLink
            href="/admin/rides"
            label="Ride Monitoring"
          />

          <SidebarLink
            href="/admin/drivers"
            label="Driver Management"
          />

          <SidebarLink
            href="/admin/create-driver"
            label="Create Driver"
          />

        </nav>

      </aside>

      {/* MAIN CONTENT */}

      <main className="
        flex-1
        p-8
      ">

        {children}

      </main>

    </div>
  );
}


function SidebarLink({
  href,
  label
}: {
  href: string;
  label: string;
}) {

  return (

    <Link
      href={href}
      className="
        bg-gray-900
        hover:bg-gray-800
        px-5
        py-4
        rounded-2xl
        transition
      "
    >

      {label}

    </Link>

  );
}