import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Share2, Loader2, Link } from "lucide-react";
import tidymateIconSrc from "@/assets/tidymate-icon.png";

interface LevelUpShareCardProps {
  level: number;
  badge: {
    title: string;
    subtitle: string;
    emoji: string;
    shareTagline: string;
  };
}

const CANVAS_W = 1080;
const CANVAS_H = 1080;
const DISPLAY_SCALE = 0.5;

async function loadImageSafe(url: string): Promise<HTMLImageElement | null> {
  if (!url) return null;
  return new Promise((resolve) => {
    const img = new Image();
    if (!url.startsWith("data:")) img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

async function generateQRDataUrl(text: string, size: number): Promise<string | null> {
  try {
    const QRCode = await import("https://cdn.jsdelivr.net/npm/qrcode@1.5.3/+esm" as any);
    return await QRCode.toDataURL(text, {
      width: size,
      margin: 1,
      color: { dark: "#0D5A38", light: "#FFFFFF" },
    });
  } catch {
    return null;
  }
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number
): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = word;
      if (lines.length >= maxLines) break;
    } else {
      current = test;
    }
  }
  if (current && lines.length < maxLines) lines.push(current);
  return lines.slice(0, maxLines);
}

const LevelUpShareCard = ({ level, badge }: LevelUpShareCardProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drawing, setDrawing] = useState(true);
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  useEffect(() => {
    const font900 = new FontFace(
      "Nunito",
      "url(https://fonts.gstatic.com/s/nunito/v25/XRXI3I6Li01BKofiOc5wtlZ2di8HDDqhSOQ.woff2)",
      { weight: "900" }
    );
    const font700 = new FontFace(
      "Nunito",
      "url(https://fonts.gstatic.com/s/nunito/v25/XRXI3I6Li01BKofiOc5wtlZ2di8HFjqhSOQ.woff2)",
      { weight: "700" }
    );
    const font600 = new FontFace(
      "Nunito",
      "url(https://fonts.gstatic.com/s/nunito/v25/XRXI3I6Li01BKofiOc5wtlZ2di8HITqhSOQ.woff2)",
      { weight: "600" }
    );
    const font400 = new FontFace(
      "Nunito",
      "url(https://fonts.gstatic.com/s/nunito/v25/XRXI3I6Li01BKofiOc5wtlZ2di8HLjqh.woff2)",
      { weight: "400" }
    );
    Promise.all([font900.load(), font700.load(), font600.load(), font400.load()])
      .then((fonts) => { fonts.forEach((f) => document.fonts.add(f)); setFontsLoaded(true); })
      .catch(() => setFontsLoaded(true));
  }, []);

  useEffect(() => {
    if (!fontsLoaded) return;
    let cancelled = false;
    setDrawing(true);

    const draw = async () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const [logoImg, qrDataUrl] = await Promise.all([
        loadImageSafe(tidymateIconSrc),
        generateQRDataUrl("https://tidymate.app", 140),
      ]);
      if (cancelled) return;

      // ── Background: full white ────────────────────────────────────────────────
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      // ── Top band: brand green ─────────────────────────────────────────────────
      const bandH = 440;
      const bandGrad = ctx.createLinearGradient(0, 0, CANVAS_W, bandH);
      bandGrad.addColorStop(0, "#09814A");
      bandGrad.addColorStop(1, "#0D9C6B");
      ctx.fillStyle = bandGrad;
      ctx.fillRect(0, 0, CANVAS_W, bandH);

      // Subtle radial highlight in band top-center
      const shine = ctx.createRadialGradient(CANVAS_W / 2, -60, 0, CANVAS_W / 2, -60, 600);
      shine.addColorStop(0, "rgba(255,255,255,0.14)");
      shine.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = shine;
      ctx.fillRect(0, 0, CANVAS_W, bandH);

      // Decorative ring pattern (top-right corner)
      ctx.save();
      ctx.globalAlpha = 0.08;
      ctx.strokeStyle = "#FFFFFF";
      ctx.lineWidth = 2;
      for (let r = 60; r <= 260; r += 40) {
        ctx.beginPath();
        ctx.arc(CANVAS_W + 10, -10, r, 0, Math.PI * 2);
        ctx.stroke();
      }
      // bottom-left corner rings
      for (let r = 60; r <= 200; r += 40) {
        ctx.beginPath();
        ctx.arc(-10, bandH + 10, r, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();

      // ── Emoji ─────────────────────────────────────────────────────────────────
      ctx.font = "120px 'Segoe UI Emoji', 'Apple Color Emoji', sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(badge.emoji, CANVAS_W / 2, 172);

      // ── LEVEL X label ─────────────────────────────────────────────────────────
      ctx.font = "900 52px 'Nunito', sans-serif";
      ctx.fillStyle = "rgba(255,255,255,0.70)";
      ctx.textAlign = "center";
      ctx.textBaseline = "alphabetic";
      ctx.fillText(`LEVEL ${level}`, CANVAS_W / 2, 295);

      // ── Badge title ───────────────────────────────────────────────────────────
      ctx.font = "900 64px 'Nunito', sans-serif";
      ctx.fillStyle = "#FFFFFF";
      ctx.fillText(badge.title, CANVAS_W / 2, 380);

      // ── White bottom section ──────────────────────────────────────────────────
      // Smooth wave connector
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(0, bandH - 32);
      ctx.bezierCurveTo(CANVAS_W * 0.25, bandH + 32, CANVAS_W * 0.75, bandH - 48, CANVAS_W, bandH + 10);
      ctx.lineTo(CANVAS_W, CANVAS_H);
      ctx.lineTo(0, CANVAS_H);
      ctx.closePath();
      ctx.fillStyle = "#FFFFFF";
      ctx.fill();
      ctx.restore();

      // ── Subtitle text ─────────────────────────────────────────────────────────
      const contentStartY = bandH + 60;
      ctx.font = "700 40px 'Nunito', sans-serif";
      ctx.fillStyle = "#1a1a1a";
      ctx.textAlign = "center";
      const subtitleLines = wrapText(ctx, badge.subtitle, 800, 2);
      subtitleLines.forEach((line, i) => {
        ctx.fillText(line, CANVAS_W / 2, contentStartY + i * 56);
      });

      // ── Tagline text ──────────────────────────────────────────────────────────
      const taglineY = contentStartY + subtitleLines.length * 56 + 48;
      ctx.font = "400 34px 'Nunito', sans-serif";
      ctx.fillStyle = "#6b7280";
      const taglineLines = wrapText(ctx, `"${badge.shareTagline}"`, 820, 2);
      taglineLines.forEach((line, i) => {
        ctx.fillText(line, CANVAS_W / 2, taglineY + i * 48);
      });

      // ── Decorative dots row ───────────────────────────────────────────────────
      const dotsY = taglineY + taglineLines.length * 48 + 40;
      ctx.fillStyle = "rgba(13, 156, 107, 0.30)";
      for (let di = -3; di <= 3; di++) {
        ctx.beginPath();
        ctx.arc(CANVAS_W / 2 + di * 22, dotsY, di === 0 ? 5 : 3.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // ── Footer divider ────────────────────────────────────────────────────────
      const footerY = 880;
      const fdGrad = ctx.createLinearGradient(100, 0, CANVAS_W - 100, 0);
      fdGrad.addColorStop(0, "rgba(13,156,107,0)");
      fdGrad.addColorStop(0.3, "rgba(13,156,107,0.35)");
      fdGrad.addColorStop(0.7, "rgba(13,156,107,0.35)");
      fdGrad.addColorStop(1, "rgba(13,156,107,0)");
      ctx.save();
      ctx.strokeStyle = fdGrad;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(100, footerY);
      ctx.lineTo(CANVAS_W - 100, footerY);
      ctx.stroke();
      ctx.restore();

      // ── Footer: icon + URL + QR ───────────────────────────────────────────────
      const footerMidY = footerY + 80;

      // Icon left
      const iconSize = 52;
      if (logoImg) {
        ctx.drawImage(logoImg, 100, footerMidY - iconSize / 2, iconSize, iconSize);
        ctx.font = "700 28px 'Nunito', sans-serif";
        ctx.fillStyle = "#0D9C6B";
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.fillText("TidyMate", 162, footerMidY);
        ctx.textBaseline = "alphabetic";
      }

      // URL center
      ctx.font = "600 28px 'Nunito', sans-serif";
      ctx.fillStyle = "#5A8A60";
      ctx.textAlign = "center";
      ctx.fillText("tidymate.app", CANVAS_W / 2, footerMidY + 10);

      // QR right
      if (qrDataUrl) {
        const qrImg = await loadImageSafe(qrDataUrl);
        if (qrImg && !cancelled) {
          const qrSize = 88;
          const qrX = CANVAS_W - 100 - qrSize;
          const qrY = footerMidY - qrSize / 2;
          ctx.save();
          ctx.shadowColor = "rgba(0,0,0,0.08)";
          ctx.shadowBlur = 8;
          roundRectPath(ctx, qrX - 6, qrY - 6, qrSize + 12, qrSize + 12, 8);
          ctx.fillStyle = "#FFFFFF";
          ctx.fill();
          ctx.restore();
          ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
        }
      }

      if (!cancelled) setDrawing(false);
    };

    draw().catch(console.error);
    return () => { cancelled = true; };
  }, [level, badge, fontsLoaded]);

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `tidymate-level-${level}.png`;
      a.click();
      URL.revokeObjectURL(url);
    }, "image/png");
  };

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText("https://tidymate.app");
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  const handleShare = async () => {
    const shareText = `${badge.shareTagline} — Level ${level}: ${badge.title} on TidyMate`;
    const shareUrl = "https://tidymate.app";

    if (navigator.share) {
      try {
        const canvas = canvasRef.current;
        if (canvas) {
          const blob = await new Promise<Blob>((resolve) =>
            canvas.toBlob((b) => resolve(b!), "image/png")
          );
          const file = new File([blob], `tidymate-level-${level}.png`, { type: "image/png" });
          await navigator.share({ files: [file], title: shareText, text: shareText, url: shareUrl });
          return;
        }
      } catch {
        try {
          await navigator.share({ title: shareText, text: shareText, url: shareUrl });
          return;
        } catch { /* fall through */ }
      }
    }
    setShowShareModal(true);
  };

  const shareText = `${badge.shareTagline} — Level ${level}: ${badge.title} on TidyMate`;

  return (
    <div className="space-y-3">
      <div
        className="relative rounded-xl overflow-hidden shadow-lg"
        style={{ width: CANVAS_W * DISPLAY_SCALE, maxWidth: "100%" }}
      >
        {drawing && (
          <div
            className="absolute inset-0 flex items-center justify-center bg-muted/80 z-10"
            style={{ height: CANVAS_H * DISPLAY_SCALE }}
          >
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        )}
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          style={{ width: "100%", height: "auto", display: "block" }}
        />

        {showShareModal && (
          <div
            style={{
              position: "absolute", inset: 0,
              background: "rgba(0,0,0,0.45)",
              display: "flex", alignItems: "flex-end", justifyContent: "center",
              zIndex: 50,
            }}
            onClick={() => setShowShareModal(false)}
          >
            <div
              style={{
                background: "hsl(var(--card))",
                borderRadius: "20px 20px 0 0",
                padding: "24px",
                width: "100%",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <p style={{ fontWeight: 600, fontSize: 15, marginBottom: 16, color: "hsl(var(--foreground))" }}>
                Share your badge
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <button
                  onClick={handleCopyLink}
                  style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "12px 16px", borderRadius: 12,
                    border: "1px solid hsl(var(--border))",
                    background: "hsl(var(--muted))", cursor: "pointer",
                    fontSize: 14, color: "hsl(var(--foreground))",
                  }}
                >
                  <Link className="w-4 h-4" />
                  {linkCopied ? "Link copied!" : "Copy link"}
                </button>
                <a
                  href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText + " https://tidymate.app")}`}
                  target="_blank" rel="noopener noreferrer"
                  style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "12px 16px", borderRadius: 12,
                    border: "1px solid hsl(var(--border))",
                    background: "hsl(var(--muted))", cursor: "pointer",
                    fontSize: 14, color: "hsl(var(--foreground))", textDecoration: "none",
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.253 5.622 5.911-5.622Zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                  Share on X (Twitter)
                </a>
                <a
                  href={`https://www.reddit.com/submit?url=${encodeURIComponent("https://tidymate.app")}&title=${encodeURIComponent(shareText)}`}
                  target="_blank" rel="noopener noreferrer"
                  style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "12px 16px", borderRadius: 12,
                    border: "1px solid hsl(var(--border))",
                    background: "hsl(var(--muted))", cursor: "pointer",
                    fontSize: 14, color: "hsl(var(--foreground))", textDecoration: "none",
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="#FF4500">
                    <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z" />
                  </svg>
                  Share on Reddit (r/ADHD)
                </a>
                <button
                  onClick={() => { handleDownload(); setShowShareModal(false); }}
                  style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "12px 16px", borderRadius: 12,
                    border: "1px solid hsl(var(--border))",
                    background: "hsl(var(--muted))", cursor: "pointer",
                    fontSize: 14, color: "hsl(var(--foreground))",
                  }}
                >
                  <Download className="w-4 h-4" />
                  Save image to share manually
                </button>
              </div>
              <button
                onClick={() => setShowShareModal(false)}
                style={{
                  width: "100%", marginTop: 16, padding: "12px",
                  borderRadius: 12, border: "none",
                  background: "transparent",
                  fontSize: 14, color: "hsl(var(--muted-foreground))", cursor: "pointer",
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <Button variant="outline" className="flex-1 gap-2" onClick={handleDownload} disabled={drawing}>
          <Download className="w-4 h-4" />
          Save image
        </Button>
        <Button className="flex-1 gap-2" onClick={handleShare} disabled={drawing}>
          <Share2 className="w-4 h-4" />
          Share badge
        </Button>
      </div>
    </div>
  );
};

export default LevelUpShareCard;
