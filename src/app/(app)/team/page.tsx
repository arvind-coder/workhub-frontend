import type { Metadata } from "next";
import { TeamView } from "@/components/members/team-view";

export const metadata: Metadata = { title: "Team" };

export default function TeamPage() {
  return <TeamView />;
}
