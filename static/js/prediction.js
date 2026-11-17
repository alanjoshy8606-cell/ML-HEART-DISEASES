document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("predictionForm");
    const steps = [...document.querySelectorAll(".form-step")];
    const indicators = [...document.querySelectorAll("[data-step-indicator]")];
    const previousButton = document.getElementById("previousButton");
    const nextButton = document.getElementById("nextButton");
    const submitButton = document.getElementById("submitButton");
    const stepCount = document.getElementById("stepCount");
    const formError = document.getElementById("formError");
    const resultOverlay = document.getElementById("resultOverlay");
    const toast = document.getElementById("toast");
    let currentStep = 0;

    const showToast = message => {
        toast.textContent = message;
        toast.classList.add("show");
        setTimeout(() => toast.classList.remove("show"), 2600);
    };

    const showError = message => {
        formError.textContent = message;
        formError.classList.add("show");
    };

    const clearError = () => {
        formError.textContent = "";
        formError.classList.remove("show");
    };

    function updateStep() {
        steps.forEach((step, index) => step.classList.toggle("active", index === currentStep));
        indicators.forEach((indicator, index) => {
            indicator.classList.toggle("active", index === currentStep);
            indicator.classList.toggle("completed", index < currentStep);
        });
        previousButton.disabled = currentStep === 0;
        nextButton.hidden = currentStep === steps.length - 1;
        submitButton.hidden = currentStep !== steps.length - 1;
        stepCount.textContent = `STEP 0${currentStep + 1} OF 0${steps.length}`;
        clearError();
        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    function validateCurrentStep() {
        const fields = [...steps[currentStep].querySelectorAll("input, select")];
        for (const field of fields) {
            if (!field.checkValidity()) {
                field.reportValidity();
                return false;
            }
            if (field.type === "number" && (!Number.isFinite(Number(field.value)) || Number(field.value) <= 0)) {
                field.focus();
                showError("Please enter a valid value greater than zero.");
                return false;
            }
        }
        return true;
    }

    nextButton.addEventListener("click", () => {
        if (!validateCurrentStep()) return;
        currentStep = Math.min(currentStep + 1, steps.length - 1);
        updateStep();
    });

    previousButton.addEventListener("click", () => {
        currentStep = Math.max(currentStep - 1, 0);
        updateStep();
    });

    function openResult(data) {
        document.getElementById("resultTitle").textContent = data.headline || "Prediction completed";
        document.getElementById("resultClass").textContent = data.result_label || `Predicted class: ${data.prediction}`;
        document.getElementById("resultExplanation").textContent = data.explanation || "";
        document.getElementById("resultAlgorithm").textContent = data.algorithm || "Random Forest";
        document.getElementById("resultDisclaimer").textContent = data.disclaimer || "";
        document.getElementById("resultSymbol").textContent = String(data.prediction).trim().toLowerCase() === "yes" ? "!" : "✓";
        resultOverlay.classList.add("open");
        resultOverlay.setAttribute("aria-hidden", "false");
    }

    function closeResult() {
        resultOverlay.classList.remove("open");
        resultOverlay.setAttribute("aria-hidden", "true");
    }

    document.getElementById("closeResult").addEventListener("click", closeResult);
    resultOverlay.addEventListener("click", event => {
        if (event.target === resultOverlay) closeResult();
    });
    document.getElementById("newPrediction").addEventListener("click", () => {
        closeResult();
        form.reset();
        currentStep = 0;
        updateStep();
    });

    form.addEventListener("submit", async event => {
        event.preventDefault();
        if (!validateCurrentStep()) return;

        const payload = Object.fromEntries(new FormData(form).entries());
        submitButton.disabled = true;
        submitButton.innerHTML = "Processing…";
        clearError();

        try {
            const response = await fetch("/api/predict", {
                method: "POST",
                headers: { "Content-Type": "application/json", "Accept": "application/json" },
                body: JSON.stringify(payload)
            });
            const data = await response.json();
            if (!response.ok || !data.success) {
                throw new Error(data.message || "The prediction request could not be completed.");
            }
            openResult(data);
        } catch (error) {
            showError(error.message || "Something went wrong. Please try again.");
        } finally {
            submitButton.disabled = false;
            submitButton.innerHTML = 'Run prediction <span>↗</span>';
        }
    });

    (function initSidebar() {
        const mobileToggle = document.getElementById("mobileToggle");
        const sidebar = document.getElementById("sidebar");
        if (!mobileToggle || !sidebar) return;

        let backdrop = document.querySelector(".sidebar-backdrop");
        if (!backdrop) {
            backdrop = document.createElement("div");
            backdrop.className = "sidebar-backdrop";
            document.body.appendChild(backdrop);
        }

        const openSidebar = () => {
            sidebar.classList.add("open");
            backdrop.classList.add("visible");
            document.body.classList.add("sidebar-open");
        };
        const closeSidebar = () => {
            sidebar.classList.remove("open");
            backdrop.classList.remove("visible");
            document.body.classList.remove("sidebar-open");
        };

        mobileToggle.addEventListener("click", (e) => {
            e.stopPropagation();
            if (sidebar.classList.contains("open")) closeSidebar();
            else openSidebar();
        });
        backdrop.addEventListener("click", closeSidebar);
        document.addEventListener("click", (event) => {
            if (window.innerWidth <= 760 && sidebar.classList.contains("open") &&
                !sidebar.contains(event.target) && !mobileToggle.contains(event.target)) {
                closeSidebar();
            }
        });
        window.addEventListener("resize", () => {
            if (window.innerWidth > 760) closeSidebar();
        });
        // Escape key
        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape" && sidebar.classList.contains("open")) closeSidebar();
        });
    })();

    updateStep();
});
