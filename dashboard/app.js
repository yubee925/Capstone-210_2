(function () {
  const data = window.SEONGDONG_DASHBOARD_DATA;
  if (!data || !Array.isArray(data.records)) {
    document.body.innerHTML = "<p style='padding:24px'>대시보드 데이터를 불러오지 못했습니다.</p>";
    return;
  }

  const state = {
    mode: "macro",
    selectedDong: data.records[0].dong,
    agentDong: data.records[0].dong,
    agentTopic: "risk_summary",
  };

  const driverNameMap = {
    "인구(A)": "인구",
    "소비성향(B)": "소비성향",
    "회전율(C)": "회전율",
    "영업기간 역지표(D)": "영업기간 역지표",
    "프랜차이즈(E)": "프랜차이즈비율",
    "유동인구(F)": "유동인구",
    "팝업비율(G1)": "팝업비율",
    "팝업강도(G2)": "팝업강도",
  };

  const elements = {
    mapSvg: document.getElementById("mapSvg"),
    microOverlay: document.getElementById("microOverlay"),
    mapTitle: document.getElementById("mapTitle"),
    dongSelect: document.getElementById("dongSelect"),
    detailDong: document.getElementById("detailDong"),
    riskScore: document.getElementById("riskScore"),
    riskLevel: document.getElementById("riskLevel"),
    intensityScore: document.getElementById("intensityScore"),
    intensityLevel: document.getElementById("intensityLevel"),
    gaugeFill: document.getElementById("gaugeFill"),
    gaugePercent: document.getElementById("gaugePercent"),
    driversText: document.getElementById("driversText"),
    metricTable: document.getElementById("metricTable"),
    rankingList: document.getElementById("rankingList"),
    agentDongSelect: document.getElementById("agentDongSelect"),
    agentTopicSelect: document.getElementById("agentTopicSelect"),
    agentInput: document.getElementById("agentInput"),
    agentSendButton: document.getElementById("agentSendButton"),
    agentMessages: document.getElementById("agentMessages"),
    topDong: document.getElementById("topDong"),
    topDongMeta: document.getElementById("topDongMeta"),
    selectedSummaryTitle: document.getElementById("selectedSummaryTitle"),
    selectedSummaryMeta: document.getElementById("selectedSummaryMeta"),
    detailInterpretation: document.getElementById("detailInterpretation"),
  };

  const bounds = getBounds(data.records);
  const projected = projectRecords(data.records, bounds);

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
    elements.dongSelect.addEventListener("change", (event) => {
      updateSelection(event.target.value);
    });
    elements.agentDongSelect.addEventListener("change", (event) => {
      state.agentDong = event.target.value;
      seedAgentConversation();
    });
    elements.agentTopicSelect.addEventListener("change", (event) => {
      state.agentTopic = event.target.value;
      seedAgentConversation();
    });

    document.querySelectorAll(".mode-button").forEach((button) => {
      button.addEventListener("click", () => {
        document.querySelectorAll(".mode-button").forEach((item) => item.classList.remove("active"));
        button.classList.add("active");
        state.mode = button.dataset.mode;
        renderMode();
      });
    });

    elements.agentSendButton.addEventListener("click", handleAgentSend);
    elements.agentInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        handleAgentSend();
      }
    });

    seedAgentConversation();
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
      ring.dataset.markerRing = record.dong;
      elements.mapSvg.appendChild(ring);

      const marker = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      marker.setAttribute("cx", record.screenCentroid[0]);
      marker.setAttribute("cy", record.screenCentroid[1]);
      marker.setAttribute("r", state.mode === "micro" ? "6" : "0");
      marker.setAttribute("class", "marker");
      marker.dataset.marker = record.dong;
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
      ? "미시 모드: 선택 구역의 세부 지표와 대응 가이드"
      : "거시 모드: 성동구 전체 위험 분포";

    elements.mapSvg.querySelectorAll("[data-marker]").forEach((node) => {
      node.setAttribute("r", micro ? "6" : "0");
    });
    elements.mapSvg.querySelectorAll("[data-marker-ring]").forEach((node) => {
      node.setAttribute("r", micro ? "16" : "0");
    });

    if (micro) {
      elements.microOverlay.classList.remove("hidden");
      updateMicroOverlay();
    } else {
      elements.microOverlay.classList.add("hidden");
      elements.microOverlay.innerHTML = "";
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
    elements.gaugeFill.style.width = `${record.risk_score}%`;
    elements.gaugePercent.textContent = `${record.risk_percentile ? (record.risk_percentile * 100).toFixed(1) : "0.0"} pct`;
    elements.driversText.textContent = formatDrivers(record.top2_drivers);
    elements.detailInterpretation.textContent = formatInterpretation(record.interpretation);
    elements.selectedSummaryTitle.textContent = `${record.dong} · ${record.risk_level}`;
    elements.selectedSummaryMeta.textContent = `${formatDrivers(record.top2_drivers)} 영향이 크게 반영됨`;
    if (state.agentDong === dong) seedAgentConversation();
    renderMetrics(record);
    if (state.mode === "micro") updateMicroOverlay();
  }

  function renderMetrics(record) {
    const metrics = [
      ["인구", record.metrics["인구"]],
      ["소비성향", record.metrics["소비성향"]],
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

  function updateMicroOverlay() {
    const record = projected.find((item) => item.dong === state.selectedDong);
    const drivers = formatDrivers(record.top2_drivers);
    elements.microOverlay.innerHTML = `
      <div class="micro-card">
        <div class="section-label">Micro Focus</div>
        <strong>${record.dong}</strong>
        <p>위험도 ${record.risk_score.toFixed(1)}점 · 보조강도 ${record.intensity_score.toFixed(1)}점</p>
        <p>핵심 요인: ${drivers}</p>
        <p>${formatInterpretation(record.interpretation)}</p>
      </div>
    `;
  }

  function seedAgentConversation() {
    const record = getAgentRecord();
    const topicLabel = getTopicLabel(state.agentTopic);
    const opening = buildScopedResponse(record, state.agentTopic, "현재 상태 요약");
    elements.agentMessages.innerHTML = "";
    appendMessage(
      "assistant",
      `${record.dong} 지역의 ${topicLabel} 상담을 시작합니다. 이 대화는 선택된 지역의 점수와 지표를 중심으로만 안내합니다.`
    );
    appendMessage("assistant", opening);
  }

  function handleAgentSend() {
    const question = elements.agentInput.value.trim();
    if (!question) return;
    const record = getAgentRecord();
    appendMessage("user", question);
    appendMessage("assistant", buildScopedResponse(record, state.agentTopic, question));
    elements.agentInput.value = "";
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
      .replaceAll("소비성향(B)", "소비성향")
      .replaceAll("회전율(C)", "회전율")
      .replaceAll("영업기간 역지표(D)", "영업기간 역지표")
      .replaceAll("팝업비율(G1)", "팝업비율")
      .replaceAll("팝업강도(G2)", "팝업강도");
  }

  function getAgentRecord() {
    return projected.find((item) => item.dong === state.agentDong) || projected[0];
  }

  function getTopicLabel(topic) {
    const labels = {
      risk_summary: "위험도 해석",
      store_strategy: "점포 운영 전략",
      policy_support: "정책·지원 안내",
      monitoring: "추적 지표 제안",
    };
    return labels[topic] || "상담";
  }

  function appendMessage(role, text) {
    const bubble = document.createElement("div");
    bubble.className = `chat-bubble ${role}`;
    bubble.innerHTML = `<small>${role === "user" ? "사용자" : "상담 에이전트"}</small><div>${text}</div>`;
    elements.agentMessages.appendChild(bubble);
    elements.agentMessages.scrollTop = elements.agentMessages.scrollHeight;
  }

  function buildScopedResponse(record, topic, question) {
    const drivers = formatDrivers(record.top2_drivers);
    const intro = `${record.dong}은 위험도 ${record.risk_score.toFixed(1)}점, 위험등급 ${record.risk_level}, 보조 강도 ${record.intensity_score.toFixed(1)}점입니다.`;

    if (topic === "risk_summary") {
      return `${intro} 핵심 영향 요인은 ${drivers}입니다. 현재 질문에 대해서는 이 지역의 상대 위험 신호와 지표 흐름 중심으로 해석하는 것이 적절합니다. ${formatInterpretation(record.interpretation)}`;
    }

    if (topic === "store_strategy") {
      const strategy =
        record.risk_level === "상"
          ? "단기 매출보다 임대료 변동, 유사 업종 증가, 고객층 변화에 먼저 대응하는 전략이 필요합니다."
          : record.risk_level === "중"
            ? "고정 고객 유지와 업종 차별화, 인접 고위험 지역의 확산 흐름 점검을 병행하는 편이 좋습니다."
            : "급격한 대응보다 분기별 추세 모니터링과 상권 변화 기록을 쌓는 접근이 더 적절합니다.";
      return `${intro} 점포 운영 관점에서는 ${drivers}가 먼저 보입니다. ${strategy} 질문한 내용 "${question}"도 같은 범위에서 보면 지역 특성에 맞춘 보수적 대응이 유효합니다.`;
    }

    if (topic === "policy_support") {
      const support =
        record.intensity_level === "상"
          ? "임대차 상담, 소상공인 컨설팅, 경영 안정 자금 같은 지원 연결 우선순위를 높게 보는 편이 자연스럽습니다."
          : "정책 지원은 즉시 실행형보다 정보 수집형, 상담형 프로그램부터 연결하는 흐름이 무난합니다.";
      return `${intro} 정책·지원 관점에서 가장 먼저 볼 포인트는 ${drivers}입니다. ${support} 지금 단계에서는 선택된 지역 데이터 기준 안내만 제공하고, 세부 제도명은 추후 검증 데이터와 연결하는 구성이 안전합니다.`;
    }

    const monitor =
      record.risk_level === "상"
        ? "회전율, 유동인구, 프랜차이즈비율, 팝업 흐름을 월 또는 분기 단위로 강하게 추적하는 편이 좋습니다."
        : "현재 등급에서는 핵심 기여 변수와 인접 동의 변화 방향을 함께 추적하면 충분합니다.";
    return `${intro} 추적 지표 제안 기준으로는 ${drivers}가 우선입니다. ${monitor} 사용자가 원하는 정보가 더 구체적이면 같은 지역과 분야 범위 안에서 질문을 이어갈 수 있습니다.`;
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
    if (geometry.type === "Polygon") {
      return [ringToPath(geometry.coordinates[0], bounds, scale, width, height, pad)];
    }
    if (geometry.type === "MultiPolygon") {
      return geometry.coordinates.map((polygon) => ringToPath(polygon[0], bounds, scale, width, height, pad));
    }
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
