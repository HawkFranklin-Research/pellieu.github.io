import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const root = document.documentElement;
root.classList.add("motion-ready");

const header = document.querySelector<HTMLElement>("[data-header]");
const meter = document.querySelector<HTMLElement>("[data-scroll-meter]");
const menuButton = document.querySelector<HTMLButtonElement>(".menu-toggle");
const mobileMenu = document.querySelector<HTMLElement>("#mobile-menu");

const updateFrame = () => {
  const y = window.scrollY;
  header?.classList.toggle("is-scrolled", y > 24);
  const max = document.documentElement.scrollHeight - window.innerHeight;
  const progress = max > 0 ? y / max : 0;
  if (meter) meter.style.transform = `scaleX(${progress})`;
};

window.addEventListener("scroll", updateFrame, { passive: true });
updateFrame();

menuButton?.addEventListener("click", () => {
  const isOpen = menuButton.getAttribute("aria-expanded") === "true";
  menuButton.setAttribute("aria-expanded", String(!isOpen));
  if (mobileMenu) mobileMenu.hidden = isOpen;
  document.body.classList.toggle("menu-open", !isOpen);
});

mobileMenu?.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    menuButton?.setAttribute("aria-expanded", "false");
    if (mobileMenu) mobileMenu.hidden = true;
    document.body.classList.remove("menu-open");
  });
});

document.querySelectorAll<HTMLElement>("[data-phone-story]").forEach((story) => {
  const screens = Array.from(story.querySelectorAll<HTMLElement>("[data-phone-screen]"));
  const steps = Array.from(story.querySelectorAll<HTMLButtonElement>("[data-phone-step]"));
  const toggle = story.querySelector<HTMLButtonElement>("[data-phone-toggle]");
  let active = 0;
  let paused = reduceMotion;
  let timer: number | undefined;

  const render = (index: number) => {
    active = Math.max(0, Math.min(index, screens.length - 1));
    screens.forEach((screen, screenIndex) => {
      screen.classList.toggle("is-active", screenIndex === active);
      screen.classList.toggle("is-before", screenIndex < active);
    });
    steps.forEach((step, stepIndex) => {
      step.classList.toggle("is-active", stepIndex === active);
      step.classList.toggle("is-seen", stepIndex < active);
      if (stepIndex === active) step.setAttribute("aria-current", "step");
      else step.removeAttribute("aria-current");
    });
  };

  const schedule = () => {
    window.clearInterval(timer);
    if (paused || screens.length < 2) return;
    timer = window.setInterval(() => render((active + 1) % screens.length), 2600);
  };

  steps.forEach((step) => {
    step.addEventListener("click", () => {
      render(Number(step.dataset.phoneStep || 0));
      schedule();
    });
  });

  toggle?.addEventListener("click", () => {
    paused = !paused;
    toggle.classList.toggle("is-paused", paused);
    toggle.setAttribute("aria-label", paused ? "Play animation" : "Pause animation");
    schedule();
  });

  story.addEventListener("mouseenter", () => {
    if (!paused) window.clearInterval(timer);
  });
  story.addEventListener("mouseleave", schedule);
  story.addEventListener("focusin", () => window.clearInterval(timer));
  story.addEventListener("focusout", schedule);

  if (reduceMotion && toggle) {
    toggle.classList.add("is-paused");
    toggle.setAttribute("aria-label", "Play animation");
  }

  render(0);
  schedule();
});

document.querySelectorAll<HTMLElement>("[data-clinician-demo]").forEach((demo) => {
  const stages = Array.from(demo.querySelectorAll<HTMLElement>("[data-earning-stage]"));
  if (stages.length < 2 || reduceMotion) return;
  let active = 0;
  window.setInterval(() => {
    active = (active + 1) % stages.length;
    stages.forEach((stage, index) => stage.classList.toggle("is-active", index === active));
  }, 1900);
});

if (!reduceMotion) {
  const heroTimeline = gsap.timeline({ defaults: { ease: "power3.out" } });
  heroTimeline
    .from(".hero-eyebrow, .subpage-copy .eyebrow", { y: 24, opacity: 0, duration: 0.65 })
    .from(".hero h1, .subpage-copy h1", { y: 58, opacity: 0, duration: 1 }, "-=0.35")
    .from(".hero-lede, .subpage-copy > p", { y: 28, opacity: 0, duration: 0.75 }, "-=0.52")
    .from(".hero-actions", { y: 24, opacity: 0, duration: 0.65 }, "-=0.42")
    .from(".hero-assurance, .subpage-micro", { y: 18, opacity: 0, duration: 0.6 }, "-=0.36")
    .from(".hero-product .phone-shell, .subpage-visual, .clinic-console", {
      y: 70,
      opacity: 0,
      rotateY: -5,
      duration: 1.2
    }, "-=1.05")
    .from(".phone-story-controls", { opacity: 0, y: 18, duration: 0.5 }, "-=0.45");

  if (document.querySelector(".hero-contours")) {
    gsap.to(".hero-contours", {
      yPercent: 18,
      rotate: 3,
      ease: "none",
      scrollTrigger: {
        trigger: ".hero",
        start: "top top",
        end: "bottom top",
        scrub: 1
      }
    });
  }

  gsap.utils.toArray<HTMLElement>(
    ".clarity-heading, .clarity-lede, .handoff-copy, .doctor-copy, .care-loop-heading, .clinic-copy, .final-inner, .doctor-value-section .section-shell > .eyebrow, .doctor-value-section .section-shell > h2, .doctor-flow-layout > div, .doctor-earn-section .earn-panel > div:first-child, .clinic-workflow-section .section-shell > .eyebrow, .clinic-workflow-section .section-shell > h2, .clinic-benefits-layout > div:first-child"
  ).forEach((element) => {
    gsap.from(element.children.length ? element.children : element, {
      y: 46,
      opacity: 0,
      duration: 0.9,
      stagger: 0.1,
      ease: "power3.out",
      scrollTrigger: {
        trigger: element,
        start: "top 82%",
        once: true
      }
    });
  });

  gsap.utils.toArray<HTMLElement>("[data-reveal], .value-grid article").forEach((element, index) => {
    gsap.to(element, {
      y: 0,
      opacity: 1,
      duration: 0.9,
      delay: (index % 3) * 0.08,
      ease: "power3.out",
      scrollTrigger: {
        trigger: element,
        start: "top 84%",
        once: true
      }
    });
  });

  const caseCard = document.querySelector<HTMLElement>("[data-travelling-case]");
  const handoff = document.querySelector<HTMLElement>("[data-handoff]");
  if (caseCard && handoff) {
    gsap.to(caseCard, {
      left: "calc(100% - 11rem)",
      ease: "none",
      scrollTrigger: {
        trigger: handoff,
        start: "top 78%",
        end: "bottom 34%",
        scrub: 0.8
      }
    });
  }

  gsap.utils
    .toArray<HTMLElement>(".doctor-visual, .clinic-flow, .earn-flow, .clinic-workflow")
    .forEach((element) => {
      gsap.from(element, {
        y: 65,
        opacity: 0,
        duration: 1,
        ease: "power3.out",
        scrollTrigger: {
          trigger: element,
          start: "top 82%",
          once: true
        }
      });
  });

  gsap.to(".final-orbit", {
    rotate: 18,
    ease: "none",
    scrollTrigger: {
      trigger: ".final-cta",
      start: "top bottom",
      end: "bottom top",
      scrub: 1
    }
  });

  document.querySelectorAll<HTMLElement>(".magnetic").forEach((element) => {
    element.addEventListener("pointermove", (event) => {
      const box = element.getBoundingClientRect();
      const x = event.clientX - box.left - box.width / 2;
      const y = event.clientY - box.top - box.height / 2;
      gsap.to(element, { x: x * 0.07, y: y * 0.1, duration: 0.3, ease: "power2.out" });
    });
    element.addEventListener("pointerleave", () => {
      gsap.to(element, { x: 0, y: 0, duration: 0.5, ease: "elastic.out(1, 0.35)" });
    });
  });
}

window.addEventListener("load", () => ScrollTrigger.refresh());
