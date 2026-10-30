import type { ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { keys } from "@/lib/api/keys";
import { jsonResponse, makeTestClient } from "@/test/utils";
import type { Paginated, Task } from "@/types/api";
import { useUpdateTaskStatus } from "./hooks";

const PROJECT = "64b0f1a2c3d4e5f6a7b8c9d0";
const task = (id: string, status: Task["status"] = "TODO"): Task => ({
  id, title: `Task ${id}`, description: "d", projectId: PROJECT, createdBy: "u1", status, priority: "LOW", createdAt: "", updatedAt: "",
});
const listKey = keys.tasks.list(PROJECT, { page: 1 });
const page = (items: Task[]): Paginated<Task> => ({ items, pagination: { page: 1, limit: 10, total: items.length, totalPages: 1 } });

const fetchMock = vi.fn();
beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

function setup() {
  const client = makeTestClient();
  client.setQueryData(listKey, page([task("a"), task("b")]));
  client.setQueryData(keys.tasks.detail(PROJECT, "a"), task("a"));
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  return { client, ...renderHook(() => useUpdateTaskStatus(), { wrapper }) };
}

describe("useUpdateTaskStatus", () => {
  it("updates cached lists and detail immediately, and PATCHes only the status", async () => {
    let release!: (r: Response) => void;
    fetchMock.mockReturnValue(new Promise<Response>((r) => (release = r)));
    const { client, result } = setup();

    act(() => result.current.mutate({ task: task("a"), status: "DONE" }));
    await waitFor(() => expect(client.getQueryData<Paginated<Task>>(listKey)!.items[0]!.status).toBe("DONE"));
    expect(client.getQueryData<Paginated<Task>>(listKey)!.items[1]!.status).toBe("TODO");
    expect(client.getQueryData<Task>(keys.tasks.detail(PROJECT, "a"))!.status).toBe("DONE");

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe(`/api/proxy/projects/${PROJECT}/tasks/a`);
    expect(init.method).toBe("PATCH");
    expect(JSON.parse(init.body)).toEqual({ status: "DONE" });

    release(jsonResponse({ success: true, data: task("a", "DONE") }));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it("rolls every cached copy back when the API rejects the change", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ success: false, message: "You cannot change this task" }, 403));
    const { client, result } = setup();

    await act(async () => {
      await result.current.mutateAsync({ task: task("a"), status: "DONE" }).catch(() => undefined);
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("You cannot change this task");
    expect(client.getQueryData<Paginated<Task>>(listKey)!.items[0]!.status).toBe("TODO");
    expect(client.getQueryData<Task>(keys.tasks.detail(PROJECT, "a"))!.status).toBe("TODO");
  });
});
