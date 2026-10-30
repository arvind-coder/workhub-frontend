import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { jsonResponse, renderWithClient } from "@/test/utils";
import { AddMemberDialog } from "./add-member-dialog";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));

const PROJECT = "64b0f1a2c3d4e5f6a7b8c9d0";
const OWNER = "64b0f1a2c3d4e5f6a7b8c9a1";
const EXISTING = "64b0f1a2c3d4e5f6a7b8c9a2";
const NEW_USER = "64b0f1a2c3d4e5f6a7b8c9a3";

const found = [
  { id: NEW_USER, name: "Lena Fischer", email: "lena@x.io" },
  { id: EXISTING, name: "Lena Existing", email: "existing@x.io" },
  { id: OWNER, name: "Lena Owner", email: "owner@x.io" },
];

const fetchMock = vi.fn();
let searchResponse: () => Response;

beforeEach(() => {
  fetchMock.mockReset();
  searchResponse = () => jsonResponse({ success: true, data: found });
  fetchMock.mockImplementation(async (url: string, init?: RequestInit) => {
    if (url.startsWith("/api/proxy/users")) return searchResponse();
    if (url === `/api/proxy/projects/${PROJECT}`)
      return jsonResponse({ success: true, data: { id: PROJECT, name: "P", description: "d", ownerId: OWNER, status: "active", createdAt: "", updatedAt: "" } });
    if (url === `/api/proxy/projects/${PROJECT}/members` && (!init || !init.method || init.method === "GET"))
      return jsonResponse({ success: true, data: [{ id: "m1", projectId: PROJECT, role: "MEMBER", createdAt: "", user: { id: EXISTING, name: "Lena Existing", email: "existing@x.io" } }] });
    if (url === `/api/proxy/projects/${PROJECT}/members` && init?.method === "POST") return jsonResponse({ success: true, data: { _id: "m2", userId: NEW_USER, role: "MEMBER" } }, 201);
    return jsonResponse({ success: false, message: "unexpected " + url }, 500);
  });
  vi.stubGlobal("fetch", fetchMock);
});

const open = () => renderWithClient(<AddMemberDialog open onOpenChange={() => {}} projectId={PROJECT} />);
const searchCalls = () => fetchMock.mock.calls.filter(([u]) => String(u).startsWith("/api/proxy/users"));

describe("AddMemberDialog (search by name)", () => {
  it("does not search until 2 characters are typed", async () => {
    open();
    await userEvent.type(screen.getByPlaceholderText(/search by name or email/i), "l");
    expect(screen.getByText(/at least 2 characters/i)).toBeInTheDocument();
    await new Promise((r) => setTimeout(r, 450));
    expect(searchCalls()).toHaveLength(0);
  });

  it("searches by name, lets you pick someone, and adds them by id", async () => {
    open();
    await userEvent.type(screen.getByPlaceholderText(/search by name or email/i), "lena");
    await screen.findByRole("option", { name: /Lena Fischer/ });
    expect(searchCalls()[0]![0]).toBe("/api/proxy/users?search=lena&limit=8");

    await userEvent.click(screen.getByRole("option", { name: /Lena Fischer/ }));
    expect(screen.getByText("lena@x.io")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Add member" }));

    await waitFor(() => expect(fetchMock.mock.calls.some(([, i]) => i?.method === "POST")).toBe(true));
    const post = fetchMock.mock.calls.find(([, i]) => i?.method === "POST")!;
    expect(JSON.parse(post[1].body)).toEqual({ userId: NEW_USER, role: "MEMBER" });
  });

  it("supports keyboard selection (arrow keys + Enter)", async () => {
    open();
    await userEvent.type(screen.getByPlaceholderText(/search by name or email/i), "lena");
    await screen.findByRole("option", { name: /Lena Fischer/ });
    await userEvent.keyboard("{Enter}");
    expect(screen.getByText("lena@x.io")).toBeInTheDocument();
  });

  it("disables people who already have access", async () => {
    open();
    await userEvent.type(screen.getByPlaceholderText(/search by name or email/i), "lena");
    await screen.findByRole("option", { name: /Lena Fischer/ });
    await waitFor(() => expect(screen.getByRole("option", { name: /Lena Existing/ })).toHaveAttribute("aria-disabled", "true"));
    expect(screen.getByRole("option", { name: /Lena Owner/ })).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByText("Project owner")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("option", { name: /Lena Existing/ }));
    expect(screen.queryByText("existing@x.io", { selector: "p" })).toBeInTheDocument(); // still in the list, not selected
    expect(screen.getByPlaceholderText(/search by name or email/i)).toBeInTheDocument();
  });

  it("requires choosing a person before submitting", async () => {
    open();
    await userEvent.click(screen.getByRole("button", { name: "Add member" }));
    expect(await screen.findByText("Select a person from the results")).toBeInTheDocument();
    expect(fetchMock.mock.calls.some(([, i]) => i?.method === "POST")).toBe(false);
  });

  it("shows an empty state when nobody matches", async () => {
    searchResponse = () => jsonResponse({ success: true, data: [] });
    open();
    await userEvent.type(screen.getByPlaceholderText(/search by name or email/i), "zzzz");
    expect(await screen.findByText(/No one matches/)).toBeInTheDocument();
  });

  it("falls back to user-ID entry when the server has no search endpoint yet", async () => {
    searchResponse = () => jsonResponse({ success: false, message: "Not found" }, 404);
    open();
    await userEvent.type(screen.getByPlaceholderText(/search by name or email/i), "lena");
    await userEvent.click(await screen.findByRole("button", { name: "Add by user ID instead" }));
    expect(await screen.findByLabelText(/user id/i)).toBeInTheDocument();
  });
});
