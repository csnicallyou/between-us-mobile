import React, { useId } from "react";
import Svg, {
  Defs,
  LinearGradient,
  RadialGradient,
  Stop,
  Path,
  Rect,
  Circle,
  Ellipse,
  G,
} from "react-native-svg";

/** UI artwork is drawn as vectors, so the same tactile icons stay crisp on native and web. */
export function ClayIcon({
  name,
  size = 32,
  color = "#f08ca5",
}: {
  name: string;
  size?: number;
  color?: string;
}) {
  const id = useId().replace(/:/g, "");
  const paths: Record<string, string> = {
    heart:
      "M32 54C23 48 7 37 7 23C7 8 25 5 32 19C39 5 57 8 57 23C57 37 41 48 32 54Z",
    home: "M8 30L32 8L56 30L51 35V55H37V40H27V55H13V35Z",
    chatbubbles:
      "M9 11H45Q54 11 54 21V37Q54 47 44 47H27L14 56V46Q5 45 5 36V22Q5 11 9 11Z",
    "checkmark-circle":
      "M16 8H48Q56 8 56 17V47Q56 56 47 56H17Q8 56 8 47V17Q8 8 16 8Z",
    albums: "M13 15H51Q57 15 57 22V49Q57 55 50 55H14Q7 55 7 48V22Q7 15 13 15Z",
    gift: "M7 25H57V37H53V56H11V37H7Z M30 25C5 24 13 2 25 12L32 24L39 12C51 2 59 24 34 25Z",
    moon: "M43 8C15 5 2 28 13 46C26 66 57 53 58 32C43 43 28 29 43 8Z",
    leaf: "M32 56V35C2 39 4 12 13 8C33 10 36 26 32 35C37 9 51 7 57 12C62 34 47 41 36 37V56Z",
    sparkles: "M31 5L39 23L58 31L39 39L31 59L23 39L4 31L23 23Z",
    planet: "M31 8C61 8 63 52 35 56C5 60 0 13 31 8Z",
    happy: "M32 7a25 25 0 1 0 0 50a25 25 0 1 0 0-50Z",
    brush:
      "M20 41L42 9Q47 3 52 10Q56 13 52 18L29 47Z M18 39Q32 39 29 51Q25 61 8 56Q17 53 13 49Q10 44 18 39Z",
    walk: "M21 27C4 27 10 56 22 56Q31 56 29 47L25 34Q24 27 21 27Z M44 6C27 6 33 35 45 35Q54 35 52 26L48 13Q47 6 44 6Z",
  };
  const key =
    name === "heart-outline"
      ? "heart"
      : name === "checkmark"
        ? "checkmark-circle"
        : name === "cafe"
          ? "gift"
          : name;
  const d = paths[key];
  if (!d) return null;
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 64 68"
      style={{ position: "relative", zIndex: 1, flexShrink: 0 }}
    >
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2=".85" y2="1">
          <Stop offset="0" stopColor="#ffffff" />
          <Stop offset=".35" stopColor={color} />
          <Stop offset="1" stopColor={color} />
        </LinearGradient>
      </Defs>
      <Ellipse cx="32" cy="61" rx="23" ry="4" fill="#734155" opacity=".15" />
      <Path d={d} transform="translate(0 3)" fill={color} />
      <Path
        d={d}
        fill={`url(#${id})`}
        stroke="#ffffff"
        strokeOpacity=".35"
        strokeWidth="1"
      />
      {key === "checkmark-circle" && (
        <Path
          d="M20 32L28 40L45 22"
          fill="none"
          stroke="#fff5ef"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
      {key === "chatbubbles" &&
        [21, 32, 43].map((x) => (
          <Circle key={x} cx={x} cy="29" r="3" fill="#fff5ef" />
        ))}
      {key === "albums" && (
        <>
          <Circle cx="41" cy="27" r="5" fill="#fff5ef" />
          <Path d="M14 46L26 31L35 41L43 35L51 46Z" fill="#fff5ef" />
        </>
      )}
      {key === "gift" && <Path d="M30 26H36V56H30Z" fill="#ffe7a0" />}
      {key === "happy" && (
        <>
          <Circle cx="23" cy="28" r="3" fill="#72504d" />
          <Circle cx="41" cy="28" r="3" fill="#72504d" />
          <Path
            d="M23 39Q32 49 42 39"
            fill="none"
            stroke="#72504d"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </>
      )}
      {key === "planet" && (
        <Ellipse
          cx="32"
          cy="34"
          rx="31"
          ry="9"
          rotation="-25"
          origin="32,34"
          fill="none"
          stroke="#ffdb88"
          strokeWidth="5"
        />
      )}
      <Path
        d={key === "heart" ? "M15 23Q15 15 23 17" : "M17 19L28 15"}
        stroke="white"
        strokeWidth="4"
        strokeLinecap="round"
        opacity=".5"
      />
    </Svg>
  );
}

export function MemoryScene({ variant = 0 }: { variant?: number }) {
  const id = useId().replace(/:/g, "");
  const night = variant % 3 === 2;
  return (
    <Svg
      width="100%"
      height="100%"
      viewBox="0 0 240 220"
      preserveAspectRatio="xMidYMid slice"
    >
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <Stop
            offset="0"
            stopColor={night ? "#5b5793" : variant % 2 ? "#eed0e1" : "#9ccfe2"}
          />
          <Stop offset="1" stopColor={night ? "#bfa1ce" : "#ffe3c0"} />
        </LinearGradient>
        <RadialGradient id={id + "a"} cx=".3" cy=".2" r=".9">
          <Stop offset="0" stopColor="#fff9d9" />
          <Stop offset="1" stopColor="#e6bc81" />
        </RadialGradient>
        <RadialGradient id={id + "b"} cx=".3" cy=".2" r=".9">
          <Stop offset="0" stopColor="#e8d7ff" />
          <Stop offset="1" stopColor="#ab83ca" />
        </RadialGradient>
      </Defs>
      <Rect width="240" height="220" fill={`url(#${id})`} />
      <Circle cx="179" cy="48" r="23" fill={night ? "#fff3c8" : "#fff0c5"} />
      {[0, 1, 2, 3].map((i) => (
        <G key={i}>
          <Rect
            x={12 + i * 65}
            y={75 + (i % 2) * 20}
            width="8"
            height="105"
            rx="4"
            fill="#9b926b"
          />
          <Circle
            cx={16 + i * 65}
            cy={78 + (i % 2) * 20}
            r={26 + (i % 2) * 6}
            fill={variant % 2 ? "#eeb6cc" : "#a6c18b"}
          />
          <Circle
            cx={7 + i * 65}
            cy={65 + (i % 2) * 20}
            r="19"
            fill={variant % 2 ? "#ffd2dd" : "#c2d39e"}
          />
        </G>
      ))}
      <Ellipse
        cx="125"
        cy="219"
        rx="180"
        ry="79"
        fill={night ? "#9c9aad" : "#b9c79f"}
      />
      <Ellipse cx="126" cy="203" rx="97" ry="20" fill="#786b8a" opacity=".15" />
      {[0, 1].map((i) => (
        <G key={i} transform={`translate(${i ? 119 : 41} 116)`}>
          <Ellipse
            cx="41"
            cy="73"
            rx="43"
            ry="14"
            fill={`url(#${id + (i ? "b" : "a")})`}
          />
          <Ellipse
            cx="41"
            cy="34"
            rx="39"
            ry="48"
            fill={`url(#${id + (i ? "b" : "a")})`}
          />
          {i ? (
            <>
              <Ellipse cx="16" cy="-3" rx="10" ry="15" fill="#d6b9eb" />
              <Ellipse cx="51" cy="-6" rx="10" ry="12" fill="#d6b9eb" />
            </>
          ) : (
            <>
              <Ellipse cx="41" cy="-13" rx="7" ry="14" fill="#9eb982" />
              <Ellipse cx="50" cy="-20" rx="12" ry="6" fill="#bfd498" />
            </>
          )}
          <Path
            d="M23 31Q28 24 33 31M49 31Q54 24 59 31"
            stroke="#604152"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
          />
          <Ellipse cx="20" cy="41" rx="8" ry="4" fill="#e9a5b0" opacity=".7" />
          <Ellipse cx="62" cy="41" rx="8" ry="4" fill="#e9a5b0" opacity=".7" />
          <Path
            d="M37 42Q41 47 45 42"
            fill="none"
            stroke="#946271"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </G>
      ))}
      <Path
        d="M120 192C89 175 94 151 109 155Q120 157 120 165Q130 147 142 158C159 175 132 189 120 198Z"
        fill="#ee93a8"
      />
      <Ellipse cx="111" cy="163" rx="5" ry="3" fill="#ffdce1" />
    </Svg>
  );
}
