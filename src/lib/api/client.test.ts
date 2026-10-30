import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, getErrorMessage } from "./errors";
import { apiRequest, apiRequestPage, setUnauthorizedHandler } from "./client";
import { jsonResponse } from "@/test/utils";

const fetchMock = vi.fn();
beforeEach(() => vi.stubGlobal("fetch", fetchMock));
afterEach(() => {
  fetchMock.mockReset();
  setUnauthorizedHandler(null);
  vi.unstubAllGlobals();
});

describe("api client error handling", () => {
  it("unwraps { success, data }", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ success: true, data: { id: "1" } }));
    await expect(apiRequest("/projects/1")).resolves.toEqual({ id: "1" });
    expect(fetchMock.mock.calls[0]![0]).toBe("/api/proxy/projects/1");
  });

  it("returns items + pagination for list endpoints", async () => {
    const pagination = { page: 1, limit: 10, total: 1, totalPages: 1 };
    fetchMock.mockResolvedValue(jsonResponse({ success: true, data: [{ id: "1" }], pagination }));
    await expect(apiRequestPage("/projects", { query: { page: 1, search: "" } })).resolves.toEqual({ items: [{ id: "1" }], pagination });
    expect(fetchMock.mock.calls[0]![0]).toBe("/api/proxy/projects?page=1");
  });

  it.each([
    [400, "Validation failed"],
    [403, "You do not have access to this project"],
    [404, "Project not found"],
  ])("surfaces the backend message for %i", async (status, message) => {
    fetchMock.mockResolvedValue(jsonResponse({ success: false, message }, status));
    const error: unknown = await apiRequest("/projects/1").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status, message, isNetwork: false });
    expect(getErrorMessage(error)).toBe(message);
  });

  it("flags forbidden / not found helpers", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ success: false, message: "x" }, 403));
    const error = (await apiRequest("/x").catch((e: unknown) => e)) as ApiError;
    expect(error.isForbidden).toBe(true);
  });

  it("notifies the unauthorized handler on 401 for normal requests", async () => {
    const handler = vi.fn();
    setUnauthorizedHandler(handler);
    fetchMock.mockResolvedValue(jsonResponse({ success: false, message: "expired" }, 401));
    await expect(apiRequest("/projects")).rejects.toMatchObject({ status: 401 });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("does NOT treat bad login credentials as an expired session", async () => {
    const handler = vi.fn();
    setUnauthorizedHandler(handler);
    fetchMock.mockResolvedValue(jsonResponse({ success: false, message: "Invalid email or password" }, 401));
    await expect(apiRequest("/auth/login", { method: "POST", body: {} })).rejects.toMatchObject({ message: "Invalid email or password" });
    expect(handler).not.toHaveBeenCalled();
  });

  it("converts network failures to a friendly ApiError", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
    const error = (await apiRequest("/projects").catch((e: unknown) => e)) as ApiError;
    expect(error).toMatchObject({ isNetwork: true, status: 0 });
    expect(error.message).toMatch(/network error/i);
  });

  it("falls back gracefully when the body is not JSON", async () => {
    fetchMock.mockResolvedValue(new Response("<html>bad gateway</html>", { status: 502 }));
    await expect(apiRequest("/projects")).rejects.toMatchObject({ status: 502, message: "Request failed (502)" });
  });

  it("re-throws aborts untouched so cancelled queries stay silent", async () => {
    fetchMock.mockRejectedValue(new DOMException("Aborted", "AbortError"));
    await expect(apiRequest("/projects")).rejects.toMatchObject({ name: "AbortError" });
  });
});
