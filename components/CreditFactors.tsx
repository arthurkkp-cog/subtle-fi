"use client";

import Image from "next/image";

const CreditFactors = ({ factors }: CreditFactorsProps) => {
  if (!factors || factors.length === 0) {
    return (
      <div className="flex items-center justify-center h-[100px] text-14 text-gray-500">
        No impact factors available.
      </div>
    );
  }

  const getImpactIcon = (impact: CreditFactor["impact"]): string => {
    switch (impact) {
      case "positive":
        return "/icons/arrow-up.svg";
      case "negative":
        return "/icons/arrow-down.svg";
      default:
        return "/icons/arrow-right.svg";
    }
  };

  const getImpactColor = (
    impact: CreditFactor["impact"],
  ): { bg: string; text: string } => {
    switch (impact) {
      case "positive":
        return { bg: "bg-success-50", text: "text-success-700" };
      case "negative":
        return { bg: "bg-pink-25", text: "text-pink-700" };
      default:
        return { bg: "bg-blue-25", text: "text-blue-700" };
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {factors.map((factor, index) => {
        const colors = getImpactColor(factor.impact);
        return (
          <div
            key={`${factor.label}-${index}`}
            className={`flex items-start gap-3 rounded-lg p-3 ${colors.bg}`}
          >
            <div className="flex-shrink-0 mt-0.5">
              <Image
                src={getImpactIcon(factor.impact)}
                alt={factor.impact}
                width={16}
                height={16}
              />
            </div>
            <div className="flex flex-col gap-0.5">
              <span className={`text-14 font-medium ${colors.text}`}>
                {factor.label}
              </span>
              <span className="text-12 text-gray-600">
                {factor.description}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default CreditFactors;
