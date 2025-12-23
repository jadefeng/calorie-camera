import { ImageResponse } from "next/og";

export const size = {
  width: 512,
  height: 512
};

export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#f7f4ef",
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }}
      >
        <div
          style={{
            width: 360,
            height: 360,
            borderRadius: 72,
            background: "#3b5b4f",
            color: "#f7f4ef",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 160,
            fontWeight: 700
          }}
        >
          CC
        </div>
      </div>
    ),
    {
      ...size
    }
  );
}
