// App — Main Entry Point
// Initializes the app, wires modules, handles view switching and rendering.

const App = (() => {
  let currentPage = 0;
  const PAGE_SIZE = 15;
  let sortField = 'submittedAt';
  let sortDir = 'desc';
  let resizeTimer = null;

  // --- INITIALIZATION ---
  async function init() {
    await State.loadAll();

    State.on('data-loaded', () => {
      populateFilterDemographics();
      renderCurrentView();
    });

    State.on('survey-changed', () => {
      updateSurveyHeader();
      renderCurrentView();
    });

    State.on('filters-changed', () => {
      currentPage = 0;
      renderCurrentView();
    });

    // NOTE: view-changed no longer triggers render — see bindNavigation()
    // Rendering is done after the DOM view is switched visible.

    bindNavigation();
    bindBottomBar();
    bindExport();
    bindFilters();

    updateSurveyHeader();
    renderCurrentView();

    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => renderCurrentView(), 200);
    });
  }

  // --- NAVIGATION ---
  function bindNavigation() {
    document.querySelectorAll('.top-nav__tab').forEach(tab => {
      tab.addEventListener('click', () => {
        const view = tab.dataset.view;
        document.querySelectorAll('.top-nav__tab').forEach(t => t.classList.remove('top-nav__tab--active'));
        tab.classList.add('top-nav__tab--active');

        // Close any open panels when switching views
        closeAllPanels();

        // IMPORTANT: Switch view FIRST (makes section visible), THEN set state & render.
        // This ensures canvases have real dimensions when getBoundingClientRect() is called.
        switchView(view);
        State.setActiveView(view);

        // Render after the DOM has painted so canvas dimensions are correct
        requestAnimationFrame(() => {
          renderCurrentView();
        });
      });
    });
  }

  function switchView(viewName) {
    document.querySelectorAll('.view-section').forEach(s => s.classList.remove('view-section--active'));
    const target = document.getElementById(`view-${viewName}`);
    if (target) target.classList.add('view-section--active');
  }

  // --- PANEL MANAGEMENT ---
  // Centralized panel close to prevent state leaks
  function closeAllPanels() {
    const exportDropdown = document.getElementById('exportDropdown');
    const filterPanel = document.getElementById('filterPanel');
    const btnFilter = document.getElementById('btnFilter');

    exportDropdown.classList.remove('export-dropdown--open');
    filterPanel.classList.remove('filter-panel--open');
    btnFilter.classList.remove('bottom-bar__btn--active');
  }

  // --- BOTTOM BAR ---
  function bindBottomBar() {
    const btnExport = document.getElementById('btnExport');
    const exportDropdown = document.getElementById('exportDropdown');
    const btnFilter = document.getElementById('btnFilter');
    const filterPanel = document.getElementById('filterPanel');

    // Export button
    btnExport.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = exportDropdown.classList.contains('export-dropdown--open');
      closeAllPanels();
      if (!isOpen) {
        exportDropdown.classList.add('export-dropdown--open');
      }
    });

    // Filter button
    btnFilter.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = filterPanel.classList.contains('filter-panel--open');
      closeAllPanels();
      if (!isOpen) {
        filterPanel.classList.add('filter-panel--open');
        btnFilter.classList.add('bottom-bar__btn--active');
      }
    });

    // Survey button is now a plain <a> link — no JS needed

    // Close panels when clicking outside
    document.addEventListener('click', (e) => {
      const clickedExportBtn = e.target.closest('#btnExport');
      const clickedFilterBtn = e.target.closest('#btnFilter');

      if (!exportDropdown.contains(e.target) && !clickedExportBtn) {
        exportDropdown.classList.remove('export-dropdown--open');
      }
      if (!filterPanel.contains(e.target) && !clickedFilterBtn) {
        filterPanel.classList.remove('filter-panel--open');
        btnFilter.classList.remove('bottom-bar__btn--active');
      }
    });

    // Stop propagation on panels so clicking inside them doesn't close them
    exportDropdown.addEventListener('click', (e) => e.stopPropagation());
    filterPanel.addEventListener('click', (e) => e.stopPropagation());
  }

  // --- EXPORT ---
  function bindExport() {
    document.getElementById('exportCSV').addEventListener('click', () => {
      const survey = State.getActiveSurvey();
      const responses = State.getFilteredResponses();
      ExportModule.exportCSV(responses, survey, `${survey.id}-export.csv`);
      closeAllPanels();
    });

    document.getElementById('exportJSON').addEventListener('click', () => {
      const survey = State.getActiveSurvey();
      const responses = State.getFilteredResponses();
      ExportModule.exportJSON(responses, survey, `${survey.id}-export.json`);
      closeAllPanels();
    });

    document.getElementById('exportPDF').addEventListener('click', () => {
      closeAllPanels();
      // Small delay so panel closes before print dialog
      setTimeout(() => ExportModule.exportPDF(), 100);
    });

    // Chart download buttons (delegated)
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('.chart-download-btn');
      if (btn) {
        const chartId = btn.dataset.chart;
        const canvas = document.getElementById(chartId);
        if (canvas) ExportModule.exportChartPNG(canvas, `${chartId}.png`);
      }
    });
  }

  // --- FILTERS ---
  function bindFilters() {
    const demoKey = document.getElementById('filterDemoKey');
    const demoValue = document.getElementById('filterDemoValue');
    const demoValueGroup = document.getElementById('filterDemoValueGroup');

    demoKey.addEventListener('change', () => {
      const key = demoKey.value;
      if (key) {
        const segments = State.getDemographics();
        const seg = segments[key];
        demoValue.innerHTML = '<option value="">All Values</option>';
        if (seg) {
          seg.values.forEach(v => {
            demoValue.innerHTML += `<option value="${v}">${v}</option>`;
          });
        }
        demoValueGroup.style.display = 'block';
      } else {
        demoValueGroup.style.display = 'none';
        demoValue.innerHTML = '<option value="">All Values</option>';
      }
    });

    document.getElementById('applyFilters').addEventListener('click', () => {
      State.setFilter('dateRange', {
        start: document.getElementById('filterDateStart').value || null,
        end: document.getElementById('filterDateEnd').value || null
      });
      State.setFilter('demographic', {
        key: demoKey.value || null,
        value: demoValue.value || null
      });
      closeAllPanels();
    });

    document.getElementById('clearFilters').addEventListener('click', () => {
      document.getElementById('filterDateStart').value = '';
      document.getElementById('filterDateEnd').value = '';
      demoKey.value = '';
      demoValue.value = '';
      demoValueGroup.style.display = 'none';
      State.clearFilters();
      closeAllPanels();
    });

    // Search (responses view)
    const searchInput = document.getElementById('searchInput');
    let searchTimer;
    searchInput.addEventListener('input', () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        State.setFilter('search', searchInput.value);
      }, 300);
    });
  }

  // --- POPULATE UI ---
  function populateSurveySelector() {
    const container = document.getElementById('surveySelector');
    const surveys = State.getSurveys();
    container.innerHTML = '';

    surveys.forEach(s => {
      const btn = document.createElement('button');
      btn.className = 'survey-selector__item';
      if (s.id === State.getActiveSurveyId()) btn.classList.add('survey-selector__item--active');
      btn.textContent = s.title;
      btn.addEventListener('click', () => {
        State.setActiveSurvey(s.id);
        container.querySelectorAll('.survey-selector__item').forEach(b => b.classList.remove('survey-selector__item--active'));
        btn.classList.add('survey-selector__item--active');
        closeAllPanels();
      });
      container.appendChild(btn);
    });
  }

  function populateFilterDemographics() {
    const demoKey = document.getElementById('filterDemoKey');
    const segments = State.getDemographics();
    Object.entries(segments).forEach(([key, seg]) => {
      demoKey.innerHTML += `<option value="${key}">${seg.label}</option>`;
    });
  }

  function updateSurveyHeader() {
    const survey = State.getActiveSurvey();
    if (!survey) return;

    document.getElementById('surveyTitle').textContent = survey.title;
    const responses = State.getFilteredResponses();
    document.getElementById('responseCount').textContent = `${responses.length} responses`;

    // Date range from data
    if (responses.length > 0) {
      const dates = responses.map(r => new Date(r.submittedAt)).sort((a, b) => a - b);
      const fmt = d => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      document.getElementById('surveyDateRange').textContent = `${fmt(dates[0])} — ${fmt(dates[dates.length - 1])}`;
    }
  }

  // --- RENDER VIEWS ---
  function renderCurrentView() {
    const view = State.getActiveView();
    updateSurveyHeader();

    switch (view) {
      case 'overview': renderOverview(); break;
      case 'responses': renderResponses(); break;
      case 'questions': renderQuestions(); break;
      case 'demographics': renderDemographics(); break;
    }
  }

  function renderOverview() {
    const responses = State.getFilteredResponses();
    const survey = State.getActiveSurvey();
    if (!survey) return;

    const chartsEl = document.getElementById('overviewCharts');
    const metricsEl = document.getElementById('metricsRow');
    const emptyEl = document.getElementById('overviewEmpty');

    // Empty state — no responses match filters
    if (responses.length === 0) {
      chartsEl.style.display = 'none';
      metricsEl.style.display = 'none';
      emptyEl.style.display = 'block';

      // Wire clear filters button inside empty state
      const clearBtn = document.getElementById('emptyStateClearFilters');
      clearBtn.onclick = () => {
        document.getElementById('filterDateStart').value = '';
        document.getElementById('filterDateEnd').value = '';
        document.getElementById('filterDemoKey').value = '';
        document.getElementById('filterDemoValue').value = '';
        document.getElementById('filterDemoValueGroup').style.display = 'none';
        State.clearFilters();
      };
      return;
    }

    // Has data — show charts, hide empty state
    chartsEl.style.display = '';
    metricsEl.style.display = '';
    emptyEl.style.display = 'none';

    // Metrics
    document.getElementById('metricTotal').textContent = Analytics.countResponses(responses);
    document.getElementById('metricCompletion').textContent = Analytics.completionRate(responses) + '%';
    document.getElementById('metricAvgTime').textContent = Analytics.avgCompletionTime(responses) + ' min';

    // NPS — find the NPS question
    const npsQ = survey.questions.find(q => q.type === 'nps');
    if (npsQ) {
      const nps = Analytics.calculateNPS(responses, npsQ.id);
      document.getElementById('metricNPS').textContent = (nps >= 0 ? '+' : '') + nps;
    } else {
      document.getElementById('metricNPS').textContent = 'N/A';
    }

    // Charts need the section to be visible so canvas has real dimensions.
    // Use requestAnimationFrame to ensure paint has happened.
    const trendCanvas = document.getElementById('trendChart');
    const donutCanvas = document.getElementById('satisfactionDonut');

    requestAnimationFrame(() => {
      // Trend chart
      const trendData = Analytics.responseTrend(responses, 'day');
      Charts.renderLineChart(trendCanvas, trendData, {
        title: 'Response Trend',
        color: '#C2553A',
        fillArea: true,
        smooth: true
      });

      // Satisfaction donut — first rating question
      const ratingQ = survey.questions.find(q => q.type === 'rating');
      if (ratingQ) {
        const dist = Analytics.questionDistribution(responses, ratingQ.id, ratingQ);
        const avg = Analytics.ratingAverage(responses, ratingQ.id);
        Charts.renderDonutChart(donutCanvas, dist, {
          title: 'Overall Satisfaction',
          centerValue: avg.toFixed(1),
          centerLabel: 'avg rating'
        });
      }
    });
  }

  function renderResponses() {
    const survey = State.getActiveSurvey();
    if (!survey) return;

    let responses = State.getFilteredResponses();
    responses = Analytics.sortResponses(responses, sortField, sortDir);

    // Table head
    const thead = document.getElementById('responsesTableHead');
    const columns = [
      { key: 'id', label: 'ID' },
      { key: 'submittedAt', label: 'Submitted' },
      { key: 'completionTime', label: 'Time (min)' },
      ...survey.questions.slice(0, 4).map(q => ({ key: q.id, label: q.text.substring(0, 30) + (q.text.length > 30 ? '…' : '') }))
    ];

    thead.innerHTML = columns.map(col =>
      `<th data-sort="${col.key}" title="${col.label}">${col.label} ${sortField === col.key ? (sortDir === 'asc' ? '↑' : '↓') : ''}</th>`
    ).join('');

    // Bind sort
    thead.querySelectorAll('th').forEach(th => {
      th.addEventListener('click', () => {
        const field = th.dataset.sort;
        if (sortField === field) {
          sortDir = sortDir === 'asc' ? 'desc' : 'asc';
        } else {
          sortField = field;
          sortDir = 'desc';
        }
        renderResponses();
      });
    });

    // Paginate
    const totalPages = Math.ceil(responses.length / PAGE_SIZE);
    const pageResponses = responses.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);

    // Table body
    const tbody = document.getElementById('responsesTableBody');
    tbody.innerHTML = pageResponses.map(r => {
      const cells = [
        r.id,
        new Date(r.submittedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
        r.completionTime || '—'
      ];
      survey.questions.slice(0, 4).forEach(q => {
        const ans = r.answers && r.answers[q.id];
        if (Array.isArray(ans)) cells.push(ans.join(', '));
        else if (ans != null) cells.push(String(ans));
        else cells.push('—');
      });

      return `<tr>${cells.map(c => `<td title="${c}">${c}</td>`).join('')}</tr>`;
    }).join('');

    // Pagination
    document.getElementById('paginationInfo').textContent =
      responses.length > 0
        ? `${currentPage * PAGE_SIZE + 1}–${Math.min((currentPage + 1) * PAGE_SIZE, responses.length)} of ${responses.length}`
        : 'No responses';
    document.getElementById('prevPage').disabled = currentPage === 0;
    document.getElementById('nextPage').disabled = currentPage >= totalPages - 1;

    document.getElementById('prevPage').onclick = () => { currentPage--; renderResponses(); };
    document.getElementById('nextPage').onclick = () => { currentPage++; renderResponses(); };
  }

  function renderQuestions() {
    const survey = State.getActiveSurvey();
    if (!survey) return;
    const responses = State.getFilteredResponses();
    const container = document.getElementById('questionsContainer');
    container.innerHTML = '';

    survey.questions.forEach((q, i) => {
      const block = document.createElement('div');
      block.className = 'question-block';

      const dist = Analytics.questionDistribution(responses, q.id, q);

      if (q.type === 'free-text') {
        const texts = dist.filter(d => d.text && d.text.trim());
        block.innerHTML = `
          <div class="question-block__number">Question ${i + 1} · Free Text</div>
          <div class="question-block__text">${q.text}</div>
          <div class="question-block__stats">
            <span><span class="question-block__stat-value">${texts.length}</span> responses</span>
          </div>
          <ul class="free-text-list">
            ${texts.slice(0, 20).map(t => `<li>"${t.text}"</li>`).join('')}
          </ul>
        `;
        container.appendChild(block);
      } else {
        const avg = (q.type === 'rating' || q.type === 'nps') ? Analytics.ratingAverage(responses, q.id) : null;
        const total = dist.reduce((s, d) => s + d.count, 0);

        const canvasId = `qchart-${q.id}`;
        block.innerHTML = `
          <div class="question-block__number">Question ${i + 1} · ${q.type.replace('-', ' ')}</div>
          <div class="question-block__text">${q.text}</div>
          <div class="question-block__stats">
            <span><span class="question-block__stat-value">${total}</span> responses</span>
            ${avg !== null ? `<span>Avg: <span class="question-block__stat-value">${avg}</span></span>` : ''}
            ${q.type === 'nps' ? `<span>NPS: <span class="question-block__stat-value">${Analytics.calculateNPS(responses, q.id) >= 0 ? '+' : ''}${Analytics.calculateNPS(responses, q.id)}</span></span>` : ''}
          </div>
          <canvas id="${canvasId}"></canvas>
        `;

        container.appendChild(block);

        // Render chart after DOM insertion
        requestAnimationFrame(() => {
          const canvas = document.getElementById(canvasId);
          if (!canvas) return;
          if (q.type === 'single-choice' || q.type === 'multiple-choice') {
            Charts.renderBarChart(canvas, dist, { horizontal: true });
          } else {
            Charts.renderBarChart(canvas, dist, { horizontal: false });
          }
        });
      }
    });
  }

  function renderDemographics() {
    const responses = State.getFilteredResponses();
    const demographics = State.getDemographics();
    const container = document.getElementById('demographicsContainer');
    container.innerHTML = '';

    Object.entries(demographics).forEach(([key, seg]) => {
      const breakdown = Analytics.demographicBreakdown(responses, key);
      const chartContainer = document.createElement('div');
      chartContainer.className = 'chart-container';

      const canvasId = `demo-${key}`;
      chartContainer.innerHTML = `
        <div class="chart-container__title">${seg.label}</div>
        <canvas id="${canvasId}"></canvas>
      `;

      container.appendChild(chartContainer);

      requestAnimationFrame(() => {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;
        if (breakdown.length <= 5) {
          Charts.renderDonutChart(canvas, breakdown.map(b => ({ option: b.segment, count: b.count })), {
            centerValue: responses.length.toString(),
            centerLabel: 'total'
          });
        } else {
          Charts.renderBarChart(canvas, breakdown.map(b => ({ option: b.segment, count: b.count })), {
            horizontal: true
          });
        }
      });
    });
  }

  // --- PUBLIC ---
  return { init };
})();

// Boot
document.addEventListener('DOMContentLoaded', App.init);
