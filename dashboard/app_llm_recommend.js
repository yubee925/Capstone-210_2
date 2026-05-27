(function () {
  const data = window.SEONGDONG_DASHBOARD_DATA;
  const microMapData = window.SEONGDONG_MICRO_MAP_DATA;
  if (!data || !Array.isArray(data.records)) {
    document.body.innerHTML = "<p style='padding:24px'>대시보드 데이터를 불러오지 못했습니다.</p>";
    return;
  }

  const state = {
    mode: "macro",
    selectedDong: data.records[0].dong,
    selectedMicroCell: null,
    agentDong: data.records[0].dong,
    agentTopic: "risk_summary",
    agentMode: "guided",
    agentHistory: {
      guided: [],
      free: [],
    },
  };

  const driverNameMap = {
    "인구(A)": "인구",
    "소비성향(B)": "소비성향 비율",
    "회전율(C)": "회전율",
    "영업기간 역지표(D)": "영업기간 역지표",
    "프랜차이즈(E)": "프랜차이즈비율",
    "유동인구(F)": "유동인구",
    "팝업비율(G1)": "팝업비율",
    "팝업강도(G2)": "팝업강도",
  };

  const INTENSITY_PROMINENCE_MIN = 0.65;
  const INTENSITY_GAP_MIN = 0.08;

  const elements = {
    mapSvg: document.getElementById("mapSvg"),
    macroMapContainer: document.getElementById("macroMapContainer"),
    microGridContainer: document.getElementById("microGridContainer"),
    microLeafletMap: document.getElementById("microLeafletMap"),
    mapTitle: document.getElementById("mapTitle"),
    mapDescription: document.getElementById("mapDescription"),
    dongSelect: document.getElementById("dongSelect"),
    detailDong: document.getElementById("detailDong"),
    riskScore: document.getElementById("riskScore"),
    riskLevel: document.getElementById("riskLevel"),
    intensityScore: document.getElementById("intensityScore"),
    intensityLevel: document.getElementById("intensityLevel"),
    intensityDriversText: document.getElementById("intensityDriversText"),
    intensityDriversDescription: document.getElementById("intensityDriversDescription"),
    gaugeFill: document.getElementById("gaugeFill"),
    gaugePercent: document.getElementById("gaugePercent"),
    driversText: document.getElementById("driversText"),
    microMetricGuide: document.getElementById("microMetricGuide"),
    microSelectedPanel: document.getElementById("microSelectedPanel"),
    microCellTitle: document.getElementById("microCellTitle"),
    microRiskBadge: document.getElementById("microRiskBadge"),
    microRiskSummary: document.getElementById("microRiskSummary"),
    microStationName: document.getElementById("microStationName"),
    microStationDistance: document.getElementById("microStationDistance"),
    microRoadDistance: document.getElementById("microRoadDistance"),
    microStoreCount: document.getElementById("microStoreCount"),
    microScoreChart: document.getElementById("microScoreChart"),
    microReportText: document.getElementById("microReportText"),
    metricTable: document.getElementById("metricTable"),
    rankingList: document.getElementById("rankingList"),
    agentModeToggle: document.getElementById("agentModeToggle"),
    guidedAgentPanel: document.getElementById("guidedAgentPanel"),
    freeAgentPanel: document.getElementById("freeAgentPanel"),
    agentStatusCard: document.getElementById("agentStatusCard"),
    agentStatusBadge: document.getElementById("agentStatusBadge"),
    agentStatusDetail: document.getElementById("agentStatusDetail"),
    agentDongSelect: document.getElementById("agentDongSelect"),
    agentTopicSelect: document.getElementById("agentTopicSelect"),
    agentInput: document.getElementById("agentInput"),
    agentSendButton: document.getElementById("agentSendButton"),
    freeAgentInput: document.getElementById("freeAgentInput"),
    freeAgentSendButton: document.getElementById("freeAgentSendButton"),
    agentMessages: document.getElementById("agentMessages"),
    freeAgentMessages: document.getElementById("freeAgentMessages"),
    recommendGrid: document.getElementById("recommendGrid"),
    topDong: document.getElementById("topDong"),
    topDongMeta: document.getElementById("topDongMeta"),
    selectedSummaryTitle: document.getElementById("selectedSummaryTitle"),
    selectedSummaryMeta: document.getElementById("selectedSummaryMeta"),
    detailInterpretation: document.getElementById("detailInterpretation"),
  };

  const bounds = getBounds(data.records);
  const projected = projectRecords(data.records, bounds);
  let microMap = null;
  let microMapReady = false;
  let activeMicroCell = null;
  let guidedRequestInFlight = false;

  initControls();
  renderMap();
  renderRanking();
  updateHeaderStats();
  updateSelection(state.selectedDong);

  function initControls() {
    projected.forEach((record) => {
      const option = document.createElement("option");
      option.value = record.dong;
      option.textContent = record.dong;
      elements.dongSelect.appendChild(option);

      const agentOption = document.createElement("option");
      agentOption.value = record.dong;
      agentOption.textContent = record.dong;
      elements.agentDongSelect.appendChild(agentOption);
    });

    elements.dongSelect.value = state.selectedDong;
    elements.agentDongSelect.value = state.agentDong;
    elements.dongSelect.addEventListener("change", (event) => updateSelection(event.target.value));
    elements.agentDongSelect.addEventListener("change", (event) => {
      state.agentDong = event.target.value;
      seedAgentConversation();
    });
    elements.agentTopicSelect.addEventListener("change", (event) => {
      state.agentTopic = event.target.value;
      syncQuestionPlaceholders();
      seedAgentConversation();
    });

    elements.agentModeToggle.querySelectorAll("[data-agent-mode]").forEach((button) => {
      button.addEventListener("click", () => {
        elements.agentModeToggle
          .querySelectorAll("[data-agent-mode]")
          .forEach((item) => item.classList.remove("active"));
        button.classList.add("active");
        state.agentMode = button.dataset.agentMode;
        renderAgentMode();
        syncQuestionPlaceholders();
      });
    });

    document.querySelectorAll(".mode-button").forEach((button) => {
      button.addEventListener("click", () => {
        if (!button.hasAttribute("data-mode")) return;
        document.querySelectorAll(".mode-button[data-mode]").forEach((item) => item.classList.remove("active"));
        button.classList.add("active");
        state.mode = button.dataset.mode;
        renderMode();
      });
    });

    elements.agentSendButton.addEventListener("click", () => {
      handleAgentSend();
    });
    elements.agentInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        handleAgentSend();
      }
    });

    elements.recommendGrid.querySelectorAll(".recommend-chip").forEach((button) => {
      button.addEventListener("click", () => handleRecommendedQuestion(button.dataset.question));
    });

    elements.freeAgentSendButton.addEventListener("click", () => {
      handleFreeAgentSend();
    });
    elements.freeAgentInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        handleFreeAgentSend();
      }
    });

    renderAgentMode();
    syncQuestionPlaceholders();
    seedAgentConversation();
    loadAgentStatus();
  }

  function renderMap() {
    elements.mapSvg.innerHTML = "";
    projected.forEach((record) => {
      record.paths.forEach((pathData) => {
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("d", pathData);
        path.setAttribute("fill", colorForLevel(record.risk_level));
        path.setAttribute("class", "district");
        path.dataset.dong = record.dong;
        path.addEventListener("click", () => updateSelection(record.dong));
        elements.mapSvg.appendChild(path);
      });

      const ring = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      ring.setAttribute("cx", record.screenCentroid[0]);
      ring.setAttribute("cy", record.screenCentroid[1]);
      ring.setAttribute("r", state.mode === "micro" ? "16" : "0");
      ring.setAttribute("class", "marker-ring");
      elements.mapSvg.appendChild(ring);

      const marker = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      marker.setAttribute("cx", record.screenCentroid[0]);
      marker.setAttribute("cy", record.screenCentroid[1]);
      marker.setAttribute("r", state.mode === "micro" ? "6" : "0");
      marker.setAttribute("class", "marker");
      marker.addEventListener("click", () => updateSelection(record.dong));
      elements.mapSvg.appendChild(marker);

      const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
      label.setAttribute("x", record.screenCentroid[0]);
      label.setAttribute("y", record.screenCentroid[1] - 12);
      label.setAttribute("class", "district-label");
      label.textContent = record.dong;
      elements.mapSvg.appendChild(label);

      const score = document.createElementNS("http://www.w3.org/2000/svg", "text");
      score.setAttribute("x", record.screenCentroid[0]);
      score.setAttribute("y", record.screenCentroid[1] + 10);
      score.setAttribute("class", "district-score");
      score.textContent = record.risk_score.toFixed(1);
      elements.mapSvg.appendChild(score);
    });

    renderMode();
  }

  function renderMode() {
    const micro = state.mode === "micro";
    elements.mapTitle.textContent = micro
      ? "미시적 모드: 성동구 100m 격자 위험 분포"
      : "거시적 모드: 성동구 전체 위험 분포";
    elements.mapDescription.textContent = micro
      ? "미시적 모드는 성동구를 100m 표준 격자로 나누어 젠트리피케이션 위험도를 세밀하게 확인하는 화면입니다. 각 격자 색상은 행정동 위험도에 격자 가중치 비율을 곱한 값, 즉 동 위험도 × (격자 W / 동 전체 W 합계)를 기준으로 시각화되었습니다."
      : "거시적 모드는 행정동 단위 상대 위험도를 비교하는 화면입니다. 각 행정동의 위험도 점수와 주요 기여 요인을 함께 확인할 수 있습니다.";
    elements.microMetricGuide.classList.toggle("hidden", !micro);
    elements.microSelectedPanel.classList.toggle("hidden", !micro);
    if (micro) {
      renderMicroSelection(state.selectedMicroCell);
    }

    elements.mapSvg.querySelectorAll(".marker").forEach((node) => node.setAttribute("r", micro ? "6" : "0"));
    elements.mapSvg.querySelectorAll(".marker-ring").forEach((node) => node.setAttribute("r", micro ? "16" : "0"));

    if (micro) {
      elements.macroMapContainer.classList.add("hidden");
      elements.microGridContainer.classList.remove("hidden");
      initMicroMap();
      if (microMap) {
        window.setTimeout(() => microMap.invalidateSize(), 0);
      }
    } else {
      elements.macroMapContainer.classList.remove("hidden");
      elements.microGridContainer.classList.add("hidden");
    }
  }

  function updateSelection(dong) {
    state.selectedDong = dong;
    elements.dongSelect.value = dong;
    const record = projected.find((item) => item.dong === dong);
    if (!record) return;

    elements.mapSvg.querySelectorAll(".district").forEach((node) => {
      node.classList.toggle("active", node.dataset.dong === dong);
    });

    elements.detailDong.textContent = record.dong;
    elements.riskScore.textContent = record.risk_score.toFixed(1);
    elements.riskLevel.textContent = `위험등급 ${record.risk_level}`;
    elements.intensityScore.textContent = record.intensity_score.toFixed(1);
    elements.intensityLevel.textContent = `보조강도 ${record.intensity_level}`;
    renderIntensitySummary(record);
    elements.gaugeFill.style.width = `${record.risk_score}%`;
    elements.gaugePercent.textContent = `${(record.risk_percentile * 100).toFixed(1)} pct`;
    elements.driversText.textContent = formatDrivers(record.top2_drivers);
    elements.detailInterpretation.textContent = formatInterpretation(record.interpretation);
    elements.selectedSummaryTitle.textContent = `${record.dong} · ${record.risk_level}`;
    elements.selectedSummaryMeta.textContent = `${formatDrivers(record.top2_drivers)} 영향이 크게 반영됨`;
    renderMetrics(record);
    if (state.agentDong === dong) seedAgentConversation();
  }

  function renderMicroSelection(cell) {
    if (!cell) {
      elements.microCellTitle.textContent = "격자를 선택하세요";
      elements.microRiskBadge.className = "micro-risk-badge";
      elements.microRiskBadge.textContent = "-";
      elements.microRiskSummary.textContent = "미시적 모드에서 지도 격자를 클릭하면 행정동 위험도를 격자 가중치 비율로 배분한 격자 위험도가 표시됩니다.";
      elements.microStationName.textContent = "-";
      elements.microStationDistance.textContent = "-";
      elements.microRoadDistance.textContent = "-";
      elements.microStoreCount.textContent = "-";
      elements.microScoreChart.innerHTML = "";
      elements.microReportText.textContent = "-";
      return;
    }

    const riskClass = microRiskClass(cell.grid_risk_level || cell.risk_level);
    elements.microCellTitle.textContent = `ID ${cell.id} · 행 ${cell.row_index}, 열 ${cell.col_index}`;
    elements.microRiskBadge.className = `micro-risk-badge ${riskClass}`;
    elements.microRiskBadge.textContent = `격자위험도 ${cell.grid_risk_level || cell.risk_level} · ${formatGridRisk(cell.grid_risk_score)}`;
    elements.microRiskSummary.textContent = microRiskDescription(cell);
    elements.microStationName.textContent = cell.station_name || "-";
    elements.microStationDistance.textContent = formatDistance(cell.station_distance_m);
    elements.microRoadDistance.textContent = formatDistance(cell.road_distance_m);
    elements.microStoreCount.textContent = `${cell.store_count ?? 0}개`;
    renderMicroScoreChart(cell);
    elements.microReportText.textContent = buildMicroReport(cell);
  }

  function renderMicroScoreChart(cell) {
    const metrics = [
      ["S", "상가밀도", cell.S],
      ["P", "팝업", cell.P],
      ["Rsub", "역세권", cell.R_sub],
      ["Rroad", "대로변", cell.R_road],
    ];
    elements.microScoreChart.innerHTML = "";
    metrics.forEach(([code, label, value]) => {
      const numeric = Number(value) || 0;
      const row = document.createElement("div");
      row.className = "micro-chart-row";
      row.innerHTML = `
        <span class="micro-chart-label">${code}</span>
        <div class="micro-chart-track" title="${label}">
          <span class="micro-chart-fill" style="width:${Math.max(0, Math.min(1, numeric)) * 100}%"></span>
        </div>
        <span>${numeric.toFixed(2)}</span>
      `;
      elements.microScoreChart.appendChild(row);
    });
  }

  function microRiskClass(level) {
    if (level === "상" || level === "고위험") return "risk-high";
    if (level === "중" || level === "중위험") return "risk-mid";
    return "risk-low";
  }

  function microRiskDescription(cell) {
    const level = cell.grid_risk_level || cell.risk_level;
    const shareText = `${((Number(cell.grid_weight_share) || 0) * 100).toFixed(2)}%`;
    if (level === "상") {
      return `이 격자는 ${cell.dong || "해당 동"} 위험도 ${formatDongRisk(cell.dong_risk_score)}점 중 ${formatGridRisk(cell.grid_risk_score)}점을 배분받은 상위 격자입니다. 격자 W가 동 전체 W 합계의 ${shareText}를 차지합니다.`;
    }
    if (level === "중") {
      return `이 격자는 ${cell.dong || "해당 동"} 위험도 ${formatDongRisk(cell.dong_risk_score)}점 중 ${formatGridRisk(cell.grid_risk_score)}점을 배분받은 중간 수준 격자입니다. 격자 W가 동 전체 W 합계의 ${shareText}를 차지합니다.`;
    }
    return `이 격자는 ${cell.dong || "해당 동"} 위험도 ${formatDongRisk(cell.dong_risk_score)}점 중 ${formatGridRisk(cell.grid_risk_score)}점을 배분받은 낮은 수준 격자입니다. 격자 W가 동 전체 W 합계의 ${shareText}를 차지합니다.`;
  }

  function buildMicroReport(cell) {
    const topSignals = [
      ["상가밀도", cell.S],
      ["팝업 활동", cell.P],
      ["역세권 접근성", cell.R_sub],
      ["대로변 접근성", cell.R_road],
    ]
      .sort((a, b) => Number(b[1]) - Number(a[1]))
      .slice(0, 2)
      .map(([label, value]) => `${label} ${formatMicroValue(value)}`)
      .join(", ");

    return `이 격자는 ${cell.dong || "행정동 미매핑"} 내 100m 단위 영역이며, 격자 위험도는 ${formatDongRisk(cell.dong_risk_score)} × (${formatMicroValue(cell.W)} / ${formatMicroValue(cell.dong_weight_sum)}) = ${formatGridRisk(cell.grid_risk_score)}입니다. 여기서 W는 격자 가중치이고, 세부 점수 중 ${topSignals}가 상대적으로 크게 반영되었습니다. 주변 정보로는 ${cell.station_name || "인접 역 정보 없음"}까지 ${formatDistance(cell.station_distance_m)}, 대로변까지 ${formatDistance(cell.road_distance_m)}, 상가수 ${cell.store_count ?? 0}개가 확인됩니다.`;
  }

  function formatMicroValue(value) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric.toFixed(3) : "-";
  }

  function formatGridRisk(value) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric.toFixed(3) : "-";
  }

  function formatDongRisk(value) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric.toFixed(1) : "-";
  }

  function formatDistance(value) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? `${numeric.toFixed(1)}m` : "-";
  }

  function renderMetrics(record) {
    const metrics = [
      ["인구", record.metrics["인구"]],
      ["소비성향 비율", record.metrics["소비성향"]],
      ["회전율", record.metrics["회전율"]],
      ["영업기간 역지표", record.metrics["영업기간 역지표"]],
      ["프랜차이즈비율", record.metrics["프랜차이즈비율"]],
      ["유동인구", record.metrics["유동인구"]],
      ["팝업비율", record.metrics["팝업비율"]],
      ["팝업강도", record.metrics["팝업강도"]],
    ];

    elements.metricTable.innerHTML = "";
    metrics.forEach(([label, value]) => {
      const row = document.createElement("div");
      row.className = "metric-row";
      const safeValue = value == null ? null : Number(value);
      row.innerHTML = `
        <strong>${label}</strong>
        <div class="metric-bar"><span style="width:${safeValue == null ? 0 : safeValue * 100}%"></span></div>
        <span>${safeValue == null ? "-" : safeValue.toFixed(2)}</span>
      `;
      elements.metricTable.appendChild(row);
    });
  }

  function buildIntensityExplanation(record) {
    const drivers = getProminentIntensityDrivers(record);
    if (drivers.length === 0) {
      return "이 지역은 특정 변수 하나보다 여러 변수의 실제 규모가 함께 반영되는 특징을 보입니다.";
    }
    if (drivers.length === 1) {
      return `이 지역은 ${drivers[0].label} 규모가 다른 변수와 비교해 두드러지는 편입니다.`;
    }
    return `이 지역은 ${drivers[0].label}와 ${drivers[1].label} 규모가 다른 변수와 비교해 특히 두드러집니다.`;
  }

  function renderIntensitySummary(record) {
    const drivers = getProminentIntensityDrivers(record);
    if (drivers.length === 0) {
      elements.intensityDriversText.textContent = "복합 영향 중심";
      elements.intensityDriversDescription.textContent = buildIntensityExplanation(record);
      return;
    }

    elements.intensityDriversText.textContent = drivers
      .map((driver) => `${driver.label} (${driver.value.toFixed(2)})`)
      .join(", ");
    elements.intensityDriversDescription.textContent = buildIntensityExplanation(record);
  }

  function getProminentIntensityDrivers(record) {
    if (!record.intensity_metrics) return [];
    const sorted = Object.entries(record.intensity_metrics)
      .filter(([, value]) => value != null)
      .sort((a, b) => Number(b[1]) - Number(a[1]))
      .map(([label, value]) => ({ label, value: Number(value) }));

    if (sorted.length === 0) return [];

    const first = sorted[0];
    const second = sorted[1] || null;
    const third = sorted[2] || null;
    const prominent = [];

    if (first.value >= INTENSITY_PROMINENCE_MIN && (!second || first.value - second.value >= INTENSITY_GAP_MIN)) {
      prominent.push(first);
      return prominent;
    }

    if (
      first.value >= INTENSITY_PROMINENCE_MIN &&
      second &&
      second.value >= INTENSITY_PROMINENCE_MIN &&
      (!third || second.value - third.value >= INTENSITY_GAP_MIN)
    ) {
      prominent.push(first, second);
    }

    return prominent;
  }

  function renderRanking() {
    elements.rankingList.innerHTML = "";
    projected.slice(0, 10).forEach((record, index) => {
      const item = document.createElement("div");
      item.className = "ranking-item";
      item.innerHTML = `
        <div class="rank-badge">${index + 1}</div>
        <div>
          <strong>${record.dong}</strong>
          <div>${formatDrivers(record.top2_drivers)}</div>
        </div>
        <div>${record.risk_score.toFixed(1)}</div>
      `;
      item.addEventListener("click", () => updateSelection(record.dong));
      elements.rankingList.appendChild(item);
    });
  }

  function updateHeaderStats() {
    const top = projected[0];
    elements.topDong.textContent = top.dong;
    elements.topDongMeta.textContent = `${top.risk_score.toFixed(1)}점 · ${top.risk_level}`;
  }

  function seedAgentConversation() {
    const record = getAgentRecord();
    const topicLabel = getTopicLabel(state.agentTopic);
    const summary = buildScopedResponse(record, state.agentTopic, "현재 상태 요약");

    elements.agentMessages.innerHTML = "";
    state.agentHistory.guided = [];
    appendMessage(
      "assistant",
      `${record.dong} 지역의 ${topicLabel} 상담을 시작합니다. 추천 질문을 누르면 빠르게 요약 답변을 제공합니다.`,
      elements.agentMessages,
      { mode: "guided" }
    );
    appendMessage("assistant", summary, elements.agentMessages, { mode: "guided" });

    elements.freeAgentMessages.innerHTML = "";
    state.agentHistory.free = [];
    appendMessage(
      "assistant",
      `${record.dong} 지역의 ${topicLabel} 자유 상담을 시작합니다. 질문을 입력하면 선택 지역과 미시 격자 컨텍스트를 함께 반영해 답변합니다.`,
      elements.freeAgentMessages,
      { mode: "free" }
    );
    appendMessage("assistant", summary, elements.freeAgentMessages, { mode: "free" });
  }

  async function handleAgentSend() {
    if (state.agentMode !== "guided") return;
    const question = elements.agentInput.value.trim();
    if (!question) return;
    await askAgentQuestion(question, "guided");
    elements.agentInput.value = "";
  }

  async function handleFreeAgentSend() {
    if (state.agentMode !== "free") return;
    const question = elements.freeAgentInput.value.trim();
    if (!question) return;
    await askAgentQuestion(question, "free");
    elements.freeAgentInput.value = "";
  }

  async function handleRecommendedQuestion(question) {
    if (!question) return;
    if (state.agentMode !== "guided") {
      state.agentMode = "guided";
      elements.agentModeToggle
        .querySelectorAll("[data-agent-mode]")
        .forEach((item) => item.classList.toggle("active", item.dataset.agentMode === "guided"));
      renderAgentMode();
    }

    const nextDong = state.selectedDong;
    const inferredTopic = inferTopicFromQuestion(question) || state.agentTopic;
    const shouldReset = state.agentDong !== nextDong || state.agentTopic !== inferredTopic;

    state.agentDong = nextDong;
    elements.agentDongSelect.value = state.agentDong;
    state.agentTopic = inferredTopic;
    elements.agentTopicSelect.value = inferredTopic;
    syncQuestionPlaceholders();

    if (shouldReset) {
      seedAgentConversation();
    }

    await askAgentQuestion(question, "guided");
  }

  function getAgentRecord() {
    return projected.find((item) => item.dong === state.agentDong) || projected[0];
  }

  function getTopicLabel(topic) {
    return {
      risk_summary: "위험도 해석",
      comparison: "인접 지역 비교",
      policy_support: "정책 대응",
      small_business: "소상공인 지원",
    }[topic];
  }

  function inferTopicFromQuestion(question) {
    if (question.includes("차이")) return "comparison";
    if (question.includes("정책")) return "policy_support";
    if (question.includes("소상공인")) return "small_business";
    return "risk_summary";
  }

  function syncQuestionPlaceholders() {
    const placeholders = {
      risk_summary: {
        guided: "예: 이 동이 성수권보다 먼저 봐야 할 신호는 뭐야?",
        free: "예: 이 지역 위험도가 높게 나온 핵심 배경을 데이터 기준으로 설명해줘.",
      },
      comparison: {
        guided: "예: 성수권과 비교하면 이 동은 어떤 차이가 있어?",
        free: "예: 성수동과 비교했을 때 이 지역이 먼저 경계해야 할 변화는 뭐야?",
      },
      policy_support: {
        guided: "예: 이 지역에 필요한 정책 대응 우선순위는 뭐야?",
        free: "예: 이 동에 바로 적용할 수 있는 정책 대응안을 3가지로 정리해줘.",
      },
      small_business: {
        guided: "예: 소상공인 입장에서 가장 먼저 준비해야 할 건 뭐야?",
        free: "예: 이 지역에서 창업이나 점포 운영 시 먼저 봐야 할 위험 신호를 알려줘.",
      },
    };
    const selected = placeholders[state.agentTopic] || placeholders.risk_summary;
    elements.agentInput.placeholder = selected.guided;
    elements.freeAgentInput.placeholder = selected.free;
  }

  async function loadAgentStatus() {
    updateAgentStatus("확인 중", "서버와 LLM provider 상태를 확인하고 있습니다.", "pending");

    try {
      const response = await fetch("/api/guided-answer");
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.ok) {
        throw new Error(payload.detail || payload.error || "Agent status request failed");
      }

      const provider = providerLabel(payload.resolved_provider || payload.provider_mode);
      const model = payload.active_model || payload.gemini_model || payload.openai_model || "local-template";

      if (payload.ready) {
        updateAgentStatus(
          "AI 연결 준비됨",
          `${provider} · ${model} 기준으로 질문을 처리하며 최근 대화와 선택 지역 맥락도 함께 반영합니다.`,
          "online"
        );
        return;
      }

      updateAgentStatus(
        "제한형 응답 모드",
        "현재는 템플릿 기반 답변으로 동작합니다. .env.local에 provider와 API 키를 넣으면 실제 LLM 답변으로 전환됩니다.",
        "offline"
      );
    } catch (error) {
      updateAgentStatus(
        "상태 확인 실패",
        `서버 상태를 확인하지 못했습니다. 로컬 서버와 API 엔드포인트를 확인하세요. 오류: ${error.message}`,
        "offline"
      );
    }
  }

  function updateAgentStatus(title, detail, tone) {
    elements.agentStatusBadge.textContent = title;
    elements.agentStatusDetail.textContent = detail;
    elements.agentStatusCard.classList.toggle("is-online", tone === "online");
    elements.agentStatusCard.classList.toggle("is-offline", tone === "offline");
  }

  function providerLabel(provider) {
    return {
      openai: "OpenAI",
      gemini: "Gemini",
      kakao: "Kakao",
      generic: "Generic API",
      template: "Local Template",
      "scope-guard": "Scope Guard",
    }[provider] || "Auto";
  }

  function compactChatText(text) {
    return String(text || "").replace(/\s+/g, " ").trim();
  }

  function historyModeForTarget(target) {
    return target === elements.freeAgentMessages ? "free" : "guided";
  }

  function pushConversationMessage(mode, role, text) {
    const normalizedText = compactChatText(text);
    if (!normalizedText) return;
    const history = state.agentHistory[mode] || [];
    state.agentHistory[mode] = [...history, { role, text: normalizedText }].slice(-12);
  }

  function getConversationHistory(mode) {
    return state.agentHistory[mode] || [];
  }

  function buildHistoryPayload(mode) {
    return getConversationHistory(mode)
      .slice(-6)
      .map((item) => ({
        role: item.role,
        text: compactChatText(item.text).slice(0, 260),
      }));
  }

  function buildAgentPayloadRecord(record) {
    return {
      dong: record.dong,
      risk_score: record.risk_score,
      risk_level: record.risk_level,
      intensity_score: record.intensity_score,
      intensity_level: record.intensity_level,
      top2_drivers: record.top2_drivers,
      interpretation: record.interpretation,
      metrics: { ...(record.metrics || {}) },
      intensity_metrics: record.intensity_metrics ? { ...record.intensity_metrics } : null,
    };
  }

  function buildAgentPayloadMicroCell(cell) {
    if (!cell) return null;
    return {
      id: cell.id,
      row_index: cell.row_index,
      col_index: cell.col_index,
      grid_risk_score: cell.grid_risk_score,
      grid_risk_level: cell.grid_risk_level,
      dong_risk_score: cell.dong_risk_score,
      W: cell.W,
      dong_weight_sum: cell.dong_weight_sum,
      grid_weight_share: cell.grid_weight_share,
      S: cell.S,
      P: cell.P,
      R_sub: cell.R_sub,
      R_road: cell.R_road,
      station_name: cell.station_name,
      station_distance_m: cell.station_distance_m,
      road_distance_m: cell.road_distance_m,
      store_count: cell.store_count,
    };
  }

  function appendMessage(role, text, target = getActiveMessageContainer(), options = {}) {
    const bubble = document.createElement("div");
    bubble.className = `chat-bubble ${role}`;
    const label = document.createElement("small");
    label.textContent = role === "user" ? "사용자" : "상담 에이전트";

    const body = document.createElement("div");
    body.className = "chat-bubble-body";
    body.textContent = text;

    bubble.appendChild(label);
    bubble.appendChild(body);
    target.appendChild(bubble);
    target.scrollTop = target.scrollHeight;

    if (options.trackHistory !== false) {
      pushConversationMessage(options.mode || historyModeForTarget(target), role, text);
    }
  }

  function getActiveMessageContainer() {
    return state.agentMode === "free" ? elements.freeAgentMessages : elements.agentMessages;
  }

  async function askAgentQuestion(question, responseMode) {
    if (guidedRequestInFlight) return;
    guidedRequestInFlight = true;
    const record = getAgentRecord();
    const target = responseMode === "free" ? elements.freeAgentMessages : elements.agentMessages;
    const history = buildHistoryPayload(responseMode);
    appendMessage("user", question, target, { mode: responseMode });
    setAgentLoading(true, responseMode);

    try {
      const answer = await requestGuidedAnswer(record, question, responseMode, history);
      appendMessage("assistant", answer, target, { mode: responseMode });
    } catch (error) {
      appendMessage(
        "assistant",
        `${buildScopedResponse(record, state.agentTopic, question)}\n\n현재는 LLM 연결이 되지 않아 제한형 응답으로 대체했습니다.\n오류: ${error.message}`,
        target,
        { mode: responseMode }
      );
    } finally {
      setAgentLoading(false, responseMode);
      guidedRequestInFlight = false;
    }
  }

  function setAgentLoading(isLoading, responseMode) {
    elements.agentSendButton.disabled = isLoading;
    elements.agentSendButton.textContent = isLoading ? "응답 생성 중..." : "질문하기";
    elements.agentInput.disabled = isLoading;
    elements.freeAgentSendButton.disabled = isLoading;
    elements.freeAgentSendButton.textContent = isLoading && responseMode === "free" ? "응답 생성 중..." : "질문하기";
    elements.freeAgentInput.disabled = isLoading;
    elements.recommendGrid.querySelectorAll(".recommend-chip").forEach((button) => {
      button.disabled = isLoading;
    });
  }

  async function requestGuidedAnswer(record, question, responseMode, history) {
    const response = await fetch("/api/guided-answer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question,
        topic: state.agentTopic,
        response_mode: responseMode,
        topic_label: getTopicLabel(state.agentTopic),
        history,
        record: buildAgentPayloadRecord(record),
        micro_cell: state.mode === "micro" ? buildAgentPayloadMicroCell(state.selectedMicroCell) : null,
        benchmark: buildBenchmarkContext(record),
        ranking: projected.slice(0, 5).map((item) => ({
          dong: item.dong,
          risk_score: item.risk_score,
          risk_level: item.risk_level,
          top2_drivers: formatDrivers(item.top2_drivers),
        })),
      }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.ok || !payload.answer) {
      throw new Error(payload.detail || payload.error || "Guided answer request failed");
    }
    return payload.answer;
  }

  function buildBenchmarkContext(record) {
    const seongsu = projected.filter((item) => item.dong.startsWith("성수"));
    const average =
      seongsu.length > 0 ? seongsu.reduce((sum, item) => sum + item.risk_score, 0) / seongsu.length : null;
    const top = projected[0] || null;
    const selectedRank = projected.findIndex((item) => item.dong === record.dong);
    const nearestSeongsu =
      seongsu.length > 0
        ? seongsu
            .slice()
            .sort((a, b) => Math.abs(a.risk_score - record.risk_score) - Math.abs(b.risk_score - record.risk_score))[0]
        : null;
    return {
      seongsu_average: average,
      seongsu_dongs: seongsu.map((item) => item.dong),
      selected_rank: selectedRank >= 0 ? selectedRank + 1 : null,
      top_dong: top ? top.dong : null,
      top_risk_score: top ? top.risk_score : null,
      gap_from_top: top ? top.risk_score - record.risk_score : null,
      nearest_seongsu_dong: nearestSeongsu ? nearestSeongsu.dong : null,
      nearest_seongsu_score: nearestSeongsu ? nearestSeongsu.risk_score : null,
    };
  }

  function renderAgentMode() {
    const guided = state.agentMode === "guided";
    elements.guidedAgentPanel.classList.toggle("hidden", !guided);
    elements.freeAgentPanel.classList.toggle("hidden", guided);
  }

  function initMicroMap() {
    if (microMapReady) return;
    microMapReady = true;

    if (!window.L || !microMapData || !Array.isArray(microMapData.gridCells)) {
      elements.microLeafletMap.innerHTML =
        "<p style='padding:20px;color:#395147'>외부 지도를 불러오지 못했습니다. 인터넷 연결 또는 격자 데이터 파일을 확인해주세요.</p>";
      return;
    }

    microMap = L.map(elements.microLeafletMap, {
      preferCanvas: true,
      zoomControl: true,
      scrollWheelZoom: false,
    });

    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(microMap);

    const nearbyStyle = {
      color: "#7f7a6f",
      weight: 1.2,
      fillColor: "#f4efe6",
      fillOpacity: 0.18,
    };
    const seongdongStyle = {
      color: "#163129",
      weight: 2.2,
      fillOpacity: 0,
    };
    const rectStyle = {
      weight: 0.35,
      color: "rgba(255,255,255,0.34)",
      fillOpacity: 0.58,
    };

    microMapData.nearbyBoundaries.forEach((district) => {
      district.rings.forEach((ring) => {
        L.polygon(ring, nearbyStyle).addTo(microMap);
      });
    });

    if (microMapData.seongdongBoundary) {
      microMapData.seongdongBoundary.rings.forEach((ring) => {
        L.polygon(ring, seongdongStyle).addTo(microMap);
      });
    }

    microMapData.gridCells.forEach((cell) => {
      const layer = L.rectangle(cell.bounds, {
        ...rectStyle,
        fillColor: colorForMicroRisk(cell.grid_risk_level || cell.risk_level),
      }).addTo(microMap);
      layer.bindTooltip(
        `<div class="micro-grid-tooltip"><strong>${cell.dong || "행정동 매핑 없음"} · 격자위험도 ${cell.grid_risk_level || cell.risk_level}</strong>격자위험도 ${formatGridRisk(cell.grid_risk_score)}<br>계산식 ${formatDongRisk(cell.dong_risk_score)} × (${formatMicroValue(cell.W)} / ${formatMicroValue(cell.dong_weight_sum)})<br>S ${cell.S.toFixed(3)} · P ${cell.P.toFixed(3)}<br>R_sub ${cell.R_sub.toFixed(3)} · R_road ${cell.R_road.toFixed(3)}</div>`,
        { sticky: true }
      );
      layer.on("click", () => {
        if (activeMicroCell) {
          activeMicroCell.setStyle({
            weight: rectStyle.weight,
            color: rectStyle.color,
          });
        }
        layer.setStyle({
          weight: 1.5,
          color: "#163129",
        });
        activeMicroCell = layer;
        state.selectedMicroCell = cell;
        renderMicroSelection(cell);
        if (cell.dong) {
          updateSelection(cell.dong);
        }
      });
    });

    microMap.fitBounds(microMapData.bounds, { padding: [18, 18] });
  }

  function colorForMicroRisk(level) {
    if (level === "상" || level === "고위험") return "#bb3f2a";
    if (level === "중" || level === "중위험") return "#d88c1f";
    return "#2f7a54";
  }

  function buildScopedResponse(record, topic, question) {
    const drivers = formatDrivers(record.top2_drivers);
    const summary = `${record.dong}은 위험도 점수 ${record.risk_score.toFixed(1)}점, 위험등급 ${record.risk_level}, 보조 강도 점수 ${record.intensity_score.toFixed(1)}점입니다. 이 점수는 절대적 위험이 아니라 성동구 내부 상대 비교 기반 전조 탐지 점수입니다.`;
    const modelLine = "이 모델은 성수동만 높게 만드는 방식이 아니라, 성수동에서 주변 지역으로 확산되는 전조를 함께 탐지하도록 설계됐습니다.";

    if (question.includes("현재 상태 요약")) {
      return `${summary} 주요 기여 변수는 ${drivers}이고, 해석은 ${formatInterpretation(record.interpretation)}`;
    }

    if (question.includes("위험으로 나온 이유")) {
      return `이 지역이 높게 나온 가장 직접적인 이유는 ${drivers}의 영향이 크게 반영됐기 때문입니다. ${formatInterpretation(record.interpretation)} ${modelLine}`;
    }

    if (question.includes("성수동과 인접 지역의 차이")) {
      const seongsu = projected.filter((item) => item.dong.startsWith("성수"));
      const avg = seongsu.reduce((sum, item) => sum + item.risk_score, 0) / seongsu.length;
      return `성수권 평균 위험도는 ${avg.toFixed(1)}점입니다. ${record.dong}은 성수권과 비교했을 때 ${record.risk_score >= avg ? "비슷하거나 더 높은 전조 신호" : "다소 낮은 전조 신호"}를 보이며, 차이는 주로 ${drivers}에서 나타납니다. ${modelLine}`;
    }

    if (question.includes("가장 큰 위험 요인")) {
      return `이 동에서 가장 크게 반영된 위험 요인은 ${drivers}입니다. 특히 소비성향 비율, 유동인구, 회전율, 프랜차이즈비율 같은 항목 중 어떤 값이 상대적으로 높은지가 점수에 직접 영향을 줍니다.`;
    }

    if (question.includes("정책적으로 어떤 대응")) {
      return `정책 대응은 임대료 안정 장치 검토, 소상공인 보호 장치 강화, 공실률 모니터링, 문화상권 관리, 팝업스토어 관리 체계 정비 순으로 보는 접근이 적절합니다. ${record.dong}은 ${drivers} 영향이 커서 해당 지표와 연결된 정책 우선순위를 먼저 점검하는 편이 좋습니다.`;
    }

    if (question.includes("소상공인 관점")) {
      return `소상공인 관점에서는 임대차 안정 정보 제공, 상권 변화 상담, 업종 전환 컨설팅, 매출 방어형 지원, 인접 고위험 지역 확산 모니터링이 우선입니다. ${record.dong}은 ${drivers}가 핵심이므로 그 흐름에 맞춘 지원 설계가 필요합니다.`;
    }

    if (question.includes("높지만 성수동이 아닌 이유")) {
      return `이 모델은 특정 지명을 우대하지 않고, 각 행정동의 상대적 전조 신호를 비교합니다. 따라서 성수동이 아니더라도 ${drivers}가 높게 나타나면 위험도 점수가 높게 산출될 수 있습니다. ${modelLine}`;
    }

    if (topic === "comparison") {
      const seongsu = projected.filter((item) => item.dong.startsWith("성수"));
      const nearest = seongsu.slice().sort((a, b) => Math.abs(a.risk_score - record.risk_score) - Math.abs(b.risk_score - record.risk_score))[0];
      return `비교 기준으로 보면 성수권에서 가장 비슷한 점수대는 ${nearest.dong}(${nearest.risk_score.toFixed(1)}점)입니다. ${record.dong}의 차이는 ${drivers}에서 설명되는 편입니다. ${modelLine}`;
    }

    if (topic === "policy_support") {
      return `정책 대응은 임대료 안정, 소상공인 보호, 공실률 모니터링, 문화상권 관리, 팝업스토어 관리 관점에서 묶어 보는 편이 적절합니다. 이 지역은 ${drivers}의 신호가 커서 해당 축과 연계된 대응이 우선입니다.`;
    }

    if (topic === "small_business") {
      return `소상공인 지원 관점에서는 상권 변화 알림, 임대차 상담, 경영 안정 컨설팅, 소비성향 비율 변화 추적, 인접 고위험 지역 영향 점검이 필요합니다.`;
    }

    return `주요 기여 변수는 ${drivers}이고, 해석은 ${formatInterpretation(record.interpretation)} 질문 "${question}"도 선택된 지역과 분야 범위 안에서 보면 ${modelLine}`;
  }

  function formatDrivers(text) {
    return String(text)
      .split(",")
      .map((item) => item.trim())
      .map((item) => driverNameMap[item] || item)
      .join(", ");
  }

  function formatInterpretation(text) {
    return String(text)
      .replaceAll("유동인구(F)", "유동인구")
      .replaceAll("프랜차이즈(E)", "프랜차이즈비율")
      .replaceAll("인구(A)", "인구")
      .replaceAll("소비성향(B)", "소비성향 비율")
      .replaceAll("회전율(C)", "회전율")
      .replaceAll("영업기간 역지표(D)", "영업기간 역지표")
      .replaceAll("팝업비율(G1)", "팝업비율")
      .replaceAll("팝업강도(G2)", "팝업강도");
  }

  function getBounds(records) {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    records.forEach((record) => {
      walkCoords(record.geometry.coordinates, (x, y) => {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      });
    });
    return { minX, minY, maxX, maxY };
  }

  function projectRecords(records, bounds) {
    const width = 1000;
    const height = 860;
    const pad = 54;
    const scaleX = (width - pad * 2) / (bounds.maxX - bounds.minX);
    const scaleY = (height - pad * 2) / (bounds.maxY - bounds.minY);
    const scale = Math.min(scaleX, scaleY);

    return records.map((record) => {
      const paths = geometryToPaths(record.geometry, bounds, scale, width, height, pad);
      const centroid = projectPoint(record.centroid[0], record.centroid[1], bounds, scale, width, height, pad);
      return { ...record, paths, screenCentroid: centroid };
    });
  }

  function geometryToPaths(geometry, bounds, scale, width, height, pad) {
    if (geometry.type === "Polygon") return [ringToPath(geometry.coordinates[0], bounds, scale, width, height, pad)];
    if (geometry.type === "MultiPolygon") return geometry.coordinates.map((polygon) => ringToPath(polygon[0], bounds, scale, width, height, pad));
    return [];
  }

  function ringToPath(ring, bounds, scale, width, height, pad) {
    return ring
      .map((point, index) => {
        const [x, y] = projectPoint(point[0], point[1], bounds, scale, width, height, pad);
        return `${index === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
      })
      .join(" ") + " Z";
  }

  function projectPoint(x, y, bounds, scale, width, height, pad) {
    const px = pad + (x - bounds.minX) * scale;
    const py = height - pad - (y - bounds.minY) * scale;
    return [px, py];
  }

  function walkCoords(coords, fn) {
    if (typeof coords[0] === "number") {
      fn(coords[0], coords[1]);
      return;
    }
    coords.forEach((item) => walkCoords(item, fn));
  }

  function colorForLevel(level) {
    if (level === "상") return "#bb3f2a";
    if (level === "중") return "#d88c1f";
    return "#2f7a54";
  }
})();
