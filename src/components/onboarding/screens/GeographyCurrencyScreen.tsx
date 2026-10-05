import { useEffect, useState } from "react";
import { Input } from "../../ui/input";

interface GeographyCurrencyScreenProps {
  country: string;
  regionOrCity: string;
  currency: string;
  onCountryChange: (value: string) => void;
  onRegionOrCityChange: (value: string) => void;
  onCurrencyChange: (value: string) => void;
  onContinue: () => void;
  onBack: () => void;
}

const countryToCurrency: Record<string, string> = {
  "United Kingdom": "GBP",
  "United States": "USD",
  Ireland: "EUR",
  Germany: "EUR",
  France: "EUR",
  Netherlands: "EUR",
  Spain: "EUR",
  Italy: "EUR",
  Belgium: "EUR",
  Portugal: "EUR",
  "Czech Republic": "CZK",
  "United Arab Emirates": "AED",
  India: "INR",
  Australia: "AUD",
  "New Zealand": "NZD",
  "South Africa": "ZAR",
  Canada: "CAD",
};

const countryOptions = [
  "United Kingdom",
  "United States",
  "Canada",
  "Ireland",
  "France",
  "Germany",
  "Spain",
  "Italy",
  "Netherlands",
  "Belgium",
  "Portugal",
  "Czech Republic",
  "Australia",
  "New Zealand",
  "United Arab Emirates",
  "India",
  "South Africa",
  "Other",
];

const currencyOptions = [
  "GBP",
  "USD",
  "EUR",
  "CAD",
  "AUD",
  "NZD",
  "AED",
  "INR",
  "ZAR",
];

export function GeographyCurrencyScreen({
  country,
  regionOrCity,
  currency,
  onCountryChange,
  onRegionOrCityChange,
  onCurrencyChange,
  onContinue,
}: GeographyCurrencyScreenProps) {
  const [hasManuallySetCurrency, setHasManuallySetCurrency] = useState(false);

  // Auto-set currency when country changes, unless user has overridden
  useEffect(() => {
    if (hasManuallySetCurrency) return;
    if (!country || country === "Other") return;
    const mapped = countryToCurrency[country];
    if (mapped && mapped !== currency) {
      onCurrencyChange(mapped);
    }
  }, [country, currency, hasManuallySetCurrency, onCurrencyChange]);

  const handleRegionKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && country.trim() && currency.trim()) {
      onContinue();
    }
  };

  return (
    <div className="space-y-10 animate-fade-in-up">
      <h1 className="font-['Fraunces'] font-bold text-4xl">
        What country is your customer based in?
      </h1>
      <p className="text-foreground/70 max-w-md">
        This helps tailor pricing, ad targeting, and budget assumptions.
      </p>

      <div className="space-y-10 pt-2">
        <div className="space-y-3">
          <label className="text-sm text-foreground/70">Country *</label>
          <select
            value={country}
            onChange={(e) => {
              const nextCountry = e.target.value;
              onCountryChange(nextCountry);
            }}
            className="mt-2 w-full max-w-md border border-black rounded-design px-4 py-3 bg-white font-['Plus_Jakarta_Sans'] text-foreground"
          >
            <option value="">Select customer country</option>
            {countryOptions.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-3">
          <label className="text-sm text-foreground/70">
            Region / City (optional)
          </label>
          <Input
            type="text"
            value={regionOrCity}
            onChange={(e) => onRegionOrCityChange(e.target.value)}
            onKeyDown={handleRegionKeyDown}
            placeholder="e.g. California, London, Berlin"
            className="mt-2 w-full max-w-md border border-black rounded-design px-4 py-6 bg-white text-foreground placeholder:text-foreground/40"
          />
        </div>

        <div className="space-y-3">
          <label className="text-sm text-foreground/70">Currency *</label>
          <select
            value={currency}
            onChange={(e) => {
              setHasManuallySetCurrency(true);
              onCurrencyChange(e.target.value);
            }}
            className="mt-2 w-full max-w-md border border-black rounded-design px-4 py-3 bg-white font-['Plus_Jakarta_Sans'] text-foreground"
          >
            <option value="">Select currency</option>
            {currencyOptions.map((cur) => (
              <option key={cur} value={cur}>
                {cur}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
