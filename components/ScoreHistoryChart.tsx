"use client";

import {
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler,
);

const ScoreHistoryChart = ({ snapshots }: ScoreHistoryChartProps) => {
  if (!snapshots || snapshots.length === 0) {
    return (
      <div className="flex items-center justify-center h-[200px] text-14 text-gray-500">
        No historical data available yet. Your score history will appear here
        over time.
      </div>
    );
  }

  const labels = snapshots.map(s => {
    const date = new Date(s.timestamp);
    return date.toLocaleDateString("en-US", {
      month: "short",
      year: "2-digit",
    });
  });

  const scores = snapshots.map(s => s.estimatedScore);

  const data = {
    labels,
    datasets: [
      {
        label: "Credit Score",
        data: scores,
        borderColor: "#0179FE",
        backgroundColor: "rgba(1, 121, 254, 0.1)",
        borderWidth: 2,
        pointRadius: 4,
        pointBackgroundColor: "#0179FE",
        tension: 0.3,
        fill: true,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        min: 300,
        max: 850,
        ticks: {
          stepSize: 100,
          font: { size: 12 },
          color: "#667085",
        },
        grid: {
          color: "rgba(0, 0, 0, 0.05)",
        },
      },
      x: {
        ticks: {
          font: { size: 12 },
          color: "#667085",
        },
        grid: {
          display: false,
        },
      },
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "#101828",
        titleFont: { size: 12 },
        bodyFont: { size: 14 },
        padding: 10,
        displayColors: false,
      },
    },
  };

  return (
    <div className="h-[200px] sm:h-[250px] w-full">
      <Line data={data} options={options} />
    </div>
  );
};

export default ScoreHistoryChart;
