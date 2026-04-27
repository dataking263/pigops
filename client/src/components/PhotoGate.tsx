import { useRef, useState } from "react";
import { Camera, MapPin, AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { capturePhoto, type PhotoGateResult } from "@/lib/photoGate";
import { useApp } from "@/contexts/AppContext";
import { useQuery } from "@tanstack/react-query";

export function PhotoGate({
  value,
  onChange,
  required = true,
}: {
  value: PhotoGateResult | null;
  onChange: (v: PhotoGateResult | null) => void;
  required?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const { data: settings } = useQuery<any>({ queryKey: ["/api/settings"] });
  const lowBw = !!settings?.low_bandwidth_mode;

  const handleFile = async (file: File) => {
    setBusy(true);
    try {
      const result = await capturePhoto(file, lowBw);
      onChange(result);
    } finally {
      setBusy(false);
    }
  };

  if (value) {
    return (
      <div className="rounded-lg border border-border overflow-hidden bg-card">
        <div className="relative">
          <img src={value.data_url} alt="Captured" className="w-full max-h-72 object-cover" data-testid="img-photo-preview" />
          <button
            type="button"
            onClick={() => onChange(null)}
            className="absolute top-2 right-2 h-8 w-8 grid place-items-center rounded-full bg-black/60 text-white hover:bg-black/80"
            data-testid="button-remove-photo"
            aria-label="Remove photo"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="px-3 py-2 text-[11px] text-muted-foreground border-t border-border space-y-0.5">
          <div className="flex items-center gap-1 tabular-nums">
            <MapPin className="h-3 w-3" />
            {value.lat !== null && value.lng !== null ? (
              <span data-testid="text-photo-gps">
                {value.lat.toFixed(5)}, {value.lng.toFixed(5)}
              </span>
            ) : (
              <span className="pill-warn px-1.5 py-0.5 rounded inline-flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" /> GPS unavailable {value.gps_error ? `(${value.gps_error})` : ""}
              </span>
            )}
          </div>
          <div className="tabular-nums">
            <span className="font-medium text-foreground">Captured: </span>
            {new Date(value.timestamp).toLocaleString()}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        data-testid="input-photo"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = "";
        }}
      />
      <Button
        type="button"
        variant="outline"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        className="w-full h-24 flex flex-col gap-1.5 border-dashed"
        data-testid="button-take-photo"
      >
        <Camera className="h-6 w-6 text-primary" />
        <span className="text-sm font-medium">{busy ? "Compressing…" : "Take photo / proof of life"}</span>
        <span className="text-[11px] text-muted-foreground font-normal">
          {required ? "Required · " : ""}Camera + GPS + timestamp
        </span>
      </Button>
    </div>
  );
}
