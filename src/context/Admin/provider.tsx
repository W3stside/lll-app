import { useState } from "react";

import { AdminContext } from "./context";

import type { IAdmin } from "@/types/admin";

interface IAdminProvider {
  children: React.ReactNode;
}

export function AdminProvider({ children }: IAdminProvider) {
  const [admin, setAdmin] = useState<IAdmin | undefined>();

  return (
    <AdminContext.Provider value={{ admin, setAdmin }}>
      {children}
    </AdminContext.Provider>
  );
}
