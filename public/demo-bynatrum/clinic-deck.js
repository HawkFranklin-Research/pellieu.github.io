(() => {
  "use strict";

  const reel = document.querySelector("[data-reel]");
  const scenes = [...document.querySelectorAll(".deck-scene")];
  const progressButtons = [...document.querySelectorAll(".deck-progress button")];
  const topbar = document.querySelector("[data-topbar]");
  const counter = document.querySelector(".deck-counter");
  const shareButton = document.querySelector("[data-share]");
  const toast = document.querySelector(".deck-toast");
  const nextButton = document.querySelector("[data-next]");
  const liveDemo = document.querySelector("[data-live-demo]");
  const liveDemoFrame = document.querySelector("[data-live-demo-frame]");
  const liveDemoViewport = document.querySelector("[data-live-demo-viewport]");
  const liveDemoAddress = document.querySelector("[data-live-demo-address]");
  const liveDemoTabs = [...document.querySelectorAll("[data-live-demo-tab]")];
  const liveDemoRefresh = document.querySelector("[data-live-demo-refresh]");
  const liveDemoExternal = document.querySelector("[data-live-demo-external]");
  const clinicianScene = document.querySelector(".scene-clinician-combined");
  const clinicianPanels = [...document.querySelectorAll("[data-clinician-panel]")];
  const clinicianProgress = [...document.querySelectorAll("[data-clinician-phase-control]")];
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let activeIndex = 0;
  let clinicianPhase = "queue";
  let clinicianWheelLockedUntil = 0;

  if (!reel || scenes.length === 0) return;

  const clamp = (value, min, max) => Math.max(min, Math.min(value, max));

  const goTo = (index) => {
    scenes[clamp(index, 0, scenes.length - 1)].scrollIntoView({
      behavior: reducedMotion.matches ? "auto" : "smooth",
      block: "start",
    });
  };

  const setActive = (index) => {
    const previousIndex = activeIndex;
    activeIndex = clamp(index, 0, scenes.length - 1);

    scenes.forEach((scene, sceneIndex) => {
      scene.classList.toggle("is-active", sceneIndex === activeIndex);
    });

    progressButtons.forEach((button, buttonIndex) => {
      button.classList.toggle("is-active", buttonIndex === activeIndex);
      button.classList.toggle("is-seen", buttonIndex < activeIndex);
      if (buttonIndex === activeIndex) button.setAttribute("aria-current", "step");
      else button.removeAttribute("aria-current");
    });

    const activeScene = scenes[activeIndex];
    const tone = activeScene.dataset.tone === "light" ? "light" : "dark";
    topbar?.classList.toggle("is-light", tone === "light");
    topbar?.classList.toggle("is-dark", tone === "dark");
    document.documentElement.dataset.activeScene = String(activeIndex);

    if (counter) {
      counter.textContent = `${String(activeIndex + 1).padStart(2, "0")} / ${String(scenes.length).padStart(2, "0")}`;
    }

    const id = activeScene.id;
    if (id && window.location.hash !== `#${id}`) {
      history.replaceState(null, "", `#${id}`);
    }

    if (activeIndex === 2 && previousIndex !== 2) {
      setClinicianPhase(previousIndex > 2 ? "review" : "queue");
    }

    document.dispatchEvent(new CustomEvent("deck:scene", { detail: { index: activeIndex, id } }));
  };

  const observer = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

      if (visible) setActive(scenes.indexOf(visible.target));
    },
    { root: reel, threshold: [0.42, 0.6, 0.78] },
  );

  scenes.forEach((scene) => observer.observe(scene));
  progressButtons.forEach((button, index) => button.addEventListener("click", () => goTo(index)));
  nextButton?.addEventListener("click", () => goTo(1));

  document.addEventListener("keydown", (event) => {
    const interactive = event.target instanceof HTMLElement
      && Boolean(event.target.closest("button, a, input, textarea, select"));
    if (interactive) return;

    if (["ArrowDown", "PageDown", " "].includes(event.key)) {
      event.preventDefault();
      if (activeIndex === 2 && clinicianPhase === "queue") {
        setClinicianPhase("review");
        return;
      }
      goTo(activeIndex + 1);
    }
    if (["ArrowUp", "PageUp"].includes(event.key)) {
      event.preventDefault();
      if (activeIndex === 2 && clinicianPhase === "review") {
        setClinicianPhase("queue");
        return;
      }
      goTo(activeIndex - 1);
    }
    if (event.key === "Home") {
      event.preventDefault();
      goTo(0);
    }
    if (event.key === "End") {
      event.preventDefault();
      goTo(scenes.length - 1);
    }
  });

  // The opening plays once as concern -> photographs -> prepared case.
  const captureStory = document.querySelector("[data-capture-story]");
  let captureState = reducedMotion.matches ? 3 : 0;
  let captureTimer;

  const renderCapture = (state) => {
    captureState = clamp(state, 0, 3);
    if (captureStory) captureStory.dataset.captureState = String(captureState);
  };

  const stopCapture = () => window.clearInterval(captureTimer);
  const scheduleCapture = () => {
    stopCapture();
    if (reducedMotion.matches || activeIndex !== 0 || !captureStory) return;
    captureTimer = window.setInterval(() => {
      if (captureState >= 3) {
        stopCapture();
        return;
      }
      renderCapture(captureState + 1);
    }, 2100);
  };

  renderCapture(captureState);

  // Four-beat patient phone story. It runs only while its scene is visible.
  const phoneStory = document.querySelector("[data-phone-story]");
  const phoneScreens = [...document.querySelectorAll("[data-phone-screen]")];
  const phoneSteps = [...document.querySelectorAll("[data-phone-step]")];
  const phoneMeter = [...document.querySelectorAll(".phone-meter i")];
  const phoneToggle = document.querySelector("[data-phone-toggle]");
  let phoneIndex = 0;
  let phonePaused = reducedMotion.matches;
  let phoneTimer;

  const renderPhone = (index) => {
    phoneIndex = clamp(index, 0, phoneScreens.length - 1);

    phoneScreens.forEach((screen, screenIndex) => {
      screen.classList.toggle("is-active", screenIndex === phoneIndex);
      screen.classList.toggle("is-before", screenIndex < phoneIndex);
    });

    phoneSteps.forEach((step, stepIndex) => {
      step.classList.toggle("is-active", stepIndex === phoneIndex);
      if (stepIndex === phoneIndex) step.setAttribute("aria-current", "step");
      else step.removeAttribute("aria-current");
    });

    phoneMeter.forEach((mark, markIndex) => {
      mark.classList.toggle("is-active", markIndex === phoneIndex);
      mark.classList.toggle("is-seen", markIndex < phoneIndex);
    });
  };

  const stopPhone = () => window.clearInterval(phoneTimer);

  const schedulePhone = () => {
    stopPhone();
    if (phonePaused || activeIndex !== 0 || phoneScreens.length < 2) return;
    phoneTimer = window.setInterval(() => {
      if (phoneIndex === phoneScreens.length - 1) {
        stopPhone();
        return;
      }
      renderPhone(phoneIndex + 1);
    }, 5200);
  };

  phoneSteps.forEach((step, index) => {
    step.addEventListener("click", () => {
      renderPhone(index);
      schedulePhone();
    });
  });

  phoneToggle?.addEventListener("click", () => {
    phonePaused = !phonePaused;
    phoneToggle.classList.toggle("is-paused", phonePaused);
    phoneToggle.setAttribute("aria-label", phonePaused ? "Play patient journey animation" : "Pause patient journey animation");
    if (!phonePaused && phoneIndex === phoneScreens.length - 1) renderPhone(0);
    schedulePhone();
  });

  phoneStory?.addEventListener("mouseenter", stopPhone);
  phoneStory?.addEventListener("mouseleave", schedulePhone);
  phoneStory?.addEventListener("focusin", stopPhone);
  phoneStory?.addEventListener("focusout", schedulePhone);

  if (phonePaused && phoneToggle) {
    phoneToggle.classList.add("is-paused");
    phoneToggle.setAttribute("aria-label", "Play patient journey animation");
  }

  renderPhone(0);

  // Prepared-arrival queue: a passive simulation, never live patient data.
  const queueDemo = document.querySelector("[data-queue-demo]");
  const queueCases = [...document.querySelectorAll("[data-queue-case]")];
  const queueMetrics = [...document.querySelectorAll("[data-queue-metric]")];
  let queueIndex = 0;
  let queueTimer;

  const renderQueue = (index) => {
    queueIndex = clamp(index, 0, Math.max(queueCases.length - 1, 0));
    const metricKeys = (queueCases[queueIndex]?.dataset.queueMetricKey || "").split(" ");
    queueCases.forEach((row, rowIndex) => row.classList.toggle("is-active", rowIndex === queueIndex));
    queueMetrics.forEach((metric) => metric.classList.toggle("is-active", metricKeys.includes(metric.dataset.queueMetric)));
  };

  const stopQueue = () => window.clearInterval(queueTimer);
  const scheduleQueue = () => {
    stopQueue();
    if (reducedMotion.matches || activeIndex !== 2 || clinicianPhase !== "queue" || queueCases.length < 2) return;
    queueTimer = window.setInterval(() => renderQueue((queueIndex + 1) % queueCases.length), 3000);
  };

  queueDemo?.addEventListener("mouseenter", stopQueue);
  queueDemo?.addEventListener("mouseleave", scheduleQueue);
  renderQueue(0);

  // Clinical review alternates between complete, internally consistent cases.
  const clinicalDemo = document.querySelector("[data-clinical-demo]");
  const clinicalCases = [
    {
      state: "infectious",
      initial: "P",
      id: "PS-2048",
      meta: "34y · Female",
      risk: "High risk",
      images: [
        "/demo-bynatrum/case/insect-bite-1.jpg",
        "/demo-bynatrum/case/insect-bite-2.jpg",
        "/demo-bynatrum/case/insect-bite-1.jpg",
      ],
      complaint: "Itchy raised spots reported for two days.",
      chips: ["Itchy", "2 days", "Upper arm"],
      screenTitle: "Infectious signal detected",
      screenCopy: "Clinical review required promptly.",
      differentials: [["Insect Bite", 61], ["Urticaria", 23], ["Folliculitis", 11], ["Allergic contact dermatitis", 8], ["Scabies", 5]],
    },
    {
      state: "clear",
      initial: "N",
      id: "PS-2051",
      meta: "28y · Male",
      risk: "Low risk",
      images: [
        "/demo-bynatrum/case/eczema-1.jpg",
        "/demo-bynatrum/case/eczema-2.jpg",
        "/demo-bynatrum/case/eczema-1.jpg",
      ],
      complaint: "Dry recurring patch reported for one week.",
      chips: ["Dry", "1 week", "Ankle"],
      screenTitle: "Non-infectious likely",
      screenCopy: "No immediate contagion markers found.",
      differentials: [["Eczema", 58], ["Contact dermatitis", 24], ["Psoriasis", 10], ["Lichen simplex chronicus", 7], ["Tinea", 4]],
    },
  ];
  let clinicalCaseIndex = 0;
  let clinicalImageIndex = 0;
  let clinicalCaseTimer;
  let clinicalImageTimer;
  let clinicalTransitionTimer;

  const setText = (selector, value) => {
    const node = clinicalDemo?.querySelector(selector);
    if (node) node.textContent = value;
  };

  const renderClinicalImage = (index) => {
    if (!clinicalDemo) return;
    const currentCase = clinicalCases[clinicalCaseIndex];
    clinicalImageIndex = clamp(index, 0, currentCase.images.length - 1);
    const mainImage = clinicalDemo.querySelector("[data-case-main-image]");
    const primaryFrame = clinicalDemo.querySelector(".record-primary");
    if (mainImage) mainImage.src = currentCase.images[clinicalImageIndex];
    primaryFrame?.classList.toggle("is-close", clinicalImageIndex === 2);
    clinicalDemo.querySelectorAll("[data-case-thumb]").forEach((thumb, thumbIndex) => {
      thumb.classList.toggle("is-active", thumbIndex === clinicalImageIndex);
    });
  };

  const renderClinicalCase = (index) => {
    if (!clinicalDemo) return;
    clinicalCaseIndex = clamp(index, 0, clinicalCases.length - 1);
    clinicalImageIndex = 0;
    const currentCase = clinicalCases[clinicalCaseIndex];
    clinicalDemo.dataset.caseState = currentCase.state;
    setText("[data-case-initial]", currentCase.initial);
    setText("[data-case-id]", currentCase.id);
    setText("[data-case-meta]", currentCase.meta);
    setText("[data-case-risk]", currentCase.risk);
    setText("[data-case-complaint]", currentCase.complaint);
    setText("[data-case-screen-title]", currentCase.screenTitle);
    setText("[data-case-screen-copy]", currentCase.screenCopy);

    const chipRow = clinicalDemo.querySelector("[data-case-chips]");
    if (chipRow) chipRow.innerHTML = currentCase.chips.map((chip) => `<i>${chip}</i>`).join("");

    const banner = clinicalDemo.querySelector("[data-case-banner]");
    banner?.classList.toggle("infectious", currentCase.state === "infectious");
    banner?.classList.toggle("clear", currentCase.state === "clear");

    currentCase.images.forEach((source, imageIndex) => {
      const image = clinicalDemo.querySelector(`[data-case-image="${imageIndex}"]`);
      if (image) image.src = source;
    });

    currentCase.differentials.forEach(([name, value], differentialIndex) => {
      setText(`[data-diff-name="${differentialIndex}"]`, name);
      setText(`[data-diff-value="${differentialIndex}"]`, `${value}%`);
      const bar = clinicalDemo.querySelector(`[data-diff-bar="${differentialIndex}"]`);
      if (bar) bar.style.setProperty("--bar", `${value}%`);
    });
    renderClinicalImage(0);
  };

  const stopClinical = () => {
    window.clearInterval(clinicalCaseTimer);
    window.clearInterval(clinicalImageTimer);
    window.clearTimeout(clinicalTransitionTimer);
    clinicalDemo?.classList.remove("is-transitioning");
  };

  const scheduleClinical = () => {
    stopClinical();
    if (reducedMotion.matches || activeIndex !== 2 || clinicianPhase !== "review" || !clinicalDemo) return;
    clinicalImageTimer = window.setInterval(() => {
      const total = clinicalCases[clinicalCaseIndex].images.length;
      renderClinicalImage((clinicalImageIndex + 1) % total);
    }, 1900);
    clinicalCaseTimer = window.setInterval(() => {
      clinicalDemo.classList.add("is-transitioning");
      clinicalTransitionTimer = window.setTimeout(() => {
        renderClinicalCase((clinicalCaseIndex + 1) % clinicalCases.length);
        clinicalDemo.classList.remove("is-transitioning");
      }, 320);
    }, 6000);
  };

  clinicalDemo?.addEventListener("mouseenter", stopClinical);
  clinicalDemo?.addEventListener("mouseleave", scheduleClinical);
  renderClinicalCase(0);

  const setClinicianPhase = (phase) => {
    clinicianPhase = phase === "review" ? "review" : "queue";
    clinicianScene?.setAttribute("data-clinician-phase", clinicianPhase);
    clinicianPanels.forEach((panel) => {
      panel.classList.toggle("is-active", panel.dataset.clinicianPanel === clinicianPhase);
    });
    clinicianProgress.forEach((mark, index) => {
      const isActive = index === (clinicianPhase === "queue" ? 0 : 1);
      mark.classList.toggle("is-active", isActive);
      mark.setAttribute("aria-pressed", String(isActive));
    });

    if (activeIndex !== 2) return;
    if (clinicianPhase === "queue") {
      stopClinical();
      scheduleQueue();
    } else {
      stopQueue();
      scheduleClinical();
    }
  };

  clinicianProgress.forEach((control) => {
    control.addEventListener("click", () => {
      setClinicianPhase(control.dataset.clinicianPhaseControl);
    });
  });

  reel.addEventListener(
    "wheel",
    (event) => {
      const eventTarget = event.target instanceof Node ? event.target : null;
      const isClinicianInteraction = activeIndex === 2
        || Boolean(eventTarget && clinicianScene?.contains(eventTarget));
      if (!isClinicianInteraction || Math.abs(event.deltaY) < 12) return;
      const now = performance.now();
      if (now < clinicianWheelLockedUntil) {
        event.preventDefault();
        return;
      }

      if (event.deltaY > 0 && clinicianPhase === "queue") {
        event.preventDefault();
        clinicianWheelLockedUntil = now + 520;
        setClinicianPhase("review");
      } else if (event.deltaY < 0 && clinicianPhase === "review") {
        event.preventDefault();
        clinicianWheelLockedUntil = now + 520;
        setClinicianPhase("queue");
      }
    },
    { passive: false },
  );

  document.addEventListener("deck:scene", (event) => {
    if (event.detail.index === 0) {
      renderCapture(reducedMotion.matches ? 3 : 0);
      scheduleCapture();
    } else {
      stopCapture();
    }

    if (event.detail.index === 0) {
      if (phoneIndex === phoneScreens.length - 1 && !phonePaused) renderPhone(0);
      schedulePhone();
    } else {
      stopPhone();
    }

    if (event.detail.index === 2) setClinicianPhase(clinicianPhase);
    else {
      stopQueue();
      stopClinical();
    }
  });

  // The final scene embeds the unchanged Naturalium demo. Cross-origin access is
  // intentionally limited to navigation and load-state events.
  const liveDemoViews = {
    patient: {
      url: "https://demo.pelliscope.eu/",
      title: "Naturalium patient demonstration",
      address: "demo.pelliscope.eu",
    },
    clinician: {
      url: "https://demo.pelliscope.eu/clinician",
      title: "Naturalium clinician portal demonstration",
      address: "demo.pelliscope.eu/clinician",
    },
  };
  let liveDemoView = "patient";

  const markLiveDemoLoading = () => liveDemoViewport?.classList.add("is-loading");

  const setLiveDemoView = (view) => {
    if (!liveDemo || !liveDemoFrame || !liveDemoViews[view]) return;
    liveDemoView = view;
    const selected = liveDemoViews[liveDemoView];

    liveDemoTabs.forEach((tab) => {
      const isActive = tab.dataset.liveDemoTab === liveDemoView;
      tab.classList.toggle("is-active", isActive);
      tab.setAttribute("aria-selected", String(isActive));
    });

    if (liveDemoAddress) liveDemoAddress.textContent = selected.address;
    if (liveDemoExternal) liveDemoExternal.href = selected.url;
    liveDemoFrame.title = selected.title;

    if (liveDemoFrame.src !== selected.url) {
      markLiveDemoLoading();
      liveDemoFrame.src = selected.url;
    }
  };

  liveDemoTabs.forEach((tab) => {
    tab.addEventListener("click", () => setLiveDemoView(tab.dataset.liveDemoTab));
  });

  liveDemoRefresh?.addEventListener("click", () => {
    if (!liveDemoFrame) return;
    markLiveDemoLoading();
    liveDemoFrame.src = liveDemoViews[liveDemoView].url;
  });

  liveDemoFrame?.addEventListener("load", () => {
    liveDemoViewport?.classList.remove("is-loading");
  });

  setLiveDemoView("patient");

  shareButton?.addEventListener("click", async () => {
    const data = {
      title: "PelliScope Digital Telemedicine Platform | HawkFranklin OÜ",
      text: "See how PelliScope connects digital inquiry, AI-assisted screening and prepared clinical review.",
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(data);
      } else {
        await navigator.clipboard.writeText(data.url);
        toast?.classList.add("is-visible");
        window.setTimeout(() => toast?.classList.remove("is-visible"), 1800);
      }
    } catch (error) {
      if (error?.name === "AbortError") return;
      window.location.href = `mailto:?subject=${encodeURIComponent(data.title)}&body=${encodeURIComponent(data.url)}`;
    }
  });

  const hashTarget = window.location.hash ? document.querySelector(window.location.hash) : null;
  const linkedScene = hashTarget?.closest(".deck-scene");
  if (linkedScene) {
    const linkedIndex = scenes.indexOf(linkedScene);
    setActive(linkedIndex);
    requestAnimationFrame(() => goTo(linkedIndex));
  } else {
    setActive(0);
  }
})();
