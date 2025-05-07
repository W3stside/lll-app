import { useQuery } from "@tanstack/react-query";

import { AdminContext } from "./context";

import { Collection } from "@/types";
import type { IAdmin } from "@/types/admin";
import { dbRequest } from "@/utils/api/dbRequest";

interface IAdminProvider {
  children: React.ReactNode;
  initialState: IAdmin;
}

export function AdminProvider({ children, initialState }: IAdminProvider) {
  const {
    data: [admin],
    error,
  } = useQuery({
    queryKey: ["admin"],
    queryFn: async () => {
      try {
        const { data, error: dbError } = await dbRequest<IAdmin[]>(
          "get",
          Collection.ADMIN,
        );

        if (dbError !== null) throw dbError;

        return data;
      } catch (e) {
        throw e instanceof Error ? e : new Error("Unknown error");
      }
    },
    initialData: [initialState],
    initialDataUpdatedAt: 0,
  });

  return (
    <AdminContext.Provider value={{ admin, error }}>
      {children}
    </AdminContext.Provider>
  );
}
