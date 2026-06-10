import { Button, InputGroup, Chip, TextField } from "@heroui/react";
import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useGeneralData } from "../../Context/GeneralContext";
import { db } from "@firebase-config";
import { collection, getDocs } from "firebase/firestore";
import { useNavigate } from "react-router";
import { Search } from "lucide-react";

export default function SelectComp() {
  const navigate = useNavigate();
  const { theme, theame_color } = useGeneralData();

  const [companies, setCompanies] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [loading, setLoading] = useState(false);

  const normalizeCompany = (doc) => {
    const data = doc.data();

    return {
      id: doc.id,
      name: data?.name || "",
      address: data?.address || "",
      owner: data?.owner || "",
      designation: data?.profile || [],
      logos: data?.logos || [],
      topuplines: data?.topuplines || [],
      Plans: data?.Plans || [],
      profile: data?.profile || [],
      active: data?.active ?? false,
      launched: data?.launched ?? false,
    };
  };

  // ✅ Fetch with cleanup
  useEffect(() => {
    let cancelled = false;

    const fetchCompanies = async () => {
      setLoading(true);
      try {
        const snapshot = await getDocs(collection(db, "mlmcomp"));
        if (!cancelled) {
          const data = snapshot.docs.map((doc) =>
            normalizeCompany(doc)
          );
          
          setCompanies(data);
        }
      } catch (error) {
        console.error("Error fetching companies:", error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchCompanies();

    return () => {
      cancelled = true;
    };
  }, []);

  // ✅ Optimized filtering
  const filteredCompanies = useMemo(() => {
    if (!search.trim()) return companies;

    const q = search.toLowerCase();
    return companies.filter((item) =>
      item.name.toLowerCase().includes(q)
    );
  }, [search, companies]);

  // ✅ Toggle select
  const handleSelect = useCallback((company) => {
    setSelectedCompany((prev) =>
      prev?.id === company.id ? null : company
    );
  }, []);

  // ✅ Continue handler
  const handleContinue = useCallback(() => {
    if (!selectedCompany) {
      alert("Please select a company");
      return;
    }
    localStorage.setItem(
      "selectedCompany",
      JSON.stringify(selectedCompany)
    );
    navigate("/");
  }, [selectedCompany, navigate]);

  // ✅ Better logo handling
  const getLogo = (company) => {
    return (
      company?.logos?.find((l) => l?.link?.trim())?.link || "https://ui-avatars.com/api/?background=random&color=fff&name=" + encodeURIComponent(company.name)
    );
  };

  return (
    <div className="flex flex-col  bg-background relative overflow-hidden">
      {/* Decorative Background */}
      <div className="absolute top-0 left-0 right-0 h-64 bg-gradient-to-b from-accent/10 to-transparent pointer-events-none" />

      <div className="flex-1 w-full max-w-5xl mx-auto px-4 py-8 md:py-12 flex flex-col relative z-10">
        
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-display font-bold text-foreground mb-2">Select Your Company</h1>
          <p className="text-muted-foreground font-medium">Choose your MLM organization to get started</p>
        </div>

        {/* Search Bar */}
        <div className="w-full max-w-xl mx-auto mb-10">
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-muted-foreground group-focus-within:text-accent transition-colors" />
            </div>
            <input
              type="text"
              className="w-full h-14 pl-12 pr-4 rounded-2xl border border-border bg-white dark:bg-black/20 focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-all shadow-sm font-medium text-foreground text-base placeholder:text-muted-foreground"
              placeholder="Search companies by name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Grid Area */}
        <div className="flex-1 w-full pb-32">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="w-10 h-10 border-4 border-muted border-t-accent rounded-full animate-spin" />
              <p className="text-sm text-muted-foreground font-medium">Loading companies...</p>
            </div>
          ) : filteredCompanies.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                <Search className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-lg font-display font-bold text-foreground">No companies found</p>
              <p className="text-sm text-muted-foreground mt-1">Try adjusting your search terms</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
              {filteredCompanies.map((item) => {
                const isSelected = selectedCompany?.id === item.id;
                return (
                  <div
                    key={item.id}
                    onClick={() => handleSelect(item)}
                    className={`flex flex-col items-center gap-3 p-4 rounded-[24px] cursor-pointer transition-all duration-300 transform active:scale-95 border bg-white dark:bg-black/20 ${
                      isSelected
                        ? " ring-1 ring-accent ring-offset-2 dark:ring-offset-background shadow-lg scale-105 z-10"
                        : "border-border shadow-sm hover:shadow-md hover:border-accent/50"
                    }`}
                  >
                    <div className={`w-20 h-20 rounded-2xl overflow-hidden bg-white p-1 shadow-sm transition-all duration-300 ${isSelected ? "p-0" : ""}`}>
                      <img
                        className="w-full h-full object-contain rounded-xl"
                        src={getLogo(item)}
                        alt={item.name}
                        
                      />
                    </div>
                    
                    <p className={`font-display font-bold text-center text-sm line-clamp-2 leading-tight transition-colors ${
                      isSelected ? "text-accent" : "text-foreground"
                    }`}>
                      {item.name || "Unnamed Company"}
                    </p>
                    
                    {isSelected && (
                      <div className="absolute top-3 right-3 w-6 h-6 bg-accent rounded-full flex items-center justify-center shadow-md animate-in zoom-in duration-200">
                        <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Floating Action Bar */}
        <div className="fixed bottom-30 left-0 right-0 p-4 md:p-6 bg-gradient-to-t from-background via-background to-transparent z-50 pointer-events-none">
          <div className="max-w-md mx-auto pointer-events-auto">
            <Button 
              onClick={handleContinue} 
              disabled={!selectedCompany}
              className={`w-full h-14 rounded-2xl font-bold text-lg shadow-xl transition-all duration-300 ${
                selectedCompany 
                  ? "bg-accent text-white shadow-accent/30 hover:bg-accent/90 transform translate-y-0" 
                  : "bg-muted text-muted-foreground opacity-90 translate-y-2 pointer-events-none"
              }`}
            >
              {selectedCompany ? `Continue` : "Select a Company"}
            </Button>
          </div>
        </div>

      </div>
    </div>
  );
}
