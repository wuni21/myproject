import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { Dashboard } from "@/components/dashboard/dashboard";

const taskKinds = ["schedule", "car", "family"] as const;

function makeTasks(kind: (typeof taskKinds)[number]) {
  return [
    { id: "task-1", kind, title: "원래 일정", date: "2026-11-19", time: "09:30", important: false, done: true },
    { id: "task-2", kind, title: "다른 일정", date: "2026-11-20", time: "10:00", important: true, done: false },
  ];
}

const resources = [
  { id: "resource-1", title: "원래 자료", url: "https://example.com/old", note: "원래 메모", created: "2026-11-19" },
  { id: "resource-2", title: "다른 자료", url: "https://example.org/", note: "다른 메모", created: "2026-11-18" },
];

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

describe("일정 수정", () => {
  test.each(taskKinds)("%s 일정을 수정해도 완료 상태를 유지하고 저장 후 복원한다", async (kind) => {
    const tasks = makeTasks(kind);
    localStorage.setItem("daylog-tasks", JSON.stringify(tasks));
    const view = render(<Dashboard section={kind} />);

    fireEvent.click(await screen.findByRole("button", { name: "원래 일정 수정" }));
    const dialog = within(await screen.findByRole("dialog", { name: "일정 수정" }));
    expect(dialog.getByLabelText("일정 이름", { exact: true })).toHaveValue("원래 일정");
    expect(dialog.getByLabelText("날짜", { exact: true })).toHaveValue("2026-11-19");
    expect(dialog.getByLabelText("시간", { exact: true })).toHaveValue("09:30");
    expect(dialog.getByLabelText("중요한 일정으로 표시하기")).not.toBeChecked();

    fireEvent.change(dialog.getByLabelText("일정 이름", { exact: true }), { target: { value: "수정된 일정" } });
    fireEvent.change(dialog.getByLabelText("날짜", { exact: true }), { target: { value: "2027-01-15" } });
    fireEvent.change(dialog.getByLabelText("시간", { exact: true }), { target: { value: "14:45" } });
    fireEvent.click(dialog.getByLabelText("중요한 일정으로 표시하기"));
    fireEvent.click(dialog.getByRole("button", { name: "변경사항 저장" }));

    const updated = { ...tasks[0], title: "수정된 일정", date: "2027-01-15", time: "14:45", important: true };
    await waitFor(() => {
      expect(JSON.parse(localStorage.getItem("daylog-tasks")!)).toEqual([updated, tasks[1]]);
      expect(screen.queryByRole("dialog", { name: "일정 수정" })).not.toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: "수정된 일정 완료 취소" })).toBeInTheDocument();
    expect(screen.queryByText("원래 일정")).not.toBeInTheDocument();

    view.unmount();
    render(<Dashboard section={kind} />);
    expect(await screen.findByRole("button", { name: "수정된 일정 완료 취소" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "수정된 일정 수정" }));
    const reopened = within(await screen.findByRole("dialog", { name: "일정 수정" }));
    expect(reopened.getByLabelText("일정 이름", { exact: true })).toHaveValue("수정된 일정");
    expect(reopened.getByLabelText("날짜", { exact: true })).toHaveValue("2027-01-15");
    expect(reopened.getByLabelText("시간", { exact: true })).toHaveValue("14:45");
    expect(reopened.getByLabelText("중요한 일정으로 표시하기")).toBeChecked();
  });

  test.each(taskKinds)("%s 일정 수정 취소 시 변경사항을 버린다", async (kind) => {
    const tasks = makeTasks(kind);
    localStorage.setItem("daylog-tasks", JSON.stringify(tasks));
    render(<Dashboard section={kind} />);

    fireEvent.click(await screen.findByRole("button", { name: "원래 일정 수정" }));
    const dialog = within(await screen.findByRole("dialog", { name: "일정 수정" }));
    fireEvent.change(dialog.getByLabelText("일정 이름", { exact: true }), { target: { value: "취소할 일정" } });
    fireEvent.change(dialog.getByLabelText("날짜", { exact: true }), { target: { value: "2027-01-15" } });
    fireEvent.change(dialog.getByLabelText("시간", { exact: true }), { target: { value: "14:45" } });
    fireEvent.click(dialog.getByLabelText("중요한 일정으로 표시하기"));
    fireEvent.click(dialog.getByRole("button", { name: "취소" }));

    await waitFor(() => expect(screen.queryByRole("dialog", { name: "일정 수정" })).not.toBeInTheDocument());
    expect(JSON.parse(localStorage.getItem("daylog-tasks")!)).toEqual(tasks);
    expect(screen.getByRole("button", { name: "원래 일정 완료 취소" })).toBeInTheDocument();
    expect(screen.queryByText("취소할 일정")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "원래 일정 수정" }));
    const reopened = within(await screen.findByRole("dialog", { name: "일정 수정" }));
    expect(reopened.getByLabelText("일정 이름", { exact: true })).toHaveValue("원래 일정");
    expect(reopened.getByLabelText("날짜", { exact: true })).toHaveValue("2026-11-19");
    expect(reopened.getByLabelText("시간", { exact: true })).toHaveValue("09:30");
    expect(reopened.getByLabelText("중요한 일정으로 표시하기")).not.toBeChecked();
  });
});

describe("자료 수정", () => {
  test("URL, 제목, 메모를 수정하고 저장 후 복원한다", async () => {
    localStorage.setItem("daylog-resources", JSON.stringify(resources));
    const view = render(<Dashboard section="resources" />);

    fireEvent.click(await screen.findByRole("button", { name: "원래 자료 수정" }));
    const dialog = within(await screen.findByRole("dialog", { name: "자료 수정" }));
    expect(dialog.getByLabelText("링크 주소", { exact: true })).toHaveValue("https://example.com/old");
    expect(dialog.getByLabelText("제목", { exact: true })).toHaveValue("원래 자료");
    expect(dialog.getByLabelText("메모", { exact: true })).toHaveValue("원래 메모");
    fireEvent.change(dialog.getByLabelText("링크 주소", { exact: true }), { target: { value: "https://example.net/new" } });
    fireEvent.change(dialog.getByLabelText("제목", { exact: true }), { target: { value: "수정된 자료" } });
    fireEvent.change(dialog.getByLabelText("메모", { exact: true }), { target: { value: "수정된 메모" } });
    fireEvent.click(dialog.getByRole("button", { name: "변경사항 저장" }));

    const updated = { ...resources[0], url: "https://example.net/new", title: "수정된 자료", note: "수정된 메모" };
    await waitFor(() => {
      expect(JSON.parse(localStorage.getItem("daylog-resources")!)).toEqual([updated, resources[1]]);
      expect(screen.queryByRole("dialog", { name: "자료 수정" })).not.toBeInTheDocument();
    });
    expect(screen.getByRole("link", { name: "수정된 자료" })).toHaveAttribute("href", updated.url);
    expect(screen.getByText("수정된 메모")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "원래 자료" })).not.toBeInTheDocument();

    view.unmount();
    render(<Dashboard section="resources" />);
    expect(await screen.findByRole("link", { name: "수정된 자료" })).toHaveAttribute("href", updated.url);
    expect(screen.getByText("수정된 메모")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "수정된 자료 수정" }));
    const reopened = within(await screen.findByRole("dialog", { name: "자료 수정" }));
    expect(reopened.getByLabelText("링크 주소", { exact: true })).toHaveValue(updated.url);
    expect(reopened.getByLabelText("제목", { exact: true })).toHaveValue(updated.title);
    expect(reopened.getByLabelText("메모", { exact: true })).toHaveValue(updated.note);
  });

  test("자료 수정 취소 시 변경사항을 버린다", async () => {
    localStorage.setItem("daylog-resources", JSON.stringify(resources));
    render(<Dashboard section="resources" />);

    fireEvent.click(await screen.findByRole("button", { name: "원래 자료 수정" }));
    const dialog = within(await screen.findByRole("dialog", { name: "자료 수정" }));
    fireEvent.change(dialog.getByLabelText("링크 주소", { exact: true }), { target: { value: "https://example.net/new" } });
    fireEvent.change(dialog.getByLabelText("제목", { exact: true }), { target: { value: "취소할 자료" } });
    fireEvent.change(dialog.getByLabelText("메모", { exact: true }), { target: { value: "취소할 메모" } });
    fireEvent.click(dialog.getByRole("button", { name: "취소" }));

    await waitFor(() => expect(screen.queryByRole("dialog", { name: "자료 수정" })).not.toBeInTheDocument());
    expect(JSON.parse(localStorage.getItem("daylog-resources")!)).toEqual(resources);
    expect(screen.getByRole("link", { name: "원래 자료" })).toHaveAttribute("href", resources[0].url);
    expect(screen.getByText("원래 메모")).toBeInTheDocument();
    expect(screen.queryByText("취소할 자료")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "원래 자료 수정" }));
    const reopened = within(await screen.findByRole("dialog", { name: "자료 수정" }));
    expect(reopened.getByLabelText("링크 주소", { exact: true })).toHaveValue(resources[0].url);
    expect(reopened.getByLabelText("제목", { exact: true })).toHaveValue(resources[0].title);
    expect(reopened.getByLabelText("메모", { exact: true })).toHaveValue(resources[0].note);
  });
});