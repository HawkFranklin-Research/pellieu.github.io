(() => {
  const deck = document.getElementById("deck");
  const slides = Array.from(document.querySelectorAll(".slide"));
  const steps = Array.from(document.querySelectorAll(".progress-step"));
  const previous = document.getElementById("previous");
  const next = document.getElementById("next");

  if (!deck || !slides.length || !steps.length) return;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let activeIndex = 0;

  function setActive(index) {
    activeIndex = index;
    slides.forEach((slide, slideIndex) => slide.classList.toggle("is-active", slideIndex === index));
    steps.forEach((step, stepIndex) => {
      step.classList.toggle("is-active", stepIndex === index);
      step.classList.toggle("is-complete", stepIndex < index);
      step.setAttribute("aria-current", stepIndex === index ? "step" : "false");
    });
    if (previous) previous.disabled = index === 0;
    if (next) next.disabled = index === slides.length - 1;
  }

  function goTo(index) {
    if (index < 0 || index >= slides.length) return;
    slides[index].scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
  }

  const observer = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (visible) setActive(slides.indexOf(visible.target));
    },
    { root: deck, threshold: [0.55, 0.72] }
  );

  slides.forEach((slide) => observer.observe(slide));
  steps.forEach((step) => step.addEventListener("click", () => goTo(Number(step.dataset.slide))));
  document.querySelectorAll("[data-jump]").forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      goTo(Number(link.dataset.jump));
    });
  });

  previous?.addEventListener("click", () => goTo(activeIndex - 1));
  next?.addEventListener("click", () => goTo(activeIndex + 1));

  window.addEventListener("keydown", (event) => {
    if (["ArrowDown", "PageDown", " "].includes(event.key)) {
      event.preventDefault();
      goTo(activeIndex + 1);
    }
    if (["ArrowUp", "PageUp"].includes(event.key)) {
      event.preventDefault();
      goTo(activeIndex - 1);
    }
    if (event.key === "Home") goTo(0);
    if (event.key === "End") goTo(slides.length - 1);
  });

  setActive(0);
  const initialSlide = slides.findIndex((slide) => `#${slide.id}` === window.location.hash);
  if (initialSlide > 0) {
    const restoreInitialSlide = () => {
      deck.scrollTop = initialSlide * deck.clientHeight;
      setActive(initialSlide);
    };
    window.addEventListener("load", () => window.setTimeout(restoreInitialSlide, 60), { once: true });
  }
})();
