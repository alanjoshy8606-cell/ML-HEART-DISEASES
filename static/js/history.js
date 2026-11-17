document.addEventListener("DOMContentLoaded", () => {
  const $ = id => document.getElementById(id);
  const state = { page: 1, pages: 1, selectedId: null, timer: null };
  const fields = [
    ["age","Age"],["gender","Gender"],["glucose_mg_dl","Glucose (mg/dL)"],
    ["cholesterol_mg_dl","Cholesterol (mg/dL)"],["systolic_bp","Systolic BP (mmHg)"],
    ["diastolic_bp","Diastolic BP (mmHg)"],["bmi","BMI"],["heart_rate","Heart rate (bpm)"],
    ["smoking","Smoking"],["alcohol_consumption","Alcohol consumption"],
    ["physical_activity","Physical activity"],["family_history","Family history"]
  ];
  const toast = message => { const el=$("toast"); el.textContent=message; el.classList.add("show"); setTimeout(()=>el.classList.remove("show"),2400); };
  const esc = value => String(value ?? "—").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const formatDate = value => {
    if (!value) return "Date unavailable";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString("en-IN",{dateStyle:"medium",timeStyle:"short"});
  };
  function filters() {
    return new URLSearchParams({
      q:$("searchInput").value.trim(), status:$("statusFilter").value,
      prediction:$("predictionFilter").value, from:$("fromDate").value,
      to:$("toDate").value, page:state.page, per_page:15
    });
  }
  async function loadHistory() {
    const body=$("historyTable");
    body.innerHTML='<tr><td colspan="6" class="empty-cell">Loading prediction records...</td></tr>';
    try {
      const response=await fetch(`/api/history?${filters()}`,{headers:{Accept:"application/json"}});
      const data=await response.json();
      if(!response.ok || !data.success) throw new Error(data.message || "Could not load history.");
      state.pages=data.pages;
      $("totalRecords").textContent=data.total.toLocaleString("en-IN");
      $("resultCount").textContent=`Showing ${data.items.length ? ((state.page-1)*15+1) : 0}–${Math.min(state.page*15,data.total)} of ${data.total} records`;
      $("pageLabel").textContent=`Page ${state.page} of ${state.pages}`;
      $("previousPage").disabled=state.page<=1;
      $("nextPage").disabled=state.page>=state.pages;
      if(!data.items.length){body.innerHTML='<tr><td colspan="6" class="empty-cell">No matching prediction records found.</td></tr>';return;}
      body.replaceChildren();
      data.items.forEach(item=>{
        const tr=document.createElement("tr");
        const result=(item.prediction||"").toLowerCase();
        const resultClass=result==="yes"?"result-yes":result==="no"?"result-no":"";
        const statusClass=["success","successful","completed"].includes((item.status||"").toLowerCase())?"status-success":"status-failed";
        tr.innerHTML=`
          <td><span class="record-id">#${esc(item.id)}</span></td>
          <td><span class="date-cell">${esc(formatDate(item.created_at))}</span></td>
          <td><span class="result-pill ${resultClass}">${esc(item.prediction || "Not available")}</span></td>
          <td>${esc(item.algorithm || "Legacy / not recorded")}</td>
          <td><span class="status-pill ${statusClass}">${esc((item.status||"unknown").toUpperCase())}</span></td>
          <td><button class="action-link" data-view="${item.id}">View details ↗</button></td>`;
        body.appendChild(tr);
      });
      body.querySelectorAll("[data-view]").forEach(button=>button.addEventListener("click",()=>showDetails(button.dataset.view)));
    } catch(error) { console.error(error); body.innerHTML='<tr><td colspan="6" class="empty-cell">Unable to load history. Check the Flask server.</td></tr>'; toast(error.message); }
  }
  async function loadSummary() {
    try {
      const response=await fetch("/api/dashboard-data");
      const data=await response.json();
      $("successfulRecords").textContent=(data.predictions?.successful||0).toLocaleString("en-IN");
      $("failedRecords").textContent=(data.predictions?.unsuccessful||0).toLocaleString("en-IN");
      $("unknownRecords").textContent=(data.predictions?.unknown||0).toLocaleString("en-IN");
    } catch(error) { console.error(error); }
  }
  async function showDetails(id) {
    try {
      const response=await fetch(`/api/history/${id}`);
      const data=await response.json();
      if(!response.ok || !data.success) throw new Error(data.message || "Record not found.");
      const item=data.item; state.selectedId=item.id;
      $("detailTitle").textContent=`Prediction record #${item.id}`;
      const sections=[
        ["REQUEST INFORMATION",[
          ["Date & time",formatDate(item.created_at)],["Status",item.status],["Model output",item.prediction],["Algorithm",item.algorithm]
        ]],
        ["HEALTH & LIFESTYLE INPUTS",fields.map(([key,label])=>[label,item[key]])]
      ];
      const hasSavedInputs = fields.some(([key]) => item[key] !== null && item[key] !== undefined && item[key] !== "");
      const legacyNotice = !hasSavedInputs
        ? '<div class="legacy-notice">This is an older history entry. The original log did not save the health and lifestyle inputs, so those details are unavailable.</div>'
        : "";
      $("detailContent").innerHTML=legacyNotice + sections.map(([title,items])=>`
        <section class="detail-section"><h3>${title}</h3><div class="detail-grid">
          ${items.map(([label,value])=>`<div class="detail-item"><small>${esc(label)}</small><strong>${esc(value)}</strong></div>`).join("")}
        </div></section>`).join("");
      $("detailModal").classList.add("open"); $("detailModal").setAttribute("aria-hidden","false");
    } catch(error) { toast(error.message); }
  }
  function closeModal(){ $("detailModal").classList.remove("open"); $("detailModal").setAttribute("aria-hidden","true"); state.selectedId=null; }
  function applyFilters(){state.page=1;loadHistory();}
  $("searchInput").addEventListener("input",()=>{clearTimeout(state.timer);state.timer=setTimeout(applyFilters,300);});
  ["statusFilter","predictionFilter","fromDate","toDate"].forEach(id=>$(id).addEventListener("change",applyFilters));
  $("clearFilters").addEventListener("click",()=>{["searchInput","statusFilter","predictionFilter","fromDate","toDate"].forEach(id=>$(id).value="");applyFilters();});
  $("previousPage").addEventListener("click",()=>{if(state.page>1){state.page--;loadHistory();}});
  $("nextPage").addEventListener("click",()=>{if(state.page<state.pages){state.page++;loadHistory();}});
  $("closeModal").addEventListener("click",closeModal); $("closeModalBottom").addEventListener("click",closeModal);
  $("detailModal").addEventListener("click",event=>{if(event.target===$("detailModal"))closeModal();});
  $("deleteRecord").addEventListener("click",async()=>{
    if(!state.selectedId || !confirm(`Delete prediction record #${state.selectedId}? This cannot be undone.`))return;
    try{
      const response=await fetch(`/api/history/${state.selectedId}`,{method:"DELETE"});
      const data=await response.json(); if(!response.ok||!data.success)throw new Error(data.message||"Delete failed.");
      closeModal();toast("Prediction record deleted.");loadHistory();loadSummary();
    }catch(error){toast(error.message);}
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

  document.addEventListener("keydown",event=>{if(event.key==="Escape")closeModal();});
  loadHistory();loadSummary();
});
