import { formatWon } from "@/lib/format";

export interface DailySales {
  date: string; // "M/D"
  amount: number;
}

// 외부 차트 라이브러리 없이 최근 매출 추이를 막대그래프로 보여주는 가벼운 SVG 컴포넌트.
export function SalesTrendChart({ data }: { data: DailySales[] }) {
  const max = Math.max(1, ...data.map((d) => d.amount));
  const width = 100 / data.length;

  return (
    <div>
      <div className="flex items-end gap-1 h-32">
        {data.map((d) => (
          <div key={d.date} className="flex-1 flex flex-col items-center justify-end h-full group relative">
            <div
              className="w-full bg-primary/80 rounded-t hover:bg-primary transition-colors"
              style={{ height: `${(d.amount / max) * 100}%`, minHeight: d.amount > 0 ? "3px" : "0" }}
            />
            <div className="absolute bottom-full mb-1 hidden group-hover:block bg-gray-900 text-white text-[11px] rounded px-2 py-1 whitespace-nowrap z-10">
              {d.date}: {formatWon(d.amount)}
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-1 mt-1.5">
        {data.map((d, i) => (
          <div
            key={d.date}
            className="flex-1 text-center text-[10px] text-gray-400"
            style={{ width: `${width}%` }}
          >
            {i % 2 === 0 ? d.date : ""}
          </div>
        ))}
      </div>
    </div>
  );
}
