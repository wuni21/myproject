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

test("중요 표시 없이 등록한 자녀 일정을 대시보드에 보여준다", async () => {
  const view = render(<Dashboard section="family" />);
  const input = await screen.findByPlaceholderText("예: 학교 준비물 챙기기");
  await waitFor(() => expect(screen.getByLabelText("날짜")).not.toHaveValue(""));
  fireEvent.click(screen.getByText("자녀 등록"));
  fireEvent.change(screen.getByLabelText("자녀 이름"), { target: { value: "민지" } });
  fireEvent.click(screen.getByRole("button", { name: "자녀 추가" }));
  fireEvent.change(input, { target: { value: "기말고사" } });
  fireEvent.click(screen.getByRole("button", { name: "일정 추가하기" }));
  await waitFor(() => expect(JSON.parse(localStorage.getItem("daylog-tasks") || "[]")).toHaveLength(1));

  view.unmount();
  render(<Dashboard section="home" />);
  const card = screen.getByRole("heading", { name: "자녀 관리" }).closest("section")!;
  expect(await within(card).findByText("기말고사")).toBeInTheDocument();
  expect(within(card).getByText("민지")).toBeInTheDocument();
  expect(within(card).getByText("진행 중인 일정")).toBeInTheDocument();
});

test("여러 자녀의 일정을 구분하고 수정 시 자녀를 변경한다", async () => {
  const view = render(<Dashboard section="family" />);
  await waitFor(() => expect(screen.getByLabelText("날짜")).not.toHaveValue(""));
  fireEvent.click(screen.getByText("자녀 등록"));
  for (const name of ["민지", "민수"]) {
    fireEvent.change(screen.getByLabelText("자녀 이름"), { target: { value: name } });
    fireEvent.click(screen.getByRole("button", { name: "자녀 추가" }));
  }
  const children = JSON.parse(localStorage.getItem("daylog-children") || "[]");
  expect(children.map((child: { name: string }) => child.name)).toEqual(["민지", "민수"]);
  fireEvent.click(screen.getByText("자녀 등록"));
  const summary = screen.getByText("자녀 등록").closest("summary")!;
  expect(summary.parentElement).not.toHaveAttribute("open");
  expect(within(summary).getByText("민지")).toBeVisible();
  expect(within(summary).getByText("민수")).toBeVisible();
  fireEvent.change(screen.getByLabelText("자녀", { exact: true }), { target: { value: children[0].id } });
  fireEvent.change(screen.getByLabelText("일정 이름"), { target: { value: "학교 행사" } });
  fireEvent.click(screen.getByRole("button", { name: "일정 추가하기" }));
  fireEvent.change(screen.getByLabelText("자녀", { exact: true }), { target: { value: children[1].id } });
  fireEvent.change(screen.getByLabelText("일정 이름"), { target: { value: "병원 방문" } });
  fireEvent.click(screen.getByRole("button", { name: "일정 추가하기" }));
  fireEvent.click(screen.getByRole("button", { name: "학교 행사 수정" }));
  const dialog = within(screen.getByRole("dialog", { name: "일정 수정" }));
  expect(dialog.getByLabelText("자녀")).toHaveValue(children[0].id);
  fireEvent.change(dialog.getByLabelText("자녀"), { target: { value: children[1].id } });
  fireEvent.click(dialog.getByRole("button", { name: "변경사항 저장" }));
  await waitFor(() => expect(JSON.parse(localStorage.getItem("daylog-tasks") || "[]")[0].childId).toBe(children[1].id));
  view.unmount();
  render(<Dashboard section="home" />);
  const card = screen.getByRole("heading", { name: "자녀 관리" }).closest("section")!;
  await within(card).findByText("학교 행사");
  expect(card.querySelectorAll(".child-badge")[0]).toHaveTextContent("민수");
  expect(card.querySelectorAll(".child-badge")[1]).toHaveTextContent("민수");
});

test("기존 자녀 미지정 일정을 유지하고 자녀를 연결한다", async () => {
  localStorage.setItem("daylog-tasks", JSON.stringify([{ id: "old", kind: "family", title: "기존 일정", date: "2026-11-19", time: "", important: false, done: false }]));
  const view = render(<Dashboard section="family" />);
  expect(await screen.findByText("자녀 미지정")).toBeInTheDocument();
  fireEvent.click(screen.getByText("자녀 등록"));
  fireEvent.change(screen.getByLabelText("자녀 이름"), { target: { value: "민지" } });
  fireEvent.click(screen.getByRole("button", { name: "자녀 추가" }));
  fireEvent.click(screen.getByRole("button", { name: "기존 일정 수정" }));
  const dialog = within(screen.getByRole("dialog", { name: "일정 수정" }));
  fireEvent.change(dialog.getByLabelText("자녀"), { target: { value: JSON.parse(localStorage.getItem("daylog-children") || "[]")[0].id } });
  fireEvent.click(dialog.getByRole("button", { name: "변경사항 저장" }));
  await waitFor(() => expect(screen.queryByText("자녀 미지정")).not.toBeInTheDocument());
  view.unmount();
  render(<Dashboard section="home" />);
  const card = screen.getByRole("heading", { name: "자녀 관리" }).closest("section")!;
  expect(await within(card).findByText("기존 일정")).toBeInTheDocument();
  expect(within(card).getByText("민지")).toBeInTheDocument();
});

test("자녀 카드는 완료하지 않은 일정을 날짜순으로 보여준다", async () => {
  localStorage.setItem("daylog-tasks", JSON.stringify([
    { id: "2", kind: "family", title: "나중 일정", date: "2999-12-15", time: "", important: true, done: false },
    { id: "1", kind: "family", title: "지난 미완료 일정", date: "2000-11-19", time: "", important: false, done: false },
    { id: "3", kind: "family", title: "완료한 일정", date: "2000-11-18", time: "", important: false, done: true },
  ]));
  render(<Dashboard section="home" />);
  const card = screen.getByRole("heading", { name: "자녀 관리" }).closest("section")!;
  await within(card).findByText("지난 미완료 일정");
  const items = card.querySelectorAll(".summary-item strong");
  expect(items[0]).toHaveTextContent("지난 미완료 일정");
  expect(items[1]).toHaveTextContent("나중 일정");
  expect(within(card).queryByText("완료한 일정")).not.toBeInTheDocument();
});
