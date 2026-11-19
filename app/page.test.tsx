import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";

import Home from "@/app/page";

test("홈 화면은 메인 제목을 보여준다", () => {
  render(<Home />);

  expect(
    screen.getByRole("heading", { level: 1, name: "나의 하루를, 한눈에." })
  ).toBeInTheDocument();
});

test.each(["오늘의 일정", "자동차 관리", "자녀 관리", "저장한 자료"])(
  "홈 화면은 %s 제목을 보여준다",
  (title) => {
    render(<Home />);

    expect(screen.getByRole("heading", { name: title })).toBeInTheDocument();
  }
);
