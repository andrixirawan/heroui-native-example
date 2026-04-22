import { Redirect, type Href } from "expo-router";

export default function ProtectedIndexScreen() {
  return <Redirect href={"/home" as Href} />;
}
