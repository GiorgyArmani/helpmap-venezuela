import { ImageResponse } from "next/og";
import { readFileSync } from "fs";
import { join } from "path";

// Browser favicon generated from public/ico.png with rounded corners (the raw
// logo is a square). apple-icon.png stays square — iOS applies its own mask.
export const size = { width: 256, height: 256 };
export const contentType = "image/png";

const ICO = `data:image/png;base64,${readFileSync(join(process.cwd(), "public", "ico.png")).toString("base64")}`;

export default function Icon() {
  return new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%", borderRadius: 56, overflow: "hidden" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={ICO} width={256} height={256} alt="" />
      </div>
    ),
    size,
  );
}
