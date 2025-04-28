import { useState } from "react";

import { AdminContext } from "./context";

import type { IAdmin } from "@/types/admin";

interface IAdminProvider {
  children: React.ReactNode;
  initialState: IAdmin;
}

export function AdminProvider({ children, initialState }: IAdminProvider) {
  const [admin, setAdmin] = useState<IAdmin | undefined>(initialState);

  return (
    <AdminContext.Provider value={{ admin, setAdmin }}>
      {children}
    </AdminContext.Provider>
  );
}
