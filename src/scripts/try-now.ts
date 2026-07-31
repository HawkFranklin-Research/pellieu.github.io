type PublicScreeningResult = {
  screeningId?: string;
  stored?: boolean;
  communitySubmission?: {
    packetId?: string;
    status?: string;
    moderationStatus?: string;
    publicationStatus?: string;
  };
  photoQuality?: Array<{
    image: number;
    status: "clear" | "review";
    width: number;
    height: number;
    issues?: string[];
  }>;
  infectiousSignal?: {
    classification?: "infectious" | "non_infectious";
    probability?: number;
  };
  possibleMatches?: Array<{
    condition?: string;
    probability?: number;
    flagged?: boolean;
  }>;
  guidance?: { title?: string; items?: string[] };
  disclaimer?: string;
};

const MAX_FILES = 3;
const MAX_FILE_BYTES = 8 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

document.querySelectorAll<HTMLElement>("[data-try-now]").forEach((root) => {
  const dialog = root.querySelector<HTMLElement>(".try-now-dialog");
  const input = root.querySelector<HTMLInputElement>("[data-try-file-input]");
  const dropzone = root.querySelector<HTMLElement>("[data-try-dropzone]");
  const selected = root.querySelector<HTMLElement>("[data-try-selected]");
  const concern = root.querySelector<HTMLTextAreaElement>("[data-try-concern]");
  const confirmation = root.querySelector<HTMLInputElement>("[data-try-confirm]");
  const submit = root.querySelector<HTMLButtonElement>("[data-try-submit]");
  const error = root.querySelector<HTMLElement>("[data-try-error]");
  const uploadView = root.querySelector<HTMLElement>("[data-try-upload-view]");
  const loadingView = root.querySelector<HTMLElement>("[data-try-loading-view]");
  const resultView = root.querySelector<HTMLElement>("[data-try-result-view]");
  const loadingMessage = root.querySelector<HTMLElement>("[data-try-loading-message]");
  const apiBase = String(root.dataset.apiBase || "").replace(/\/$/, "");
  const appCheckSiteKey = String(root.dataset.appCheckSiteKey || "");
  let files: File[] = [];
  let previewUrls: string[] = [];
  let previousFocus: HTMLElement | null = null;
  let controller: AbortController | null = null;
  let appCheckPromise: Promise<unknown> | null = null;

  if (!dialog || !input || !dropzone || !selected || !confirmation || !submit || !error || !uploadView || !loadingView || !resultView) {
    return;
  }

  const showError = (message = "") => {
    error.textContent = message;
    error.hidden = !message;
  };

  const setView = (view: "upload" | "loading" | "result") => {
    uploadView.hidden = view !== "upload";
    loadingView.hidden = view !== "loading";
    resultView.hidden = view !== "result";
  };

  const updateSubmit = () => {
    submit.disabled = files.length === 0 || !confirmation.checked;
  };

  const releasePreviews = () => {
    previewUrls.forEach((url) => URL.revokeObjectURL(url));
    previewUrls = [];
  };

  const renderSelected = () => {
    releasePreviews();
    selected.replaceChildren();
    selected.hidden = files.length === 0;
    files.forEach((file, index) => {
      const item = document.createElement("article");
      const image = document.createElement("img");
      const meta = document.createElement("div");
      const title = document.createElement("strong");
      const size = document.createElement("small");
      const remove = document.createElement("button");
      const url = URL.createObjectURL(file);
      previewUrls.push(url);
      image.src = url;
      image.alt = `Selected skin photograph ${index + 1}`;
      title.textContent = `Photograph ${index + 1}`;
      size.textContent = `${(file.size / 1024 / 1024).toFixed(1)} MB`;
      meta.append(title, size);
      remove.type = "button";
      remove.textContent = "×";
      remove.setAttribute("aria-label", `Remove photograph ${index + 1}`);
      remove.addEventListener("click", () => {
        files.splice(index, 1);
        renderSelected();
      });
      item.append(image, meta, remove);
      selected.append(item);
    });
    updateSubmit();
  };

  const addFiles = (incoming: File[]) => {
    showError();
    const availableSlots = Math.max(0, MAX_FILES - files.length);
    const invalid = incoming.find((file) => !ALLOWED_TYPES.has(file.type));
    if (invalid) {
      showError("Use JPG, PNG or WebP photographs.");
      return;
    }
    const oversized = incoming.find((file) => file.size > MAX_FILE_BYTES);
    if (oversized) {
      showError("Each photograph must be 8 MB or smaller.");
      return;
    }
    const next = [...files];
    incoming.forEach((file) => {
      const duplicate = next.some((item) => item.name === file.name && item.size === file.size && item.lastModified === file.lastModified);
      if (!duplicate && next.length < MAX_FILES) next.push(file);
    });
    files = next;
    if (incoming.length > availableSlots) {
      showError("PelliScope screens up to three photographs at a time.");
    }
    renderSelected();
  };

  const reset = () => {
    controller?.abort();
    controller = null;
    files = [];
    input.value = "";
    if (concern) concern.value = "";
    confirmation.checked = false;
    showError();
    renderSelected();
    setView("upload");
  };

  const prewarm = () => {
    if (!apiBase) return;
    fetch(`${apiBase}/health`, { method: "GET", mode: "cors", cache: "no-store" }).catch(() => undefined);
  };

  const open = (trigger: HTMLElement) => {
    previousFocus = trigger;
    root.hidden = false;
    document.body.classList.add("try-now-open");
    window.requestAnimationFrame(() => {
      root.classList.add("is-open");
      dialog.focus();
    });
    prewarm();
  };

  const close = () => {
    controller?.abort();
    root.classList.remove("is-open");
    document.body.classList.remove("try-now-open");
    window.setTimeout(() => {
      root.hidden = true;
      reset();
      previousFocus?.focus();
    }, 180);
  };

  const appCheckToken = async (): Promise<string | null> => {
    if (!appCheckSiteKey) return null;
    if (!appCheckPromise) {
      appCheckPromise = (async () => {
        const config = JSON.parse(root.dataset.firebaseConfig || "{}");
        const [{ initializeApp }, { initializeAppCheck, ReCaptchaEnterpriseProvider }] = await Promise.all([
          import("firebase/app"),
          import("firebase/app-check")
        ]);
        const app = initializeApp(config, "pelliscope-marketing");
        return initializeAppCheck(app, {
          provider: new ReCaptchaEnterpriseProvider(appCheckSiteKey),
          isTokenAutoRefreshEnabled: true
        });
      })();
    }
    const appCheck = await appCheckPromise;
    const { getToken } = await import("firebase/app-check");
    const result = await getToken(appCheck as never, false);
    return result.token;
  };

  const appendText = (parent: Element | null, text: string) => {
    if (parent) parent.textContent = text;
  };

  const renderResult = (payload: PublicScreeningResult) => {
    const probability = Math.max(0, Math.min(1, Number(payload.infectiousSignal?.probability || 0)));
    const infectious = payload.infectiousSignal?.classification === "infectious";
    const signalCard = root.querySelector<HTMLElement>("[data-try-signal-card]");
    signalCard?.classList.toggle("is-elevated", infectious);
    appendText(root.querySelector("[data-try-reference]"), payload.screeningId || "Screening complete");
    appendText(root.querySelector("[data-try-signal-label]"), infectious ? "Elevated" : "Not elevated");
    appendText(root.querySelector("[data-try-signal-probability]"), `${Math.round(probability * 100)}% infectious probability`);
    const meter = root.querySelector<HTMLElement>("[data-try-signal-meter]");
    if (meter) meter.style.width = `${Math.max(2, probability * 100)}%`;

    const qualityRows = payload.photoQuality || [];
    const clearCount = qualityRows.filter((item) => item.status === "clear").length;
    appendText(
      root.querySelector("[data-try-quality-summary]"),
      clearCount === qualityRows.length ? `${clearCount} clear ${clearCount === 1 ? "image" : "images"}` : `${clearCount} of ${qualityRows.length} clear`
    );
    const qualityList = root.querySelector<HTMLElement>("[data-try-quality-list]");
    qualityList?.replaceChildren();
    qualityRows.forEach((row) => {
      const item = document.createElement("article");
      const copy = document.createElement("div");
      const title = document.createElement("strong");
      const detail = document.createElement("small");
      const status = document.createElement("span");
      title.textContent = `Photograph ${row.image}`;
      detail.textContent = row.issues?.length ? row.issues.join(" · ") : `${row.width} × ${row.height} · Clear enough to screen`;
      status.textContent = row.status === "clear" ? "Clear" : "Review";
      status.className = row.status === "clear" ? "is-clear" : "is-review";
      copy.append(title, detail);
      item.append(copy, status);
      qualityList?.append(item);
    });

    const matches = root.querySelector<HTMLOListElement>("[data-try-matches]");
    matches?.replaceChildren();
    (payload.possibleMatches || []).slice(0, 3).forEach((match, index) => {
      const row = document.createElement("li");
      const rank = document.createElement("span");
      const label = document.createElement("strong");
      const probabilityText = document.createElement("small");
      const bar = document.createElement("i");
      const value = Math.max(0, Math.min(1, Number(match.probability || 0)));
      rank.textContent = String(index + 1).padStart(2, "0");
      label.textContent = match.condition || "Unspecified pattern";
      probabilityText.textContent = `${Math.round(value * 100)}%`;
      bar.style.setProperty("--match", `${value * 100}%`);
      row.append(rank, label, probabilityText, bar);
      matches?.append(row);
    });

    appendText(root.querySelector("[data-try-guidance-title]"), payload.guidance?.title || "What to do next");
    const guidanceList = root.querySelector<HTMLUListElement>("[data-try-guidance-list]");
    guidanceList?.replaceChildren();
    (payload.guidance?.items || []).forEach((guidance) => {
      const item = document.createElement("li");
      item.textContent = guidance;
      guidanceList?.append(item);
    });
    appendText(
      root.querySelector("[data-try-disclaimer]"),
      payload.disclaimer || "AI-assisted screening is informational and is not a diagnosis or treatment plan."
    );
    const packetReference = payload.communitySubmission?.packetId
      ? `Community reference ${payload.communitySubmission.packetId.slice(0, 8).toUpperCase()} · ${payload.communitySubmission.moderationStatus || "pending moderation"}`
      : "Protected Community submission pending moderation";
    appendText(root.querySelector("[data-try-community-reference]"), packetReference);
    setView("result");
    resultView.focus?.();
  };

  const submitScreening = async () => {
    if (!files.length || !confirmation.checked || !apiBase) return;
    showError();
    setView("loading");
    controller = new AbortController();
    const messages = [
      "Checking image clarity and preparing the LiteRT screening engine.",
      "Looking for the infectious or non-infectious signal.",
      "Comparing the case with the 25-condition screening head.",
      "Preparing a clear first-screen summary."
    ];
    let messageIndex = 0;
    const messageTimer = window.setInterval(() => {
      messageIndex = Math.min(messageIndex + 1, messages.length - 1);
      appendText(loadingMessage, messages[messageIndex]);
    }, 6500);
    const timeout = window.setTimeout(() => controller?.abort(), 150_000);
    try {
      const form = new FormData();
      files.forEach((file) => form.append("files", file));
      form.append("concern", concern?.value.trim() || "");
      form.append("community_consent", "accepted");
      const headers = new Headers();
      const token = await appCheckToken();
      if (token) headers.set("X-Firebase-AppCheck", token);

      const sessionResponse = await fetch(`${apiBase}/public/v1/screen-session`, {
        method: "POST",
        headers,
        signal: controller.signal
      });
      const sessionPayload = await sessionResponse.json().catch(() => ({}));
      if (!sessionResponse.ok || !sessionPayload?.screeningToken) {
        throw new Error(sessionPayload?.detail || `Screening session could not be established (${sessionResponse.status}).`);
      }
      headers.set("X-Screening-Token", sessionPayload.screeningToken);

      const response = await fetch(`${apiBase}/public/v1/screen`, {
        method: "POST",
        body: form,
        headers,
        signal: controller.signal
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.detail || `Screening could not be completed (${response.status}).`);
      }
      renderResult(payload as PublicScreeningResult);
    } catch (requestError) {
      const message = requestError instanceof DOMException && requestError.name === "AbortError"
        ? "The screening took too long. Your photographs are still selected; please try once more."
        : requestError instanceof Error
          ? requestError.message
          : "Screening could not be completed.";
      setView("upload");
      showError(message);
    } finally {
      window.clearInterval(messageTimer);
      window.clearTimeout(timeout);
      controller = null;
    }
  };

  document.querySelectorAll<HTMLElement>("[data-try-now-open]").forEach((trigger) => {
    trigger.addEventListener("click", (event) => {
      event.preventDefault();
      open(trigger);
    });
  });
  root.querySelectorAll<HTMLElement>("[data-try-now-close], [data-try-now-dismiss]").forEach((element) => {
    element.addEventListener("click", close);
  });
  root.querySelector<HTMLElement>("[data-try-reset]")?.addEventListener("click", reset);
  dropzone.addEventListener("click", () => input.click());
  dropzone.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      input.click();
    }
  });
  input.addEventListener("change", () => addFiles(Array.from(input.files || [])));
  ["dragenter", "dragover"].forEach((name) => dropzone.addEventListener(name, (event) => {
    event.preventDefault();
    dropzone.classList.add("is-dragging");
  }));
  ["dragleave", "drop"].forEach((name) => dropzone.addEventListener(name, (event) => {
    event.preventDefault();
    dropzone.classList.remove("is-dragging");
  }));
  dropzone.addEventListener("drop", (event) => addFiles(Array.from(event.dataTransfer?.files || [])));
  confirmation.addEventListener("change", updateSubmit);
  submit.addEventListener("click", submitScreening);
  root.addEventListener("keydown", (event) => {
    if (event.key === "Escape") close();
    if (event.key !== "Tab") return;
    const focusable = Array.from(root.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )).filter((item) => !item.hidden && item.offsetParent !== null);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });
  updateSubmit();
});
