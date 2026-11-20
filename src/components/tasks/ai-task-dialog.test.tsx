import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { jsonResponse, renderWithClient } from "@/test/utils";
import { AiTaskDialog } from "./ai-task-dialog";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));

const PROJECT = "64b0f1a2c3d4e5f6a7b8c9d0";
const REQUIREMENT = "Users can reset their password through an emailed link";

const suggestions = [
  { title: "Add reset endpoint", description: "Create the API", priority: "HIGH" },
  { title: "Send reset email", description: "Email the link", priority: "MEDIUM" },
];

const fetchMock = vi.fn();
let generateResponse: () => Response;
let createStatus: (title: string) => number;

const calls = (suffix: string) => fetchMock.mock.calls.filter(([u]) => String(u).endsWith(suffix));
const createdTitles = () => calls("/tasks").map(([, init]) => JSON.parse(init.body).title);

beforeEach(() => {
  fetchMock.mockReset();
  generateResponse = () => jsonResponse({ success: true, data: { tasks: suggestions } });
  createStatus = () => 201;
  fetchMock.mockImplementation(async (url: string, init?: RequestInit) => {
    if (url === `/api/proxy/projects/${PROJECT}/tasks/generate`) return generateResponse();
    if (url === `/api/proxy/projects/${PROJECT}/tasks` && init?.method === "POST") {
      const body = JSON.parse(String(init.body));
      const status = createStatus(body.title);
      return status === 201
        ? jsonResponse({ success: true, data: { id: "t1", ...body } }, 201)
        : jsonResponse({ success: false, message: "Could not save" }, status);
    }
    return jsonResponse({ success: true, data: { items: [], pagination: {} } });
  });
  vi.stubGlobal("fetch", fetchMock);
});

const open = (onClose = vi.fn()) => {
  renderWithClient(<AiTaskDialog projectId={PROJECT} onClose={onClose} />);
  return onClose;
};

const generate = async () => {
  await userEvent.type(screen.getByLabelText(/feature requirement/i), REQUIREMENT);
  await userEvent.click(screen.getByRole("button", { name: /generate tasks/i }));
  await screen.findByDisplayValue("Add reset endpoint");
};

describe("AiTaskDialog", () => {
  it("keeps Generate disabled until the requirement is long enough", async () => {
    open();
    const button = screen.getByRole("button", { name: /generate tasks/i });
    expect(button).toBeDisabled();

    await userEvent.type(screen.getByLabelText(/feature requirement/i), "too short");
    expect(button).toBeDisabled();

    await userEvent.type(screen.getByLabelText(/feature requirement/i), " but now it is long enough");
    expect(button).toBeEnabled();
  });

  it("sends the trimmed requirement and shows editable suggestions without saving anything", async () => {
    open();
    await generate();

    const generateCall = calls("/tasks/generate")[0]!;
    expect(JSON.parse(generateCall[1].body)).toEqual({ requirement: REQUIREMENT });
    expect(screen.getByDisplayValue("Send reset email")).toBeInTheDocument();
    expect(createdTitles()).toHaveLength(0);
  });

  it("shows the server's message when generation fails and stays on the form", async () => {
    generateResponse = () => jsonResponse({ success: false, message: "AI task generation is not configured" }, 503);
    open();
    await userEvent.type(screen.getByLabelText(/feature requirement/i), REQUIREMENT);
    await userEvent.click(screen.getByRole("button", { name: /generate tasks/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/not configured/i);
    expect(screen.getByLabelText(/feature requirement/i)).toHaveValue(REQUIREMENT);
  });

  it("saves only the selected tasks, using edited values, and closes", async () => {
    const onClose = open();
    await generate();

    await userEvent.click(screen.getByRole("checkbox", { name: /Send reset email/ }));
    const title = screen.getByDisplayValue("Add reset endpoint");
    await userEvent.clear(title);
    await userEvent.type(title, "Edited title");
    await userEvent.click(screen.getByRole("button", { name: "Save 1 task" }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(createdTitles()).toEqual(["Edited title"]);
    const body = JSON.parse(calls("/tasks")[0]![1].body);
    expect(body).toMatchObject({ description: "Create the API", priority: "HIGH" });
  });

  it("disables saving when nothing is selected or a title is too short", async () => {
    open();
    await generate();

    const title = screen.getByDisplayValue("Add reset endpoint");
    await userEvent.clear(title);
    await userEvent.type(title, "ab");
    expect(screen.getByRole("button", { name: "Save 2 tasks" })).toBeDisabled();

    await userEvent.click(screen.getByRole("checkbox", { name: /ab/ }));
    await userEvent.click(screen.getByRole("checkbox", { name: /Send reset email/ }));
    expect(screen.getByRole("button", { name: "Save 0 tasks" })).toBeDisabled();
  });

  it("keeps failed tasks in the list so they can be retried, and does not close", async () => {
    createStatus = (title) => (title === "Send reset email" ? 500 : 201);
    const onClose = open();
    await generate();
    await userEvent.click(screen.getByRole("button", { name: "Save 2 tasks" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/1 task couldn't be saved/i);
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByDisplayValue("Send reset email")).toBeInTheDocument();
    expect(screen.queryByDisplayValue("Add reset endpoint")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save 1 task" })).toBeEnabled();
  });
});
