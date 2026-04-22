// Export Module — CSV, JSON, PDF, PNG
// All export functions work client-side with no backend.

const ExportModule = (() => {

  function downloadFile(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function exportCSV(responses, survey, filename = 'survey-export.csv') {
    if (!responses || responses.length === 0 || !survey) return;

    const questions = survey.questions || [];
    
    // Build header row
    const headers = [
      'Response ID',
      'Submitted At',
      'Completion Time (min)',
      'Completed',
      ...Object.keys(responses[0]?.demographics || {}).map(k => `Demo: ${k}`),
      ...questions.map(q => q.text)
    ];

    // Build data rows
    const rows = responses.map(r => {
      const demoValues = Object.values(r.demographics || {});
      const answerValues = questions.map(q => {
        const ans = r.answers && r.answers[q.id];
        if (Array.isArray(ans)) return ans.join('; ');
        if (ans == null) return '';
        return String(ans);
      });

      return [
        r.id,
        r.submittedAt,
        r.completionTime || '',
        r.completed ? 'Yes' : 'No',
        ...demoValues,
        ...answerValues
      ];
    });

    // Escape CSV values
    const escapeCSV = val => {
      const str = String(val);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return '"' + str.replace(/"/g, '""') + '"';
      }
      return str;
    };

    const csvContent = [
      headers.map(escapeCSV).join(','),
      ...rows.map(row => row.map(escapeCSV).join(','))
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    downloadFile(blob, filename);
  }

  function exportJSON(responses, survey, filename = 'survey-export.json') {
    if (!responses || responses.length === 0) return;

    const exportData = {
      survey: {
        id: survey.id,
        title: survey.title,
        description: survey.description,
        questions: survey.questions
      },
      exportDate: new Date().toISOString(),
      totalResponses: responses.length,
      responses: responses.map(r => ({
        id: r.id,
        submittedAt: r.submittedAt,
        completionTime: r.completionTime,
        completed: r.completed,
        demographics: r.demographics,
        answers: r.answers
      }))
    };

    const jsonString = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    downloadFile(blob, filename);
  }

  function exportPDF() {
    window.print();
  }

  function exportChartPNG(canvas, filename = 'chart.png') {
    if (!canvas) return;
    Charts.chartToPNG(canvas, filename);
  }

  return {
    exportCSV,
    exportJSON,
    exportPDF,
    exportChartPNG,
    downloadFile
  };
})();
