// Photo-gate utility: compress image, capture GPS + timestamp.

export interface PhotoGateResult {
  data_url: string;
  lat: number | null;
  lng: number | null;
  timestamp: string;
  gps_error?: string;
}

export async function compressImage(file: File, maxWidth = 1280, maxBytes = 200_000): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onerror = () => reject(r.error);
    r.onload = () => resolve(r.result as string);
    r.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = () => reject(new Error("Image load failed"));
    i.src = dataUrl;
  });

  const ratio = img.width > maxWidth ? maxWidth / img.width : 1;
  const w = Math.round(img.width * ratio);
  const h = Math.round(img.height * ratio);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0, w, h);

  // iteratively reduce quality
  let q = 0.85;
  let out = canvas.toDataURL("image/jpeg", q);
  while (out.length > maxBytes * 1.37 && q > 0.3) {
    q -= 0.1;
    out = canvas.toDataURL("image/jpeg", q);
  }
  return out;
}

export async function getGeolocation(): Promise<{ lat: number | null; lng: number | null; error?: string }> {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    return { lat: null, lng: null, error: "Geolocation not available" };
  }
  return new Promise((resolve) => {
    let done = false;
    const timeout = setTimeout(() => {
      if (!done) {
        done = true;
        resolve({ lat: null, lng: null, error: "GPS timeout" });
      }
    }, 6000);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (done) return;
        done = true;
        clearTimeout(timeout);
        resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      (err) => {
        if (done) return;
        done = true;
        clearTimeout(timeout);
        resolve({ lat: null, lng: null, error: err.message });
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 30000 },
    );
  });
}

export async function capturePhoto(file: File, lowBandwidth = false): Promise<PhotoGateResult> {
  const timestamp = new Date().toISOString();
  const [data_url, gps] = await Promise.all([
    compressImage(file, lowBandwidth ? 800 : 1280, lowBandwidth ? 100_000 : 200_000),
    getGeolocation(),
  ]);
  return {
    data_url,
    lat: gps.lat,
    lng: gps.lng,
    timestamp,
    gps_error: gps.error,
  };
}
