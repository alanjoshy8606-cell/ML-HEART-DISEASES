document.addEventListener("DOMContentLoaded", () => {
    const $ = (id) => document.getElementById(id);
    const number = (value) => Number(value || 0).toLocaleString("en-IN");
    let activityChart = null;
    let distributionChart = null;

    const toast = (message) => {
        const el = $("toast");
        if (!el) return;
        el.textContent = message;
        el.classList.add("show");
        window.setTimeout(() => el.classList.remove("show"), 2400);
    };

    
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


    document.querySelectorAll("[data-coming-soon]").forEach(link => {
        link.addEventListener("click", event => {
            event.preventDefault();
            toast("This section will be implemented in the next phase.");
        });
    });

    function renderActivity(labels, values) {
        const canvas = $("activityChart"), empty = $("activityEmpty");
        if (!canvas || !window.Chart) return;
        if (!labels || labels.length === 0) {
            if (empty) empty.style.display = "grid";
            canvas.style.opacity = "0.18";
            if (activityChart) activityChart.destroy();
            return;
        }
        if (empty) empty.style.display = "none";
        canvas.style.opacity = "1";
        if (activityChart) activityChart.destroy();
        activityChart = new Chart(canvas, {
            type: "line",
            data: { labels, datasets: [{ label: "Prediction requests", data: values,
                borderColor: "#F07891", backgroundColor: "rgba(240,120,145,.12)",
                fill: true, tension: .38, borderWidth: 2, pointRadius: 3,
                pointHoverRadius: 5, pointBackgroundColor: "#FFC0CC" }] },
            options: { responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: false }, tooltip: { backgroundColor: "#351020", titleColor: "#FFF3F5", bodyColor: "#FFC0CC" } },
                scales: { x: { grid: { display: false }, ticks: { color: "#A98490" } },
                    y: { beginAtZero: true, grid: { color: "rgba(255,192,204,.07)" }, ticks: { precision: 0, color: "#A98490" } } } }
        });
    }
    function renderDistribution(yes, no) {
        const canvas = $("distributionChart");
        if (!canvas || !window.Chart) return;
        if (distributionChart) distributionChart.destroy();
        distributionChart = new Chart(canvas, { type: "doughnut",
            data: { labels: ["Yes", "No"], datasets: [{ data: [yes, no],
                backgroundColor: ["#F07891", "#714454"], borderWidth: 0, hoverOffset: 5 }] },
            options: { responsive: true, maintainAspectRatio: false, cutout: "78%",
                plugins: { legend: { display: false }, tooltip: { backgroundColor: "#351020", titleColor: "#FFF3F5", bodyColor: "#FFC0CC" } } } });
    }
    function percent(value) { const n=Number(value); return Number.isFinite(n)?`${(n*100).toFixed(2)}%`:"—"; }
    function renderModels(model) {
        const tbody=$("modelTable"), results=model.metrics||{}, names=Object.keys(results);
        $("bestModelBadge").textContent=(model.selected||"Random Forest").toUpperCase();
        if(!names.length){tbody.innerHTML='<tr><td colspan="7" class="table-empty">Run ml/model_comparison.py to publish evaluation metrics here.</td></tr>';return;}
        tbody.replaceChildren();
        names.forEach(name=>{
            const metrics=results[name]||{},row=document.createElement("tr"),best=name===model.selected;
            if(best)row.classList.add("best-row");
            [name,percent(metrics.accuracy),percent(metrics.precision),percent(metrics.recall),percent(metrics.f1),percent(metrics.roc_auc)].forEach(value=>{
                const td=document.createElement("td");td.textContent=value;row.appendChild(td);
            });
            const status=document.createElement("td");
            if(best){const badge=document.createElement("span");badge.className="model-status";badge.textContent="SELECTED";status.appendChild(badge);}
            else status.textContent="EVALUATED";
            row.appendChild(status);tbody.appendChild(row);
        });
    }
    function renderRecent(items) {
        const container=$("recentList");container.replaceChildren();
        if(!items||!items.length){const empty=document.createElement("div");empty.className="recent-empty";empty.textContent="No prediction activity recorded yet.";container.appendChild(empty);return;}
        items.forEach(item=>{
            const row=document.createElement("div");row.className="recent-row";
            const main=document.createElement("div");main.className="recent-main";
            const title=document.createElement("strong");title.textContent=item.prediction||"Prediction request";
            const subtitle=document.createElement("small");subtitle.textContent=item.algorithm||"Algorithm not recorded";main.append(title,subtitle);
            const status=document.createElement("span");status.className="recent-status";status.textContent=String(item.status||"UNKNOWN").toUpperCase();
            const time=document.createElement("span");time.className="recent-time";time.textContent=item.created_at||"";
            row.append(main,status,time);container.appendChild(row);
        });
    }
    async function loadDashboard() {
        try {
            const response=await fetch("/api/dashboard-data",{headers:{"Accept":"application/json"}});
            if(!response.ok)throw new Error("Dashboard data request failed");
            const data=await response.json(),ds=data.dataset||{},predictions=data.predictions||{},model=data.model||{};
            $("totalRecords").textContent=number(ds.total_records);
            $("successfulPredictions").textContent=number(predictions.successful);
            $("failedPredictions").textContent=number(predictions.unsuccessful);
            $("selectedModel").textContent=model.selected||"Not selected";
            $("featureCount").textContent=number(ds.feature_count);
            $("missingValues").textContent=number(ds.missing_values);
            $("duplicateRecords").textContent=number(ds.duplicate_records);
            $("positiveCases").textContent=number(ds.positive_cases);
            $("negativeCases").textContent=number(ds.negative_cases);
            $("distributionTotal").textContent=number(ds.total_records);
            $("datasetStatus").textContent=data.dataset_status||"Unknown";
            $("dataset-connection").textContent=data.dataset_status||"Unknown";
            $("datasetHealth").textContent=ds.missing_values===0&&ds.duplicate_records===0?"NO ISSUES FOUND":"REVIEW NEEDED";
            renderActivity(predictions.daily_labels||[],predictions.daily_success||[]);
            renderDistribution(ds.positive_cases||0,ds.negative_cases||0);
            renderModels(model);renderRecent(predictions.recent||[]);
        } catch(error){console.error(error);toast("Could not load dashboard data. Check the Flask server.");}
    }
    loadDashboard();
});
