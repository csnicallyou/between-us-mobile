import { Redirect, type Href } from "expo-router";

export default function QuietScreen() {
  return <Redirect href={'/ai' as Href} />;
}
