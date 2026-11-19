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

test("차량별 일정을 등록하고 필터링과 변경 후 대시보드에 표시한다", async () => {
  const view = render(<Dashboard section="car" />);
  await waitFor(() => expect(screen.getByLabelText("날짜")).not.toHaveValue(""));
  fireEvent.click(screen.getByText("자동차 등록"));
  for (const name of ["가족차", "출퇴근차"]) {
    fireEvent.change(screen.getByLabelText("자동차 이름"), { target: { value: name } });
    fireEvent.click(screen.getByRole("button", { name: "자동차 추가" }));
  }
  const cars = JSON.parse(localStorage.getItem("daylog-cars") || "[]");
  expect(cars.map((car: { name: string }) => car.name)).toEqual(["가족차", "출퇴근차"]);
  fireEvent.click(screen.getByText("자동차 등록"));
  const summary = screen.getByText("자동차 등록").closest("summary")!;
  expect(summary.parentElement).not.toHaveAttribute("open");
  expect(within(summary).getByText("가족차")).toBeVisible();
  expect(within(summary).getByText("출퇴근차")).toBeVisible();
  fireEvent.change(screen.getByLabelText("자동차", { exact: true }), { target: { value: cars[0].id } });
  fireEvent.change(screen.getByLabelText("일정 이름"), { target: { value: "보험 갱신" } });
  fireEvent.click(screen.getByLabelText("중요한 일정으로 표시하기"));
  fireEvent.click(screen.getByRole("button", { name: "일정 추가하기" }));
  fireEvent.change(screen.getByLabelText("자동차", { exact: true }), { target: { value: cars[1].id } });
  fireEvent.change(screen.getByLabelText("일정 이름"), { target: { value: "엔진 오일 교체" } });
  fireEvent.click(screen.getByLabelText("중요한 일정으로 표시하기"));
  fireEvent.click(screen.getByRole("button", { name: "일정 추가하기" }));
  fireEvent.change(screen.getByLabelText("자동차별 보기"), { target: { value: cars[0].id } });
  expect(screen.getByText("보험 갱신")).toBeInTheDocument();
  expect(screen.queryByText("엔진 오일 교체")).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("자동차별 보기"), { target: { value: "all" } });
  fireEvent.click(screen.getByRole("button", { name: "보험 갱신 수정" }));
  const dialog = within(screen.getByRole("dialog", { name: "일정 수정" }));
  expect(dialog.getByLabelText("자동차")).toHaveValue(cars[0].id);
  fireEvent.change(dialog.getByLabelText("자동차"), { target: { value: cars[1].id } });
  fireEvent.click(dialog.getByRole("button", { name: "변경사항 저장" }));
  await waitFor(() => expect(JSON.parse(localStorage.getItem("daylog-tasks") || "[]")[0].carId).toBe(cars[1].id));
  view.unmount();
  render(<Dashboard section="home" />);
  const card = screen.getByRole("heading", { name: "자동차 관리" }).closest("section")!;
  await within(card).findByText("보험 갱신");
  expect(card.querySelectorAll(".child-badge")[0]).toHaveTextContent("출퇴근차");
  expect(card.querySelectorAll(".child-badge")[1]).toHaveTextContent("출퇴근차");
});

test("기존 자동차 일정을 보존하고 차량을 연결한다", async () => {
  const oldTask = { id: "old", kind: "car", title: "기존 정비", date: "2999-11-19", time: "", important: true, done: false };
  localStorage.setItem("daylog-tasks", JSON.stringify([oldTask]));
  const view = render(<Dashboard section="car" />);
  expect(await screen.findByText("자동차 미지정")).toBeInTheDocument();
  fireEvent.click(screen.getByText("자동차 등록"));
  fireEvent.change(screen.getByLabelText("자동차 이름"), { target: { value: "가족차" } });
  fireEvent.click(screen.getByRole("button", { name: "자동차 추가" }));
  const car = JSON.parse(localStorage.getItem("daylog-cars") || "[]")[0];
  fireEvent.click(screen.getByRole("button", { name: "기존 정비 수정" }));
  const dialog = within(screen.getByRole("dialog", { name: "일정 수정" }));
  fireEvent.change(dialog.getByLabelText("자동차"), { target: { value: car.id } });
  fireEvent.click(dialog.getByRole("button", { name: "변경사항 저장" }));
  await waitFor(() => expect(JSON.parse(localStorage.getItem("daylog-tasks") || "[]")[0]).toEqual({ ...oldTask, carId: car.id }));
  view.unmount();
  render(<Dashboard section="home" />);
  const card = screen.getByRole("heading", { name: "자동차 관리" }).closest("section")!;
  expect(await within(card).findByText("기존 정비")).toBeInTheDocument();
  expect(within(card).getByText("가족차")).toBeInTheDocument();
});
