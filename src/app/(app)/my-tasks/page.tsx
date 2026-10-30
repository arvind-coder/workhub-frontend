import type { Metadata } from "next";
import { Suspense } from "react";
import { MyTasks } from "@/components/tasks/my-tasks";

export const metadata: Metadata = { title: "My Tasks" };

export default function MyTasksPage() {
  return (
    <Suspense>
      <MyTasks />
    </Suspense>
  );
}
