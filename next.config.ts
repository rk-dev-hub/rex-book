import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 予約アプリは他サイトの iframe に埋め込ませない（クリックジャッキング対策）。
  // Referrer は自分のサイトの中だけに送り、URL のクエリ（予約の選択内容など）を外部へ漏らさない。
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "same-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
