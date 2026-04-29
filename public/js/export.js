/* Export de données (CSV, JSON) */

const dataExport = {
  exportLogs(format = 'csv') {
    if (!state.logs) {
      toast('Aucun log à exporter', 'error');
      return;
    }

    const logs = state.logs.map(l => ({
      timestamp: l.ts ? new Date(l.ts).toISOString() : l.time,
      type: l.dir || l.type,
      message: l.msg
    }));

    if (format === 'csv') {
      this.downloadCSV(logs, 'brainexe-logs.csv', ['timestamp', 'type', 'message']);
    } else {
      this.downloadJSON(logs, 'brainexe-logs.json');
    }
  },

  exportConfig() {
    if (!state.config) {
      toast('Pas de config à exporter', 'error');
      return;
    }
    this.downloadJSON(state.botConfig, 'brainexe-config.json');
  },

  downloadCSV(data, filename, headers) {
    let csv = headers.join(',') + '\n';
    data.forEach(row => {
      csv += headers.map(h => {
        const val = row[h] || '';
        return `"${String(val).replace(/"/g, '""')}"`;
      }).join(',') + '\n';
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    this.downloadBlob(blob, filename);
  },

  downloadJSON(data, filename) {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    this.downloadBlob(blob, filename);
  },

  downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast(`${filename} téléchargé`, 'success');
  }
};
