// State Management — Event Bus + Data Store
// Pub/sub pattern for reactive UI updates

const State = (() => {
  // --- Private State ---
  const listeners = {};
  let surveys = [];
  let responses = [];
  let demographics = {};
  let activeSurveyId = null;
  let activeView = 'overview';
  let filters = {
    dateRange: { start: null, end: null },
    demographic: { key: null, value: null },
    search: ''
  };

  // --- Event Bus ---
  function on(event, callback) {
    if (!listeners[event]) listeners[event] = [];
    listeners[event].push(callback);
  }

  function off(event, callback) {
    if (!listeners[event]) return;
    listeners[event] = listeners[event].filter(cb => cb !== callback);
  }

  function emit(event, data) {
    if (!listeners[event]) return;
    listeners[event].forEach(cb => cb(data));
  }

  // --- Data Loading ---
  async function loadAll() {
    try {
      const [surveyRes, responseRes, demoRes] = await Promise.all([
        fetch('data/surveys.json'),
        fetch('data/responses.json'),
        fetch('data/demographics.json')
      ]);
      const surveyData = await surveyRes.json();
      const responseData = await responseRes.json();
      const demoData = await demoRes.json();

      surveys = surveyData.surveys || [];
      responses = responseData.responses || [];
      demographics = demoData.segments || {};

      if (surveys.length > 0 && !activeSurveyId) {
        activeSurveyId = surveys[0].id;
      }

      emit('data-loaded', { surveys, responses, demographics });
    } catch (err) {
      console.error('Failed to load data:', err);
    }
  }

  // --- Getters ---
  function getSurveys() {
    return surveys;
  }

  function getActiveSurvey() {
    return surveys.find(s => s.id === activeSurveyId) || null;
  }

  function getActiveSurveyId() {
    return activeSurveyId;
  }

  function getDemographics() {
    return demographics;
  }

  function getActiveView() {
    return activeView;
  }

  function getFilters() {
    return { ...filters };
  }

  function getFilteredResponses() {
    let result = responses.filter(r => r.surveyId === activeSurveyId);

    // Date range filter
    if (filters.dateRange.start) {
      const start = new Date(filters.dateRange.start);
      result = result.filter(r => new Date(r.submittedAt) >= start);
    }
    if (filters.dateRange.end) {
      const end = new Date(filters.dateRange.end);
      end.setHours(23, 59, 59, 999);
      result = result.filter(r => new Date(r.submittedAt) <= end);
    }

    // Demographic filter
    if (filters.demographic.key && filters.demographic.value) {
      result = result.filter(r =>
        r.demographics &&
        r.demographics[filters.demographic.key] === filters.demographic.value
      );
    }

    // Search filter
    if (filters.search.trim()) {
      const q = filters.search.toLowerCase();
      result = result.filter(r => {
        // Search through free-text answers
        return Object.values(r.answers || {}).some(a => {
          if (typeof a === 'string') return a.toLowerCase().includes(q);
          if (Array.isArray(a)) return a.some(v => String(v).toLowerCase().includes(q));
          return false;
        });
      });
    }

    return result;
  }

  function getAllResponsesForSurvey(surveyId) {
    return responses.filter(r => r.surveyId === (surveyId || activeSurveyId));
  }

  // --- Setters ---
  function setActiveSurvey(id) {
    if (id === activeSurveyId) return;
    activeSurveyId = id;
    emit('survey-changed', { surveyId: id, survey: getActiveSurvey() });
  }

  function setActiveView(view) {
    if (view === activeView) return;
    activeView = view;
    emit('view-changed', { view });
  }

  function setFilter(key, value) {
    if (key === 'dateRange') {
      filters.dateRange = { ...filters.dateRange, ...value };
    } else if (key === 'demographic') {
      filters.demographic = { ...filters.demographic, ...value };
    } else if (key === 'search') {
      filters.search = value;
    }
    emit('filters-changed', { filters: getFilters() });
  }

  function clearFilters() {
    filters = {
      dateRange: { start: null, end: null },
      demographic: { key: null, value: null },
      search: ''
    };
    emit('filters-changed', { filters: getFilters() });
  }

  // --- Public API ---
  return {
    on,
    off,
    emit,
    loadAll,
    getSurveys,
    getActiveSurvey,
    getActiveSurveyId,
    getDemographics,
    getActiveView,
    getFilters,
    getFilteredResponses,
    getAllResponsesForSurvey,
    setActiveSurvey,
    setActiveView,
    setFilter,
    clearFilters
  };
})();
