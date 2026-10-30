import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { jsonResponse, renderWithClient } from "@/test/utils";
import { ProjectFormDialog } from "./project-form-dialog";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));

const fetchMock = vi.fn();
beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

const created = { id: "64b0f1a2c3d4e5f6a7b8c9d0", name: "Website redesign", description: "d", ownerId: "u1", status: "active", createdAt: "", updatedAt: "" };

describe("ProjectFormDialog (create)", () => {
  it("validates required fields before submitting", async () => {
    renderWithClient(<ProjectFormDialog open onOpenChange={() => {}} />);
    await userEvent.click(screen.getByRole("button", { name: "Create project" }));
    expect(await screen.findByText("Project name is required")).toBeInTheDocument();
    expect(screen.getByText("Description is required")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("posts exactly name + description, then reports the created project and closes", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ success: true, data: created }, 201));
    const onOpenChange = vi.fn();
    const onCreated = vi.fn();
    renderWithClient(<ProjectFormDialog open onOpenChange={onOpenChange} onCreated={onCreated} />);

    await userEvent.type(screen.getByLabelText(/name/i), "  Website redesign ");
    await userEvent.type(screen.getByLabelText(/description/i), "Refresh the marketing site.");
    await userEvent.click(screen.getByRole("button", { name: "Create project" }));

    await waitFor(() => expect(onCreated).toHaveBeenCalledWith(created));
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("/api/proxy/projects");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual({ name: "Website redesign", description: "Refresh the marketing site." });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("shows a 403 from the API inline and keeps the dialog open with values intact", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ success: false, message: "You do not have permission to perform this action" }, 403));
    const onOpenChange = vi.fn();
    renderWithClient(<ProjectFormDialog open onOpenChange={onOpenChange} />);
    await userEvent.type(screen.getByLabelText(/name/i), "Alpha");
    await userEvent.type(screen.getByLabelText(/description/i), "Beta");
    await userEvent.click(screen.getByRole("button", { name: "Create project" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("You do not have permission");
    expect(screen.getByLabelText(/name/i)).toHaveValue("Alpha");
    expect(onOpenChange).not.toHaveBeenCalled();
  });
});

describe("ProjectFormDialog (edit)", () => {
  it("sends only the changed fields", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ success: true, data: { ...created, name: "Renamed" } }));
    renderWithClient(<ProjectFormDialog open onOpenChange={() => {}} project={created as never} />);
    const name = screen.getByLabelText(/name/i);
    await userEvent.clear(name);
    await userEvent.type(name, "Renamed");
    await userEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe(`/api/proxy/projects/${created.id}`);
    expect(init.method).toBe("PATCH");
    expect(JSON.parse(init.body)).toEqual({ name: "Renamed" });
  });
});
