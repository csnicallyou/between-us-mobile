const { chromium } = require("playwright");
const fs = require("node:fs");
const assert = require("node:assert/strict");
(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || undefined,
    headless: true,
    args: ["--use-angle=swiftshader", "--enable-webgl", "--no-proxy-server"],
  });
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  fs.mkdirSync("screenshots", { recursive: true });
  const button = (name) => page.getByRole("button", { name, exact: true });
  const shot = async (name) => {
    await page.waitForTimeout(500);
    await page.screenshot({ path: `screenshots/${name}.png` });
  };
  const saved = () =>
    page.evaluate(() =>
      JSON.parse(localStorage.getItem("between-us-renewed:v1")),
    );
  const settle = () => page.waitForTimeout(350);
  await page.goto("http://127.0.0.1:8081");
  await page.waitForTimeout(2200);
  assert.equal(await page.locator("canvas").count(), 1);
  await shot("01-room");
  // Real mesh raycast: the first creature occupies the lower centre of this viewport.
  await page.locator("canvas").click({ position: { x: 143, y: 430 } });
  await page.waitForTimeout(150);
  assert.equal(
    await page.getByText("Прогуляться", { exact: true }).count(),
    1,
    "mesh click must open the character menu",
  );
  await shot("02-character-menu");
  await button("Закрыть действия").click();
  await button("Отправить объятие").click();
  await button("Общение").click();
  assert.ok(await page.getByText("Обнимаю тебя ♡", { exact: true }).count());
  await page
    .getByRole("textbox", { name: "Сообщение", exact: true })
    .fill("Ты — мой любимый человек");
  await button("Отправить сообщение").click();
  await settle();
  await shot("03-chat");
  await page.reload();
  await page.waitForTimeout(900);
  await button("Общение").click();
  assert.ok(
    await page.getByText("Ты — мой любимый человек", { exact: true }).count(),
  );
  await button("Мир").click();
  await button("Настроить комнату").click();
  assert.equal(
    await button("Общение").count(),
    0,
    "editor must hide the ordinary navigation",
  );
  const themeNames = [
    "Уютная классика",
    "Современный минимализм",
    "Нежная пастель",
    "Природная гармония",
    "Атмосферный вечер",
    "Стильный арт",
  ];
  for (let i = 0; i < themeNames.length; i++) {
    await button(themeNames[i]).click();
    await shot(`theme-${i + 1}`);
  }
  await button("Отменить изменение").click();
  await button("Повторить изменение").click();
  await page.locator("canvas").click({ position: { x: 190, y: 435 } });
  assert.ok(await page.getByText("Наш диван", { exact: true }).count());
  await button("Цвет дивана #b8a5d9").click();
  await button("Форма").click();
  await button("Матовый").click();
  await button("✓ Сохранить").click();
  await settle();
  assert.equal((await saved()).roomDesign.theme, 5);
  assert.equal((await saved()).roomDesign.sofa, "#b8a5d9");
  assert.equal((await saved()).roomDesign.material, "satin");
  await button("Настроить комнату").click();
  await button(themeNames[2]).click();
  await button("Отменить редактирование").click();
  assert.equal(
    (await saved()).roomDesign.theme,
    5,
    "cancel must leave persisted design intact",
  );
  await page.reload();
  await page.waitForTimeout(900);
  assert.equal((await saved()).roomDesign.theme, 5);
  await button("Настроить комнату").click();
  await button(themeNames[0]).click();
  await shot("04-room-editor");
  await button("✓ Сохранить").click();
  await button("Активности").click();
  await shot("05-activities");
  await button("Задачи").click();
  await button("Добавить запись").click();
  await page
    .getByRole("textbox", { name: "Название", exact: true })
    .fill("Прогулка в парке");
  await page
    .getByRole("textbox", { name: "Описание", exact: true })
    .fill("Чай и разговоры без спешки");
  await button("Сохранить").click();
  await button("Выполнить: Прогулка в парке").click();
  await button("Сохранить момент: Прогулка в парке").click();
  await button("Сохранить").click();
  await button("История").click();
  assert.ok(await page.getByText("Прогулка в парке", { exact: true }).count());
  await shot("06-history");
  await button("В избранное: Прогулка в парке").click();
  await settle();
  assert.equal(
    (await saved()).entries.find(
      (e) => e.title === "Прогулка в парке" && e.kind === "memory",
    ).liked,
    true,
  );
  assert.ok(
    (await saved()).entries.find(
      (e) => e.title === "Прогулка в парке" && e.kind === "memory",
    ).linkedId,
  );
  await button("Ещё").click();
  await shot("07-more");
  await page.getByRole("button", { name: /Нарисовать персонажа/ }).click();
  // Draw a closed outline through the actual pointer editor, then inspect the persisted contour.
  await page.waitForTimeout(700);
  const svg = page.locator("svg").last();
  const box = await svg.boundingBox();
  assert.ok(box);
  await page.mouse.move(box.x + 90, box.y + 40);
  await page.mouse.down();
  for (const [x, y] of [
    [130, 30],
    [170, 45],
    [195, 85],
    [190, 145],
    [150, 185],
    [95, 180],
    [65, 135],
    [65, 85],
    [90, 40],
  ])
    await page.mouse.move(box.x + x, box.y + y, { steps: 5 });
  await page.mouse.up();
  await shot("08-silhouette");
  await button("Оживить силуэт").click();
  await settle();
  assert.ok((await saved()).silhouette.length >= 8);
  await shot("09-custom-creature");
  await page.setViewportSize({ width: 320, height: 640 });
  await shot("10-small-screen");
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  await button("Настроить комнату").click();
  await shot("11-small-editor");
  const closeBox = await button("Отменить редактирование").boundingBox();
  assert.ok(
    closeBox && closeBox.x >= 0 && closeBox.x + closeBox.width <= 320,
    "editor close must stay inside narrow screen",
  );
  await button("Отменить редактирование").click();
  await page.reload();
  await page.waitForTimeout(900);
  assert.ok((await saved()).silhouette.length >= 8);
  assert.equal(
    (await saved()).messages.at(-1).text,
    "Ты — мой любимый человек",
  );
  fs.writeFileSync(
    "screenshots/browser-results.json",
    JSON.stringify(
      {
        viewport: "390x844 and 320x640",
        checks: [
          "WebGL scene",
          "five tabs",
          "chat persistence",
          "six room themes",
          "editor save/cancel",
          "undo/redo controls",
          "task to linked memory",
          "favourite persistence",
          "draw to extruded creature",
          "narrow viewport",
          "reload persistence",
        ],
        errors,
      },
      null,
      2,
    ),
  );
  console.log("Browser checks passed. Errors:", JSON.stringify(errors));
  await browser.close();
  if (errors.length) process.exitCode = 1;
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
