"use client";

import {
  ArcElement,
  Chart as ChartJS,
  Legend,
  Tooltip,
} from "chart.js";
import { Doughnut } from "react-chartjs-2";

ChartJS.register(ArcElement, Tooltip, Legend);

const CreditScoreGauge = ({ score, label }: CreditScoreGaugeProps) => {
  // Score range: 300-850
  const min = 300;
  const max = 850;
  const normalizedScore = Math.max(0, Math.min(1, (score - min) / (max - min)));

  // Compute gauge color based on score range
  const getGaugeColor = (s: number): string => {
    if (s >= 750) return "#16a34a";
    if (s >= 700) return "#65a30d";
    if (s >= 650) return "#ca8a04";
    if (s >= 600) return "#ea580c";
    return "#dc2626";
  };

  const gaugeColor = getGaugeColor(score);
  const remainingColor = "#e5e7eb";

  const data = {
    datasets: [
      {
        data: [normalizedScore * 100, (1 - normalizedScore) * 100],
        backgroundColor: [gaugeColor, remainingColor],
        borderWidth: 0,
        circumference: 240,
        rotation: 240,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: true,
    cutout: "75%",
    plugins: {
      legend: { display: false },
      tooltip: { enabled: false },
    },
  };

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-[200px] h-[200px] sm:w-[240px] sm:h-[240px]">
        <Doughnut data={data} options={options} />
        <div className="absolute inset-0 flex flex-col items-center justify-center pt-6">
          <span
            className="text-36 font-bold"
            style={{ color: gaugeColor }}
          >
            {score}
          </span>
          <span className="text-14 font-medium text-gray-600">{label}</span>
        </div>
      </div>
      <div className="flex justify-between w-full max-w-[240px] mt-2 px-2">
        <span className="text-12 text-gray-500">300</span>
        <span className="text-12 text-gray-500">850</span>
      </div>
      <div className="flex flex-wrap justify-center gap-3 mt-4">
        {[
          { label: "Excellent", color: "#16a34a", range: "750-850" },
          { label: "Good", color: "#65a30d", range: "700-749" },
          { label: "Fair", color: "#ca8a04", range: "650-699" },
          { label: "Poor", color: "#ea580c", range: "600-649" },
          { label: "Very Poor", color: "#dc2626", range: "300-599" },
        ].map(item => (
          <div key={item.label} className="flex items-center gap-1">
            <div
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-10 text-gray-600">
              {item.label} ({item.range})
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CreditScoreGauge;
