import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { Dashboard } from "@/components/dashboard/dashboard";

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ current: { temperature_2m: 20, weather_code: 0 } }),
  }));
});

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
});

test("오늘의 일정에 일반·자녀·자동차 일정을 모두 표시하고 완료 상태를 저장한다", async () => {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  localStorage.setItem("daylog-children", JSON.stringify([{ id: "child", name: "민지" }]));
  localStorage.setItem("daylog-cars", JSON.stringify([{ id: "car", name: "가족차" }]));
  localStorage.setItem("daylog-tasks", JSON.stringify([
    { id: "general", kind: "schedule", title: "일반 일정", date: today, time: "09:00", important: false, done: false },
    { id: "child", kind: "family", title: "학교 행사", childId: "child", date: today, time: "10:00", important: false, done: false },
    { id: "car", kind: "car", title: "차량 정비", carId: "car", date: today, time: "11:00", important: false, done: false },
    { id: "extra", kind: "car", title: "세차", date: today, time: "12:00", important: false, done: false },
    { id: "done", kind: "family", title: "완료 일정", date: today, time: "13:00", important: false, done: true },
    { id: "other", kind: "family", title: "다른 날짜 일정", date: "2999-12-31", time: "", important: false, done: false },
  ]));
  render(<Dashboard section="home" />);
  const todayCard = screen.getByRole("heading", { name: "오늘의 일정" }).closest("section")!;
  await within(todayCard).findByText("학교 행사");
  expect([...todayCard.querySelectorAll(".task-content strong")].map((item) => item.textContent)).toEqual([
    "일반 일정 ", "민지학교 행사 ", "가족차차량 정비 ", "자동차 미지정세차 ", "자녀 미지정완료 일정 ",
  ]);
  expect(within(todayCard).queryByText("다른 날짜 일정")).not.toBeInTheDocument();
  expect(within(todayCard).getByText("4")).toBeInTheDocument();
  fireEvent.click(within(todayCard).getByRole("button", { name: "차량 정비 완료" }));
  await waitFor(() => expect(JSON.parse(localStorage.getItem("daylog-tasks") || "[]").find((task: { id: string }) => task.id === "car").done).toBe(true));
  expect(within(todayCard).getByText("3")).toBeInTheDocument();
  expect(within(todayCard).getByRole("button", { name: "차량 정비 완료 취소" })).toBeInTheDocument();
});

test("자동차 카드는 중요하지 않은 미완료 일정도 날짜순으로 표시한다", async () => {
  localStorage.setItem("daylog-cars", JSON.stringify([{ id: "car", name: "가족차" }]));
  localStorage.setItem("daylog-tasks", JSON.stringify([
    { id: "normal", kind: "car", title: "일반 정비", carId: "car", date: "2000-01-01", time: "", important: false, done: false },
    { id: "important", kind: "car", title: "중요 정비", carId: "car", date: "2999-01-01", time: "", important: true, done: false },
    { id: "done", kind: "car", title: "완료 정비", carId: "car", date: "1999-01-01", time: "", important: false, done: true },
  ]));
  render(<Dashboard section="home" />);
  const carCard = screen.getByRole("heading", { name: "자동차 관리" }).closest("section")!;
  await within(carCard).findByText("일반 정비");
  expect(carCard.querySelectorAll(".summary-item strong")[0]).toHaveTextContent("가족차일반 정비");
  expect(within(carCard).getByText("중요 정비")).toBeInTheDocument();
  expect(within(carCard).queryByText("완료 정비")).not.toBeInTheDocument();
  expect(within(carCard).getByText("진행 중인 일정")).toBeInTheDocument();
});
