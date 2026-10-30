"use client";

import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { GripVertical } from "lucide-react";
import { PriorityBadge } from "@/components/shared/status-badge";
import { cn } from "@/lib/utils";
import { STATUS_LABEL, STATUS_ORDER } from "@/lib/utils/labels";
import type { Task, TaskStatus } from "@/types/api";
import { AssigneeAvatar, DueLabel, TaskRowMenu, type TaskActions } from "./task-list";
import { StatusMenu } from "./status-menu";

const COLUMN_DOT: Record<TaskStatus, string> = {
  TODO: "bg-status-todo",
  IN_PROGRESS: "bg-status-progress",
  DONE: "bg-status-done",
};

/**
 * Drag a card to another column to change its status. The change is saved to
 * the API (optimistically, rolled back on failure by the status mutation).
 * Cards with a request in flight cannot be dragged again, and every card also
 * has a status menu, which is the keyboard-first alternative to dragging.
 */
export function KanbanBoard({ tasks, actions }: { tasks: Task[]; actions: TaskActions }) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor),
  );
  const active = tasks.find((t) => t.id === activeId);

  const onDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id));
  const onDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    const task = tasks.find((t) => t.id === e.active.id);
    const target = e.over?.id as TaskStatus | undefined;
    if (!task || !target || target === task.status) return;
    if (actions.pendingIds?.has(task.id)) return;
    actions.onStatusChange(task, target);
  };

  return (
    <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={() => setActiveId(null)}>
      <div className="grid gap-4 md:grid-cols-3">
        {STATUS_ORDER.map((status) => (
          <Column key={status} status={status} tasks={tasks.filter((t) => t.status === status)} actions={actions} />
        ))}
      </div>
      <DragOverlay>{active ? <CardBody task={active} actions={actions} overlay /> : null}</DragOverlay>
    </DndContext>
  );
}

function Column({ status, tasks, actions }: { status: TaskStatus; tasks: Task[]; actions: TaskActions }) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <section
      ref={setNodeRef}
      aria-label={`${STATUS_LABEL[status]} column`}
      className={cn("flex min-h-48 flex-col rounded-xl border bg-muted/40 p-2 transition-colors", isOver && "border-primary/50 bg-primary/5")}
    >
      <h3 className="flex items-center gap-2 px-2 py-2 text-sm font-semibold">
        <span aria-hidden className={cn("size-2 rounded-full", COLUMN_DOT[status])} />
        {STATUS_LABEL[status]}
        <span className="rounded-full bg-background px-2 text-xs font-medium text-muted-foreground">{tasks.length}</span>
      </h3>
      <ul className="flex flex-1 flex-col gap-2">
        {tasks.map((task) => (
          <li key={task.id}>
            <DraggableCard task={task} actions={actions} />
          </li>
        ))}
        {tasks.length === 0 && <li className="px-2 py-6 text-center text-xs text-muted-foreground">No tasks here</li>}
      </ul>
    </section>
  );
}

function DraggableCard({ task, actions }: { task: Task; actions: TaskActions }) {
  const pending = actions.pendingIds?.has(task.id) ?? false;
  const canDrag = actions.scopeFor(task) !== "none" && !pending;
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, isDragging } = useDraggable({ id: task.id, disabled: !canDrag });

  return (
    <div ref={setNodeRef} className={cn(isDragging && "opacity-40")}>
      <CardBody
        task={task}
        actions={actions}
        pending={pending}
        handle={
          canDrag ? (
            <button
              type="button"
              ref={setActivatorNodeRef}
              aria-label={`Drag ${task.title} to another column`}
              className="-ml-1 mt-0.5 cursor-grab touch-none rounded p-0.5 text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 active:cursor-grabbing"
              {...attributes}
              {...listeners}
            >
              <GripVertical aria-hidden className="size-4" />
            </button>
          ) : null
        }
      />
    </div>
  );
}

function CardBody({
  task,
  actions,
  handle,
  pending,
  overlay,
}: {
  task: Task;
  actions: TaskActions;
  handle?: React.ReactNode;
  pending?: boolean;
  overlay?: boolean;
}) {
  return (
    <article className={cn("rounded-lg border bg-card p-3 shadow-xs", overlay && "rotate-1 shadow-lg", pending && "opacity-70")}>
      <div className="flex items-start gap-1.5">
        {handle}
        <button
          type="button"
          onClick={() => actions.onOpen(task)}
          className="min-w-0 flex-1 rounded text-left text-sm font-medium outline-none hover:text-primary focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <span className="line-clamp-2">{task.title}</span>
        </button>
        {!overlay && <TaskRowMenu task={task} actions={actions} />}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <PriorityBadge priority={task.priority} />
        <DueLabel task={task} />
        <div className="ml-auto flex items-center gap-2">
          {!overlay && (
            <StatusMenu
              status={task.status}
              disabled={actions.scopeFor(task) === "none" || pending}
              onChange={(s) => actions.onStatusChange(task, s)}
            />
          )}
          <AssigneeAvatar task={task} person={actions.resolveAssignee(task)} />
        </div>
      </div>
    </article>
  );
}
