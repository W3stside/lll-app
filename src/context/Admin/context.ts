import { createContext, useContext } from "react";

import type { IAdmin } from "@/types/admin";

interface IAdminContext {
  admin: IAdmin | undefined;
  error: Error | null;
}

export const AdminContext = createContext<IAdminContext | undefined>(undefined);

export const useAdmin = () => {
  const context = useContext(AdminContext);
  if (context === undefined) {
    throw new Error("useAdmin must be used within a AdminProvider");
  }

  return context;
};
