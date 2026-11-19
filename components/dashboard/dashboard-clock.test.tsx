import { act, render } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";

import { Dashboard } from "@/components/dashboard/dashboard";

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  localStorage.clear();
});

test("각 지역의 시계가 초 단위로 갱신된다", async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-11-19T03:04:05Z"));
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ current: { temperature_2m: 20, weather_code: 0 } }),
  }));
  localStorage.setItem("daylog-cities", JSON.stringify([
    { id: "seoul", name: "서울", country: "대한민국", latitude: 37.5665, longitude: 126.978, timezone: "Asia/Seoul" },
    { id: "london", name: "런던", country: "영국", latitude: 51.5072, longitude: -0.1276, timezone: "Europe/London" },
  ]));
  const { container, unmount } = render(<Dashboard section="home" />);
  await act(async () => { await vi.advanceTimersByTimeAsync(0); });
  expect([...container.querySelectorAll(".city-time")].map((clock) => clock.textContent)).toEqual(["12:04:05", "03:04:05"]);
  await act(async () => { await vi.advanceTimersByTimeAsync(2000); });
  expect([...container.querySelectorAll(".city-time")].map((clock) => clock.textContent)).toEqual(["12:04:07", "03:04:07"]);
  unmount();
  expect(vi.getTimerCount()).toBe(0);
});