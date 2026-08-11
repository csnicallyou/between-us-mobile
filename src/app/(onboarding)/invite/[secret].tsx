import { useLocalSearchParams } from "expo-router";
import { PairSetupScreen } from "@/app/(onboarding)/index";

export default function InviteDeepLinkScreen() {
  const params = useLocalSearchParams<{ secret: string | string[] }>();
  const secret = Array.isArray(params.secret) ? params.secret[0] ?? "" : params.secret;
  return <PairSetupScreen initialSecret={secret} />;
}
