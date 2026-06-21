import { NavLink, useNavigate } from "react-router-dom";
import { useState } from "react";

const NAV_LINKS = [
  { to: "/dashboard", label: "Tableau de bord" },
  { to: "/analyse", label: "Analyse IA" },
  { to: "/barcode", label: "Scanner" },
  { to: "/recettes", label: "Recettes" },
  { to: "/historique", label: "Historique" },
  { to: "/profil", label: "Profil" },
];

export default function Navbar() {
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const logout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between h-16">

        {/* LOGO */}
        <NavLink to="/dashboard" className="flex items-center gap-2.5 no-underline">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-emerald-500">
            <svg width="18" height="18" fill="none" stroke="white" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-gray-900 font-bold text-base tracking-tight">
              Nutri<span className="text-emerald-500">Vision</span>
            </span>
            <span className="text-gray-400 text-[10px] font-medium tracking-widest uppercase">Nutrition par IA</span>
          </div>
        </NavLink>

        {/* LIENS DESKTOP */}
        <div className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 ` +
                (isActive
                  ? "bg-emerald-50 text-emerald-600 font-semibold"
                  : "text-gray-500 hover:text-gray-900 hover:bg-gray-100")
              }
            >
              {label}
            </NavLink>
          ))}
        </div>

        {/* BOUTON DÉCONNEXION */}
        <div className="hidden md:flex items-center gap-3">
          <div className="w-px h-5 bg-gray-200" />
          <button
            onClick={logout}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-gray-500 hover:text-red-500 hover:bg-red-50 transition-all duration-150"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Se déconnecter
          </button>
        </div>

        {/* HAMBURGER MOBILE */}
        <button
          onClick={() => setMobileOpen((v) => !v)}
          className="md:hidden flex items-center justify-center w-9 h-9 rounded-lg text-gray-500 hover:bg-gray-100 transition"
        >
          {mobileOpen ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {/* MENU MOBILE */}
      {mobileOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white px-4 py-3 space-y-1">
          {NAV_LINKS.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `block px-4 py-2.5 rounded-lg text-sm font-medium transition-all ` +
                (isActive
                  ? "bg-emerald-50 text-emerald-600"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900")
              }
            >
              {label}
            </NavLink>
          ))}
          <div className="pt-1 border-t border-gray-100">
            <button
              onClick={logout}
              className="w-full flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-red-500 hover:bg-red-50 transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Se déconnecter
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}