import { createContext, useContext } from "react";

import type { IAdmin } from "@/types";

interface IAdminContext {
  admin: IAdmin | undefined;
  setAdmin: React.Dispatch<React.SetStateAction<IAdmin | undefined>>;
}

export const AdminContext = createContext<IAdminContext | undefined>(undefined);

export const useAdmin = () => {
  const context = useContext(AdminContext);
  if (context === undefined) {
    throw new Error("useAdmin must be used within a AdminProvider");
  }

  return context;
};
