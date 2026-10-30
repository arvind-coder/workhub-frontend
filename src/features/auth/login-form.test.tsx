import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { jsonResponse, renderWithClient } from "@/test/utils";
import { LoginForm } from "./login-form";

const replace = vi.fn();
let search = "";
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(search),
  usePathname: () => "/login",
}));

const fetchMock = vi.fn();
beforeEach(() => {
  replace.mockReset();
  fetchMock.mockReset();
  search = "";
  vi.stubGlobal("fetch", fetchMock);
});

const user = { id: "u1", name: "Priya Sharma", email: "priya@x.io", role: "PROJECT_MANAGER", createdAt: "", updatedAt: "" };

describe("LoginForm", () => {
  it("shows inline validation and does not call the API for empty or invalid input", async () => {
    renderWithClient(<LoginForm />);
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByText("Email is required")).toBeInTheDocument();
    expect(screen.getByText("Password is required")).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText(/email/i), "not-an-email");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByText("Enter a valid email address")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("shows the server error and keeps the typed values on bad credentials", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ success: false, message: "Invalid email or password" }, 401));
    renderWithClient(<LoginForm />);
    await userEvent.type(screen.getByLabelText(/email/i), "priya@x.io");
    await userEvent.type(screen.getByLabelText(/password/i), "wrong-pass");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Invalid email or password");
    expect(screen.getByLabelText(/email/i)).toHaveValue("priya@x.io");
    expect(replace).not.toHaveBeenCalled();
  });

  it("signs in, disables the button while pending, and honours a safe ?next", async () => {
    search = "next=%2Fprojects%2Fabc";
    let release!: (r: Response) => void;
    fetchMock.mockReturnValue(new Promise<Response>((r) => (release = r)));
    renderWithClient(<LoginForm />);
    await userEvent.type(screen.getByLabelText(/email/i), "priya@x.io");
    await userEvent.type(screen.getByLabelText(/password/i), "secret12");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByRole("button", { name: /signing in/i })).toBeDisabled();
    release(jsonResponse({ success: true, data: { user } }));
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/projects/abc"));
    expect(fetchMock.mock.calls[0]![0]).toBe("/api/proxy/auth/login");
    expect(JSON.parse(fetchMock.mock.calls[0]![1].body)).toEqual({ email: "priya@x.io", password: "secret12" });
  });

  it("ignores an unsafe ?next and shows the expired-session notice", async () => {
    search = "next=https%3A%2F%2Fevil.com&expired=1";
    fetchMock.mockResolvedValue(jsonResponse({ success: true, data: { user } }));
    renderWithClient(<LoginForm />);
    expect(screen.getByText(/session expired/i)).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText(/email/i), "priya@x.io");
    await userEvent.type(screen.getByLabelText(/password/i), "secret12");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/overview"));
  });
});
