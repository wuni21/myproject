import { expect, test } from "@playwright/test";

test("홈 화면의 메타데이터 제목에 DAYLOG가 포함된다", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle(/DAYLOG/);
});

test("홈 화면에 메인 제목과 주요 영역 제목이 보인다", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { level: 1, name: "나의 하루를, 한눈에." })
  ).toBeVisible();

  for (const title of ["오늘의 일정", "자동차 관리", "자녀 관리", "저장한 자료"]) {
    await expect(
      page.getByRole("heading", { name: title, exact: true })
    ).toBeVisible();
  }
});
