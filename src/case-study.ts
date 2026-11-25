import "./case-study.css";

const progressBar = document.querySelector<HTMLElement>("[data-progress]");
const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

function updateProgress(): void {
  if (!progressBar) return;
  const scrollTop = window.scrollY;
  const max = document.documentElement.scrollHeight - window.innerHeight;
  const ratio = max > 0 ? scrollTop / max : 0;
  progressBar.style.transform = `scaleX(${Math.min(1, Math.max(0, ratio))})`;
}

let progressFrame = 0;

function scheduleProgress(): void {
  if (progressFrame) return;
  progressFrame = window.requestAnimationFrame(() => {
    progressFrame = 0;
    updateProgress();
  });
}

window.addEventListener("scroll", scheduleProgress, { passive: true });
window.addEventListener("resize", scheduleProgress);
window.addEventListener("load", scheduleProgress);
updateProgress();

for (const trigger of document.querySelectorAll<HTMLElement>("[data-focus-target]")) {
  trigger.addEventListener("click", (event) => {
    const targetId = trigger.dataset.focusTarget;
    const target = targetId ? document.getElementById(targetId) : null;
    if (!target) return;
    event.preventDefault();
    target.scrollIntoView({
      block: "start",
      behavior: motionQuery.matches ? "auto" : "smooth",
    });
    target.focus({ preventScroll: true });
  });
}

const transcript = document.getElementById(
  "film-transcript",
) as HTMLDetailsElement | null;

for (const trigger of document.querySelectorAll<HTMLElement>(
  "[data-open-transcript]",
)) {
  trigger.addEventListener("click", (event) => {
    if (!transcript) return;
    event.preventDefault();
    transcript.open = true;
    transcript.scrollIntoView({
      block: "start",
      behavior: motionQuery.matches ? "auto" : "smooth",
    });
    transcript
      .querySelector<HTMLElement>("summary")
      ?.focus({ preventScroll: true });
  });
}
