import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Share2, Loader2, Link } from "lucide-react";
import { track } from "@/lib/analytics";
import tidymateLogoSrc from "@/assets/tidymate-logo.png";

interface ShareCardProps {
  beforeImageUrl: string;
  wipImageUrl: string;
  shareTagline: string;
  shareReactionPill: string;
  shareSub: string;
  sessionMinutes: number;
  roomName: string;
  roomId?: string;
}

const CANVAS_W = 1080;
const CANVAS_H = 1080;
const DISPLAY_SCALE = 0.5;

function truncateText(
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

function drawCoverImage(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  dx: number, dy: number, dw: number, dh: number
) {
  const scale = Math.max(dw / img.naturalWidth, dh / img.naturalHeight);
  const sw = dw / scale, sh = dh / scale;
  const sx = (img.naturalWidth - sw) / 2, sy = (img.naturalHeight - sh) / 2;
  ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
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

/** Soft watercolor-style background: warm cream with gentle green washes */
function drawBackground(ctx: CanvasRenderingContext2D) {
  // Base cream
  ctx.fillStyle = "#F7F3EC";
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  // Large soft green wash top-left
  const g1 = ctx.createRadialGradient(180, 160, 0, 180, 160, 520);
  g1.addColorStop(0, "rgba(180, 220, 160, 0.32)");
  g1.addColorStop(0.6, "rgba(200, 235, 175, 0.14)");
  g1.addColorStop(1, "rgba(200, 235, 175, 0)");
  ctx.fillStyle = g1;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  // Soft green wash bottom-right
  const g2 = ctx.createRadialGradient(CANVAS_W - 160, CANVAS_H - 180, 0, CANVAS_W - 160, CANVAS_H - 180, 480);
  g2.addColorStop(0, "rgba(155, 210, 130, 0.28)");
  g2.addColorStop(0.65, "rgba(180, 225, 150, 0.10)");
  g2.addColorStop(1, "rgba(180, 225, 150, 0)");
  ctx.fillStyle = g2;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  // Warm amber tint center-bottom for depth
  const g3 = ctx.createRadialGradient(CANVAS_W / 2, CANVAS_H * 0.85, 0, CANVAS_W / 2, CANVAS_H * 0.85, 360);
  g3.addColorStop(0, "rgba(240, 210, 150, 0.15)");
  g3.addColorStop(1, "rgba(240, 210, 150, 0)");
  ctx.fillStyle = g3;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  // Subtle grain texture via small semi-transparent dots
  ctx.save();
  ctx.globalAlpha = 0.025;
  for (let i = 0; i < 900; i++) {
    const px = Math.random() * CANVAS_W;
    const py = Math.random() * CANVAS_H;
    const pr = Math.random() * 1.8 + 0.3;
    ctx.beginPath();
    ctx.arc(px, py, pr, 0, Math.PI * 2);
    ctx.fillStyle = Math.random() > 0.5 ? "#5A8A40" : "#8B6B30";
    ctx.fill();
  }
  ctx.restore();
}

/** Draw a decorative leaf sprig */
function drawLeafAccent(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, angle: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.globalAlpha = 0.18;

  // stem
  ctx.strokeStyle = "#5A8A40";
  ctx.lineWidth = size * 0.06;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(0, size * 0.5);
  ctx.bezierCurveTo(size * 0.1, 0, size * 0.1, -size * 0.3, 0, -size * 0.5);
  ctx.stroke();

  // leaves
  for (let i = -1; i <= 1; i += 2) {
    ctx.fillStyle = "#6AAF45";
    ctx.beginPath();
    ctx.save();
    ctx.translate(i * size * 0.04, -size * 0.05);
    ctx.rotate(i * 0.6);
    ctx.ellipse(i * size * 0.22, 0, size * 0.28, size * 0.11, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  ctx.restore();
}

/** Draw the TidyMate logo mark + wordmark */
function drawLogo(ctx: CanvasRenderingContext2D, x: number, y: number, scale = 1) {
  const s = scale;
  ctx.save();
  ctx.translate(x, y);

  const leafGrad = ctx.createLinearGradient(0, 0, 26 * s, 26 * s);
  leafGrad.addColorStop(0, "#8DD87A");
  leafGrad.addColorStop(1, "#2A7A3A");

  ctx.beginPath();
  ctx.moveTo(13 * s, 1 * s);
  ctx.bezierCurveTo(5 * s, 1 * s, 0, 7 * s, 0, 13 * s);
  ctx.bezierCurveTo(0, 20 * s, 5 * s, 26 * s, 13 * s, 26 * s);
  ctx.bezierCurveTo(20 * s, 26 * s, 26 * s, 20 * s, 26 * s, 13 * s);
  ctx.bezierCurveTo(26 * s, 5 * s, 20 * s, 1 * s, 13 * s, 1 * s);
  ctx.closePath();
  ctx.fillStyle = leafGrad;
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(8 * s, 21 * s);
  ctx.bezierCurveTo(12 * s, 15 * s, 18 * s, 9 * s, 24 * s, 4 * s);
  ctx.bezierCurveTo(19 * s, 10 * s, 13 * s, 16 * s, 10 * s, 23 * s);
  ctx.closePath();
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.fill();

  ctx.restore();

  ctx.fillStyle = "#2A5C35";
  ctx.font = `700 ${Math.round(18 * s)}px 'Nunito', 'Arial Rounded MT Bold', sans-serif`;
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  ctx.fillText("TidyMate", x + 32 * s, y + 13 * s);
  ctx.textBaseline = "alphabetic";
}

/** Soft arrow pointing right */
function drawArrow(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number) {
  ctx.save();
  ctx.translate(cx, cy);

  // Circle backing
  ctx.beginPath();
  ctx.arc(0, 0, size * 0.68, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,255,255,0.72)";
  ctx.shadowColor = "rgba(0,0,0,0.10)";
  ctx.shadowBlur = 12;
  ctx.shadowOffsetY = 3;
  ctx.fill();
  ctx.shadowColor = "transparent";

  // Arrow chevron
  const hw = size * 0.32;
  const ht = size * 0.22;
  const arrowGrad = ctx.createLinearGradient(-hw, 0, hw, 0);
  arrowGrad.addColorStop(0, "#6DC85A");
  arrowGrad.addColorStop(1, "#2E8B40");
  ctx.fillStyle = arrowGrad;
  ctx.beginPath();
  ctx.moveTo(-hw, -ht);
  ctx.lineTo(hw * 0.15, -ht);
  ctx.lineTo(hw * 0.15, -size * 0.42);
  ctx.lineTo(hw, 0);
  ctx.lineTo(hw * 0.15, size * 0.42);
  ctx.lineTo(hw * 0.15, ht);
  ctx.lineTo(-hw, ht);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

async function generateQRDataUrl(text: string, size: number): Promise<string | null> {
  try {
    const QRCode = await import("https://cdn.jsdelivr.net/npm/qrcode@1.5.3/+esm" as any);
    return await QRCode.toDataURL(text, {
      width: size,
      margin: 1,
      color: { dark: "#2A5C35", light: "#FFFFFF" },
    });
  } catch {
    return null;
  }
}

const ShareCard = ({
  beforeImageUrl,
  wipImageUrl,
  shareTagline,
  roomId,
}: ShareCardProps) => {
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
    Promise.all([font900.load(), font700.load()])
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

      const [beforeImg, afterImg, qrDataUrl, logoImg] = await Promise.all([
        loadImageSafe(beforeImageUrl),
        loadImageSafe(wipImageUrl),
        generateQRDataUrl("https://tidymate.app", 120),
        loadImageSafe(tidymateLogoSrc),
      ]);
      if (cancelled) return;

      // ─── 1. Background ───────────────────────────────────────────────────────
      drawBackground(ctx);

      // ─── 2. Decorative leaf accents ──────────────────────────────────────────
      drawLeafAccent(ctx, 80, 95, 110, 0.3);
      drawLeafAccent(ctx, CANVAS_W - 75, 110, 95, -0.4);
      drawLeafAccent(ctx, 65, CANVAS_H - 110, 90, 0.8);
      drawLeafAccent(ctx, CANVAS_W - 80, CANVAS_H - 90, 100, -0.9);

      // ─── 3. Main content card (white, rounded, airy) ──────────────────────────
      const cardX = 60, cardY = 60;
      const cardW = CANVAS_W - 120, cardH = CANVAS_H - 120;
      const cardR = 40;

      ctx.save();
      // Card drop shadow
      ctx.shadowColor = "rgba(60, 100, 60, 0.12)";
      ctx.shadowBlur = 48;
      ctx.shadowOffsetY = 16;
      roundRectPath(ctx, cardX, cardY, cardW, cardH, cardR);
      ctx.fillStyle = "rgba(255, 255, 255, 0.82)";
      ctx.fill();
      ctx.restore();

      // Subtle inner border
      ctx.save();
      roundRectPath(ctx, cardX, cardY, cardW, cardH, cardR);
      ctx.strokeStyle = "rgba(160, 200, 140, 0.35)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();

      // ─── 4. Header: logo ─────────────────────────────────────────────────────
      const headerY = cardY + 56;
      drawLogo(ctx, cardX + cardW / 2 - 80, headerY - 13, 1.4);

      // ─── 5. Divider line ─────────────────────────────────────────────────────
      const dividerY = headerY + 36;
      ctx.save();
      const divGrad = ctx.createLinearGradient(cardX + 80, 0, cardX + cardW - 80, 0);
      divGrad.addColorStop(0, "rgba(160, 210, 140, 0)");
      divGrad.addColorStop(0.3, "rgba(160, 210, 140, 0.55)");
      divGrad.addColorStop(0.7, "rgba(160, 210, 140, 0.55)");
      divGrad.addColorStop(1, "rgba(160, 210, 140, 0)");
      ctx.strokeStyle = divGrad;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cardX + 80, dividerY);
      ctx.lineTo(cardX + cardW - 80, dividerY);
      ctx.stroke();
      ctx.restore();

      // ─── 6. BEFORE / AFTER section ───────────────────────────────────────────
      const sectionTop = dividerY + 44;
      const polaroidW = 356;
      const polaroidH = 380;
      const polaroidBorder = 14;
      const polaroidBottomPad = 46;
      const totalFrameH = polaroidH + polaroidBottomPad;
      const gap = (cardW - polaroidW * 2) / 3;
      const leftPX = cardX + gap;
      const rightPX = cardX + gap * 2 + polaroidW;
      const polaroidR = 16;

      // Label helper
      const drawLabel = (text: string, cx: number, y: number) => {
        ctx.font = "700 28px 'Nunito', sans-serif";
        ctx.textAlign = "center";
        ctx.fillStyle = "#4A7A50";
        ctx.letterSpacing = "2px";
        ctx.fillText(text, cx, y);
      };

      drawLabel("BEFORE", leftPX + polaroidW / 2, sectionTop + 22);
      drawLabel("AFTER", rightPX + polaroidW / 2, sectionTop + 22);

      // Polaroid frame helper
      const drawPolaroid = (px: number, py: number, img: HTMLImageElement | null, label: string) => {
        const fw = polaroidW, fh = totalFrameH;

        // Outer shadow
        ctx.save();
        ctx.shadowColor = "rgba(0, 0, 0, 0.13)";
        ctx.shadowBlur = 28;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 8;
        roundRectPath(ctx, px, py, fw, fh, polaroidR);
        ctx.fillStyle = "#FAFAF7";
        ctx.fill();
        ctx.restore();

        // Very subtle warm inner border on frame
        ctx.save();
        roundRectPath(ctx, px, py, fw, fh, polaroidR);
        ctx.strokeStyle = "rgba(200, 185, 155, 0.4)";
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();

        // Photo area clip
        const photoX = px + polaroidBorder;
        const photoY = py + polaroidBorder;
        const photoW = fw - polaroidBorder * 2;
        const photoH = polaroidH - polaroidBorder;

        ctx.save();
        roundRectPath(ctx, photoX, photoY, photoW, photoH, 8);
        ctx.clip();
        if (img) {
          drawCoverImage(ctx, img, photoX, photoY, photoW, photoH);
        } else {
          // Placeholder
          const pg = ctx.createLinearGradient(photoX, photoY, photoX, photoY + photoH);
          pg.addColorStop(0, "#E8F0E4");
          pg.addColorStop(1, "#D0E4CC");
          ctx.fillStyle = pg;
          ctx.fillRect(photoX, photoY, photoW, photoH);
          ctx.fillStyle = "#8AB890";
          ctx.font = "600 26px Nunito, sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(label, photoX + photoW / 2, photoY + photoH / 2);
          ctx.textBaseline = "alphabetic";
        }
        ctx.restore();
      };

      const polaroidTop = sectionTop + 38;
      drawPolaroid(leftPX, polaroidTop, beforeImg, "Before");
      drawPolaroid(rightPX, polaroidTop, afterImg, "After");

      // ─── 7. Arrow between polaroids ──────────────────────────────────────────
      const arrowCX = cardX + cardW / 2;
      const arrowCY = polaroidTop + totalFrameH / 2;
      drawArrow(ctx, arrowCX, arrowCY, 52);

      // ─── 8. Caption ──────────────────────────────────────────────────────────
      const captionTop = polaroidTop + totalFrameH + 80;
      const captionMaxW = cardW - 200;

      ctx.font = "700 36px 'Nunito', sans-serif";
      ctx.textAlign = "center";
      ctx.fillStyle = "#2C4A30";

      const caption = shareTagline || "I tidied my space with TidyMate.";
      const captionLines = truncateText(ctx, caption, captionMaxW, 2);
      const lineH = 50;
      const totalCaptionH = captionLines.length * lineH;
      const captionStartY = captionTop;
      captionLines.forEach((line, i) => {
        ctx.fillText(line, CANVAS_W / 2, captionStartY + i * lineH);
      });

      // Small decorative dots around caption
      ctx.fillStyle = "rgba(100, 170, 90, 0.35)";
      const dotY = captionStartY - 14;
      for (let di = -2; di <= 2; di++) {
        ctx.beginPath();
        ctx.arc(CANVAS_W / 2 + di * 20, dotY, 3, 0, Math.PI * 2);
        ctx.fill();
      }

      // ─── 9. Footer ───────────────────────────────────────────────────────────
      const footerY = cardY + cardH - 66;

      // Thin footer divider
      ctx.save();
      const fdGrad = ctx.createLinearGradient(cardX + 80, 0, cardX + cardW - 80, 0);
      fdGrad.addColorStop(0, "rgba(160, 210, 140, 0)");
      fdGrad.addColorStop(0.3, "rgba(160, 210, 140, 0.4)");
      fdGrad.addColorStop(0.7, "rgba(160, 210, 140, 0.4)");
      fdGrad.addColorStop(1, "rgba(160, 210, 140, 0)");
      ctx.strokeStyle = fdGrad;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cardX + 80, footerY - 22);
      ctx.lineTo(cardX + cardW - 80, footerY - 22);
      ctx.stroke();
      ctx.restore();

      // Logo (left)
      drawLogo(ctx, cardX + 52, footerY - 14, 1.1);

      // tidymate.app URL
      ctx.font = "600 22px 'Nunito', sans-serif";
      ctx.fillStyle = "#6A9A70";
      ctx.textAlign = "left";
      ctx.fillText("tidymate.app", cardX + 52 + 26 * 1.1 + 96, footerY + 2);

      // QR code (right)
      if (qrDataUrl) {
        const qrImg = await loadImageSafe(qrDataUrl);
        if (qrImg && !cancelled) {
          const qrSize = 72;
          const qrX = cardX + cardW - qrSize - 48;
          const qrY = footerY - qrSize / 2 - 4;

          // White backing for QR
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
  }, [beforeImageUrl, wipImageUrl, shareTagline, fontsLoaded]);

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "tidymate-progress.png";
      a.click();
      URL.revokeObjectURL(url);
      track("share_card_downloaded", { room_id: roomId });
    }, "image/png");
  };

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText("https://tidymate.app");
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  const handleShare = async () => {
    const shareUrl = "https://tidymate.app";
    const shareText = shareTagline || "I tidied my space with TidyMate!";

    if (navigator.share) {
      try {
        const canvas = canvasRef.current;
        if (canvas) {
          const blob = await new Promise<Blob>((resolve) =>
            canvas.toBlob((b) => resolve(b!), "image/png")
          );
          const file = new File([blob], "tidymate-progress.png", { type: "image/png" });
          await navigator.share({ files: [file], title: shareText, text: shareText, url: shareUrl });
          track("share_card_shared", { room_id: roomId });
          return;
        }
      } catch {
        try {
          await navigator.share({ title: shareText, text: shareText, url: shareUrl });
          track("share_card_shared", { room_id: roomId });
          return;
        } catch { /* fall through */ }
      }
    }
    setShowShareModal(true);
  };

  const shareText = shareTagline || "I tidied my space with TidyMate!";

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

        {/* Share modal — bottom sheet */}
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
                Share your progress
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
          Share
        </Button>
      </div>
    </div>
  );
};

export default ShareCard;
