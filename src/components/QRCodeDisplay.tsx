import { useQRCode } from "@/hooks/use-qr-code";

interface QRCodeDisplayProps {
  data: string;
  size?: number;
  showText?: boolean;
}

const QRCodeDisplay = ({ data, size = 140, showText = true }: QRCodeDisplayProps) => {
  const { cells, grid, cellSize } = useQRCode(data, size);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="p-3 bg-white rounded-xl shadow-card">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {cells.map((row, ri) =>
            row.map((filled, ci) =>
              filled ? (
                <rect
                  key={`${ri}-${ci}`}
                  x={ci * cellSize}
                  y={ri * cellSize}
                  width={cellSize}
                  height={cellSize}
                  rx={1}
                  className="fill-foreground"
                />
              ) : null
            )
          )}
        </svg>
      </div>
      {showText && (
        <p className="text-[9px] text-muted-foreground font-mono tracking-wider break-all text-center max-w-full px-2">{data}</p>
      )}
    </div>
  );
};

export default QRCodeDisplay;
