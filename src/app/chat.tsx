import { Redirect, type Href } from "expo-router";

export default function ChatScreen() {
  return <Redirect href={'/ai' as Href} />;
}
