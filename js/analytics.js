// Analytics Engine — Pure Calculation Functions
// All functions take data as input and return computed results. No side effects.

const Analytics = (() => {

  function countResponses(responses) {
    return responses.length;
  }

  function completionRate(responses) {
    if (responses.length === 0) return 0;
    const completed = responses.filter(r => r.completed).length;
    return Math.round((completed / responses.length) * 100);
  }

  function avgCompletionTime(responses) {
    const times = responses.filter(r => r.completionTime > 0).map(r => r.completionTime);
    if (times.length === 0) return 0;
    const avg = times.reduce((s, t) => s + t, 0) / times.length;
    return Math.round(avg * 10) / 10; // 1 decimal place, in minutes
  }

  function calculateNPS(responses, questionId) {
    const scores = responses
      .map(r => r.answers && r.answers[questionId])
      .filter(v => typeof v === 'number' && v >= 0 && v <= 10);

    if (scores.length === 0) return 0;

    const promoters = scores.filter(s => s >= 9).length;
    const detractors = scores.filter(s => s <= 6).length;
    return Math.round(((promoters - detractors) / scores.length) * 100);
  }

  function responseTrend(responses, interval = 'day') {
    if (responses.length === 0) return [];

    const grouped = {};
    responses.forEach(r => {
      const d = new Date(r.submittedAt);
      let key;
      if (interval === 'week') {
        const weekStart = new Date(d);
        weekStart.setDate(d.getDate() - d.getDay());
        key = weekStart.toISOString().split('T')[0];
      } else {
        key = d.toISOString().split('T')[0];
      }
      grouped[key] = (grouped[key] || 0) + 1;
    });

    // Fill gaps in date range
    const dates = Object.keys(grouped).sort();
    if (dates.length === 0) return [];

    const result = [];
    const start = new Date(dates[0]);
    const end = new Date(dates[dates.length - 1]);
    const step = interval === 'week' ? 7 : 1;

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + step)) {
      const key = d.toISOString().split('T')[0];
      result.push({ date: key, count: grouped[key] || 0 });
    }

    return result;
  }

  function questionDistribution(responses, questionId, question) {
    if (!question) return [];

    if (question.type === 'rating' || question.type === 'nps') {
      return ratingDistribution(responses, questionId, question);
    }

    if (question.type === 'single-choice') {
      return choiceDistribution(responses, questionId, question.options);
    }

    if (question.type === 'multiple-choice') {
      return multiChoiceDistribution(responses, questionId, question.options);
    }

    if (question.type === 'free-text') {
      return freeTextSummary(responses, questionId);
    }

    return [];
  }

  function ratingDistribution(responses, questionId, question) {
    const min = question.scale.min;
    const max = question.scale.max;
    const labels = question.scale.labels || [];
    const counts = {};

    for (let i = min; i <= max; i++) {
      counts[i] = 0;
    }

    responses.forEach(r => {
      const val = r.answers && r.answers[questionId];
      if (typeof val === 'number' && val >= min && val <= max) {
        counts[val]++;
      }
    });

    const total = responses.filter(r => r.answers && r.answers[questionId] != null).length;

    return Object.entries(counts).map(([value, count]) => ({
      option: labels[value - min] || `${value}`,
      value: parseInt(value),
      count,
      pct: total > 0 ? Math.round((count / total) * 100) : 0
    }));
  }

  function choiceDistribution(responses, questionId, options) {
    const counts = {};
    (options || []).forEach(o => { counts[o] = 0; });

    responses.forEach(r => {
      const val = r.answers && r.answers[questionId];
      if (val && counts.hasOwnProperty(val)) {
        counts[val]++;
      }
    });

    const total = responses.filter(r => r.answers && r.answers[questionId]).length;

    return Object.entries(counts).map(([option, count]) => ({
      option,
      count,
      pct: total > 0 ? Math.round((count / total) * 100) : 0
    }));
  }

  function multiChoiceDistribution(responses, questionId, options) {
    const counts = {};
    (options || []).forEach(o => { counts[o] = 0; });

    responses.forEach(r => {
      const val = r.answers && r.answers[questionId];
      if (Array.isArray(val)) {
        val.forEach(v => {
          if (counts.hasOwnProperty(v)) counts[v]++;
        });
      }
    });

    const total = responses.filter(r => r.answers && Array.isArray(r.answers[questionId])).length;

    return Object.entries(counts)
      .map(([option, count]) => ({
        option,
        count,
        pct: total > 0 ? Math.round((count / total) * 100) : 0
      }))
      .sort((a, b) => b.count - a.count);
  }

  function freeTextSummary(responses, questionId) {
    const texts = responses
      .map(r => r.answers && r.answers[questionId])
      .filter(t => typeof t === 'string' && t.trim().length > 0);

    return texts.map(t => ({ text: t }));
  }

  function ratingAverage(responses, questionId) {
    const values = responses
      .map(r => r.answers && r.answers[questionId])
      .filter(v => typeof v === 'number');

    if (values.length === 0) return 0;
    const avg = values.reduce((s, v) => s + v, 0) / values.length;
    return Math.round(avg * 10) / 10;
  }

  function crossTabulate(responses, questionId, segmentKey) {
    const segments = {};

    responses.forEach(r => {
      const segVal = r.demographics && r.demographics[segmentKey];
      const answer = r.answers && r.answers[questionId];
      if (!segVal || answer == null) return;

      if (!segments[segVal]) segments[segVal] = [];
      segments[segVal].push(answer);
    });

    return Object.entries(segments).map(([segment, values]) => {
      const numericValues = values.filter(v => typeof v === 'number');
      return {
        segment,
        count: values.length,
        avg: numericValues.length > 0
          ? Math.round((numericValues.reduce((s, v) => s + v, 0) / numericValues.length) * 10) / 10
          : null
      };
    }).sort((a, b) => b.count - a.count);
  }

  function demographicBreakdown(responses, segmentKey) {
    const counts = {};

    responses.forEach(r => {
      const val = r.demographics && r.demographics[segmentKey];
      if (val) {
        counts[val] = (counts[val] || 0) + 1;
      }
    });

    const total = responses.filter(r => r.demographics && r.demographics[segmentKey]).length;

    return Object.entries(counts)
      .map(([segment, count]) => ({
        segment,
        count,
        pct: total > 0 ? Math.round((count / total) * 100) : 0
      }))
      .sort((a, b) => b.count - a.count);
  }

  function searchResponses(responses, query) {
    if (!query || !query.trim()) return responses;
    const q = query.toLowerCase();

    return responses.filter(r => {
      return Object.values(r.answers || {}).some(a => {
        if (typeof a === 'string') return a.toLowerCase().includes(q);
        if (Array.isArray(a)) return a.some(v => String(v).toLowerCase().includes(q));
        return false;
      });
    });
  }

  function sortResponses(responses, field, dir = 'desc') {
    const sorted = [...responses];
    sorted.sort((a, b) => {
      let va, vb;
      if (field === 'submittedAt') {
        va = new Date(a.submittedAt).getTime();
        vb = new Date(b.submittedAt).getTime();
      } else if (field === 'completionTime') {
        va = a.completionTime || 0;
        vb = b.completionTime || 0;
      } else {
        va = a[field];
        vb = b[field];
      }

      if (va < vb) return dir === 'asc' ? -1 : 1;
      if (va > vb) return dir === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }

  // --- Public API ---
  return {
    countResponses,
    completionRate,
    avgCompletionTime,
    calculateNPS,
    responseTrend,
    questionDistribution,
    ratingAverage,
    crossTabulate,
    demographicBreakdown,
    searchResponses,
    sortResponses
  };
})();
