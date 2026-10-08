import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
} from "react";

type User = {
  Userno: string;
  Name: string;
  Designation: string;
  TelephoneNo: string;
  NIC_no: string;
  salary_scale: string;
  Private_Addr: string;
  Email: string;
  Vip: string;
  Status: string | null;
  Common_exception: string | null;
  Errormsg: string | null;
  Logged: boolean;
  RoleId?: string;
  Role?: string;
  Level?: number;
  AreaCode?: string;
  AreaName?: string;
  ProvinceCode?: string;
  ProvinceName?: string;
  RegionCode?: string;
  RegionName?: string;
  Company?: string;
};

type UserContextType = {
  user: User;
  setUser: (user: User) => void;
};

const userContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User>(() => {
    const stored = localStorage.getItem("userData");
    return stored
      ? JSON.parse(stored)
      : {
          Userno: "",
          Name: "",
          Designation: "",
          TelephoneNo: "",
          NIC_no: "",
          salary_scale: "",
          Private_Addr: "",
          Email: "",
          Vip: "",
          Status: "",
          Common_exception: "",
          Errormsg: "",
          Logged: false,
          Level: 0,
          AreaCode: "",
          AreaName: "",
          ProvinceCode: "",
          ProvinceName: "",
          RegionCode: "",
          RegionName: "",
        };
  });

  useEffect(() => {
    localStorage.setItem("userData", JSON.stringify(user));
  }, [user]);

  // Recover access details for sessions created while the role API was offline.
  useEffect(() => {
    if (!user.Logged || !user.Userno || user.Level) return;
    let cancelled = false;
    const loadAccessProfile = async () => {
      try {
        const response = await fetch(`/misapi/api/billmap/${encodeURIComponent(user.Userno.trim())}`);
        if (!response.ok) return;
        const payload = await response.json();
        const entry = Array.isArray(payload) ? payload[0] : payload?.data?.[0];
        const level = Number(entry?.LevelNo);
        if (cancelled || !Number.isFinite(level) || level <= 0) return;
        const code = String(entry.BillMap ?? "").trim();
        const name = String(entry.CompanyName ?? "").trim();
        setUser((previous) => ({
          ...previous,
          Level: level,
          ...(level >= 80 ? {} : level >= 70
            ? { RegionCode: code, RegionName: name }
            : level >= 60
              ? { ProvinceCode: code, ProvinceName: name }
              : { AreaCode: code, AreaName: name }),
        }));
      } catch {
        // Keep the saved session; the dashboard reports API errors separately.
      }
    };
    void loadAccessProfile();
    return () => { cancelled = true; };
  }, [user.Logged, user.Userno, user.Level]);

  return (
    <userContext.Provider value={{ user, setUser }}>
      {children}
    </userContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(userContext);
  if (!context) {
    throw new Error("User must be used within userprovider");
  }
  return context;
};
