import QRCode from "react-qr-code";

interface QRCodeDisplayProps {
  data: string;
  size?: number;
  showText?: boolean;
}

const QRCodeDisplay = ({ data, size = 140, showText = true }: QRCodeDisplayProps) => (
  <div className="flex flex-col items-center gap-2">
    <div className="p-3 bg-white rounded-xl shadow-card">
      <QRCode
        value={data}
        size={size}
        bgColor="#FFFFFF"
        fgColor="#0F1F18"
        level="M"
        style={{ height: "auto", maxWidth: "100%", width: size }}
      />
    </div>
    {showText && (
      <p className="text-[9px] text-muted-foreground font-mono tracking-wider break-all text-center max-w-full px-2">{data}</p>
    )}
  </div>
);

export default QRCodeDisplay;
